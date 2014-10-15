/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const WHISTLE_ICON = "data:image/png;base64,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";

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
});

let gBannerId;
let gMenuId;

let gBannerMessages = [
  {
    text: "Learn the different ways you can clear personal data stored in Firefox.",
    url: "https://support.mozilla.org/kb/clear-your-browsing-history-and-other-personal-dat"
  },
  {
    text: "Learn how to create secure, easy-to-remember passwords to keep your identity safe on the internet.",
    url: "https://support.mozilla.org/kb/create-secure-passwords-keep-your-identity-safe"
  },
  {
    text: "Learn how Firefox Health Report lets you know how well your browser is performing and what steps you can take to improve it.",
    url: "https://support.mozilla.org/kb/firefox-health-report-understand-your-android-browser-perf"
  },
  {
    text: "Learn how Firefox for Android automatically blocks insecure or mixed content from secure web pages.",
    url: "https://support.mozilla.org/kb/how-does-insecure-content-affect-safety-android"
  },
  {
    text: "Learn how to create a Guest Session to let someone else use Firefox without giving them access to your personal information.",
    url: "https://support.mozilla.org/kb/share-your-android-device-firefox-guest-session"
  },
  {
    text: "Learn how to create private tabs to browse the internet without saving any information about what pages you've visited.",
    url: "https://support.mozilla.org/kb/mobile-private-browsing-browse-web-without-saving-syncing-info"
  }
];

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

  // Add menu item to get back to welcome page.
  gMenuId = window.NativeWindow.menu.add({
    name: "Privacy Coach",
    parent: window.NativeWindow.menu.toolsMenuID,
    callback: () => window.BrowserApp.addTab("chrome://privacycoach/content/welcome.xhtml")
  });
}

function unloadFromWindow(window) {
  window.BrowserApp.observe = originalObserve;
  window.SearchEngines.addOpenSearchEngine = originalAddOpenSearchEngine;
  window.SearchEngines.addEngine = originalAddEngine;

  // Remove menu item to get back to welcome page.
  window.NativeWindow.menu.remove(gMenuId);
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

  // Add a random tip to the home banner.
  let message = gBannerMessages[Math.floor(Math.random() * gBannerMessages.length)];
  gBannerId = Home.banner.add({
    text: message.text,
    icon: WHISTLE_ICON,
    onclick: function() {
      let window = Services.wm.getMostRecentWindow("navigator:browser");
      let parentId = window.BrowserApp.selectedTab.id;
      window.BrowserApp.addTab(message.url, { parentId: parentId });
    },
    ondismiss: function() {
      Home.banner.remove(gBannerId);
    }
  });
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

  Home.banner.remove(gBannerId);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
