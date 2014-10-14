/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");


XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
});

// JSON array of search engines that we won't warn about.
let PREF_DONT_WARN_ENGINES = "extensions.privacycoach.dontWarnEngines";

/**
 * Observes "browser-search-engine-modified" notification.
 */
function observeSearchEngineModified(subject, topic, data) {
  if (data == "engine-default") {
    let engine = subject.QueryInterface(Ci.nsISearchEngine);
    let submission = engine.getSubmission("");
    if (submission.uri.scheme !== "https") {
      let window = Services.wm.getMostRecentWindow("navigator:browser");
      let message = Strings.formatStringFromName("defaultWarning.message", [engine.name], 1);
      window.NativeWindow.toast.show(message, "long");
    }
  }
}

/**
 * Prompt the user before performing non-https searches.
 * @param window
 * @param name Search engine name.
 *
 * @return Whether or not we should perform the serach.
 */
function confirmSearch(window, name) {
  let dontWarnEngines;
  try {
    dontWarnEngines = JSON.parse(Services.prefs.getCharPref(PREF_DONT_WARN_ENGINES));
  } catch(e) {
    dontWarnEngines = [];
  }

  if (dontWarnEngines.indexOf(name) != -1) {
    return true;
  }

  let engine = Services.search.getEngineByName(name);
  if (!engine) {
    return true;
  }

  let submission = engine.getSubmission("");
  if (submission.uri.scheme === "https") {
    return true;
  }

  let title = Strings.GetStringFromName("prompt.title");
  let message = Strings.formatStringFromName("httpsWarning.message", [name], 1);
  let dontAsk = Strings.formatStringFromName("httpsWarning.dontAsk", [name], 1);
  let checkState = { value: false };
  let shouldContinue = Services.prompt.confirmCheck(window, title, message, dontAsk, checkState);

  // Set a pref if the user doesn't want to be asked again.
  if (shouldContinue && checkState.value) {
    dontWarnEngines.push(name);
    Services.prefs.setCharPref(PREF_DONT_WARN_ENGINES, JSON.stringify(dontWarnEngines));
  }

  return shouldContinue;
}

/**
 * Prompt the user before adding a non-https search engine.
 * @param window
 * @param url The URL for the new search engine.
 * @param name Search engine name.
 *
 * @return Whether or not we should add the engine.
 */
function confirmAddSearchEngine(window, url, name) {
  if (url.startsWith("https://")) {
    return true;
  }

  let title = Strings.GetStringFromName("prompt.title");
  let message = Strings.formatStringFromName("addEngineWarning.message", [name], 1);
  return Services.prompt.confirm(window, title, message);
}

// Stores a reference to the original BrowserApp.observe function.
let originalObserve;

// Stores a reference to the original SearchEngines.addOpenSearchEngine.
// Triggered through the Page -> Add a Search Engine item.
let originalAddOpenSearchEngine;

// Stores a reference to the original SearchEngines.originalAddEngine.
// Triggered through the text selection action bar icon.
let originalAddEngine;

// Monkey-patching madness.
function loadIntoWindow(window) {
  originalObserve = window.BrowserApp.observe;
  window.BrowserApp.observe = function(subject, topic, data) {
    let shouldContinue = true;

    if (topic === "Tab:Load") {
      let d = JSON.parse(data);
      if (d.engine) {
        shouldContinue = confirmSearch(window, d.engine);
      }
    }

    // Then call the original function.
    if (shouldContinue) {
      originalObserve.call(window.BrowserApp, subject, topic, data);
    }
  }

  originalAddOpenSearchEngine = window.SearchEngines.addOpenSearchEngine;
  window.SearchEngines.addOpenSearchEngine = function(engine) {
    if (confirmAddSearchEngine(window, engine.url, engine.title)) {
      originalAddOpenSearchEngine.call(window.SearchEngines, engine);
    }
  }

  originalAddEngine = window.SearchEngines.addEngine;
  window.SearchEngines.addEngine = function(element) {
    let form = element.form;
    let charset = element.ownerDocument.characterSet;
    let docURI = Services.io.newURI(element.ownerDocument.URL, charset, null);
    let formURL = Services.io.newURI(form.getAttribute("action"), charset, docURI).spec;
    let name = element.ownerDocument.title || docURI.host;

    if (confirmAddSearchEngine(window, formURL, name)) {
      originalAddEngine.call(window.SearchEngines, element);
    }
  }
}

function unloadFromWindow(window) {
  window.BrowserApp.observe = originalObserve;
  window.SearchEngines.addOpenSearchEngine = originalAddOpenSearchEngine;
  window.SearchEngines.addEngine = originalAddEngine;
}

/**
 * bootstrap.js API
 */
let windowListener = {
  onOpenWindow: function(window) {
    // Wait for the window to finish loading
    let domWindow = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(window) {
  },
  
  onWindowTitleChange: function(window, title) {
  }
};


function startup(data, reason) {
  // Load UI features into the main window.
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }
  Services.wm.addListener(windowListener);

  // Open a welcome page on install.
  if (reason == ADDON_INSTALL) {
    let BrowserApp = Services.wm.getMostRecentWindow("navigator:browser").BrowserApp;
    BrowserApp.addTab("chrome://privacycoach/content/welcome.xhtml");
  }

  Services.obs.addObserver(observeSearchEngineModified, "browser-search-engine-modified", false);
}

function shutdown(data, reason) {
  // Unload UI features from the main window.
  Services.wm.removeListener(windowListener);
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }

  Services.obs.removeObserver(observeSearchEngineModified, "browser-search-engine-modified");
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
