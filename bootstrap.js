/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Home.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const WHISTLE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NTc3MiwgMjAxNC8wMS8xMy0xOTo0NDowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyZmYxZTQ0OC02Njc1LTRmNDEtYjNlNS1mMzFlZTE1MzMwYzgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MEQ5ODE1MkY0QzQ5MTFFNEJDQThDOEJBQUJGREIxNUYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MEQ5ODE1MkU0QzQ5MTFFNEJDQThDOEJBQUJGREIxNUYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo2YTljN2E3Ni02Nzg3LTRhYTItOTYyYi1lYTI5NjZhYjFlYjkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MmZmMWU0NDgtNjY3NS00ZjQxLWIzZTUtZjMxZWUxNTMzMGM4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";

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
