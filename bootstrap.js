/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/SharedPreferences.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "LightweightThemeManager",
  "resource://gre/modules/LightweightThemeManager.jsm");

XPCOMUtils.defineLazyGetter(this, "CrashReporter", function() {
  try {
    return Cc["@mozilla.org/xre/app-info;1"].getService(Ci["nsICrashReporter"]);
  } catch (e) {
    // Fennec may not be built with the crash reporter, so just return an empty
    // object instead of throwing an exception.
    return {};
  }
});

XPCOMUtils.defineLazyGetter(this, "JNI", function() {
  // Check to see if the public domain JNI.jsm is available in the tree (Firefox 34+).
  let scope = {};
  Cu.import("resource://gre/modules/JNI.jsm", scope);
  if (scope.JNI.GetForThread) {
    return scope.JNI;
  }

  // Othwerwise, fall back to import our own.
  Cu.import("chrome://privacycoach/content/JNI.jsm", scope);
  return scope.JNI;
});

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
});

// Prefix for prefs to store original user prefs.
let PREF_PREFIX = "extensions.privacycoach.";

// JSON array of search engines that we won't warn about.
let PREF_DONT_WARN_ENGINES = "extensions.privacycoach.dontWarnEngines";

// Prefs that the add-on sets.
let PREFS = [
  {
    type: "bool",
    key: "privacy.donottrackheader.enabled",
    value: true
  },
  {
    type: "int",
    key: "privacy.donottrackheader.value",
    value: 1 // "Do not track me."" This will be deprecated in Fx35 with bug 1042135.
  },
  {
    type: "int",
    key: "network.cookie.cookieBehavior",
    value: 1 // "Enabled, excluding 3rd party"
  },
  {
    type: "bool",
    key: "toolkit.telemetry.enabled",
    value: false
  },
  {
    key: "datareporting.crashreporter.submitEnabled",
    value: false
  },
  {
    type: "sp-bool",
    key: "android.not_a_preference.healthreport.uploadEnabled",
    value: false
  },
  {
    type: "sp-bool",
    key: "android.not_a_preference.app.geo.reportdata",
    value: false
  }
];

let THEME = {
  id: "540624",
  name: "13fox",
  author: "Anthony Lam",
  version: "1.0",
  headerURL: "https://addons.cdn.mozilla.net/user-media/addons/540624/header.png?1411165085",
  footerURL: "https://addons.cdn.mozilla.net/user-media/addons/540624/footer.png?1411165085",
  iconURL: "https://addons.cdn.mozilla.net/user-media/addons/540624/icon.png?1411165085",
  previewURL: "https://addons.cdn.mozilla.net/user-media/addons/540624/preview.png?1411165085",
  detailURL: "https://addons.mozilla.org/en-US/addon/13fox/",
  updateURL: "https://versioncheck.addons.mozilla.org/en-US/themes/update-check/540624",
  textcolor: "#FFFFFF",
  accentcolor: "#363B40"
};

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

// Stores a reference to the original BrowserApp.observe function.
let originalObserve;

// Stored a reference to the original SearchEngines.addOpenSearchEngine.
let originalAddOpenSearchEngine;

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
    let shouldContinue = true;

    if (!engine.url.startsWith("https://")) {
      let title = Strings.GetStringFromName("prompt.title");
      let message = Strings.formatStringFromName("httpsWarning.message", [engine.title], 1);
      shouldContinue = Services.prompt.confirm(window, title, message);
    }

    if (shouldContinue) {
      originalAddOpenSearchEngine.call(window.SearchEngines, engine);
    }
  }
}

function unloadFromWindow(window) {
  window.BrowserApp.observe = originalObserve;
  window.SearchEngines.addOpenSearchEngine = originalAddOpenSearchEngine;
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

/**
 * Uses JNI to broadcast changes to data reporting preferences.
 *
 * GeckoPreferences.broadcastHealthReportUploadPref(context);
 * GeckoPreferences.broadcastStumblerPref(context);
 */
function broadcastSharedPrefs() {
  let v = Services.appinfo.version;
  let version = parseInt(v.substring(0, v.indexOf(".")))

  let jenv;
  try {
    jenv = JNI.GetForThread();
    let geckoAppShell = JNI.LoadClass(jenv, "org.mozilla.gecko.GeckoAppShell", {
      static_methods: [
        { name: "getContext", sig: "()Landroid/content/Context;" },
      ],
    });

    let context = geckoAppShell.getContext();

    // The stumbler pref was only added in Fx35.
    if (version >= 35) {
      let geckoPreferences = JNI.LoadClass(jenv, "org.mozilla.gecko.preferences.GeckoPreferences", {
        static_methods: [
          { name: "broadcastHealthReportUploadPref", sig: "(Landroid/content/Context;)V" },
          { name: "broadcastStumblerPref", sig: "(Landroid/content/Context;)V" },
        ],
      });
      geckoPreferences.broadcastHealthReportUploadPref(context);
      geckoPreferences.broadcastStumblerPref(context);
    } else {
      let geckoPreferences = JNI.LoadClass(jenv, "org.mozilla.gecko.preferences.GeckoPreferences", {
        static_methods: [
          { name: "broadcastHealthReportUploadPref", sig: "(Landroid/content/Context;)V" },
        ],
      });
      geckoPreferences.broadcastHealthReportUploadPref(context);
    }

  } catch (e) {
    Cu.reportError("Exception broadcasting shared pref change: " + e);
  } finally {
    if (jenv) {
      JNI.UnloadClasses(jenv);
    }
  }
}

function startup(data, reason) {
  if (reason == ADDON_INSTALL || reason == ADDON_ENABLE) {
    // Store the original pref values so that we can restore them when the add-on
    // is uninstalled or disabled.
    for (let pref of PREFS) {
      if (pref.key == "datareporting.crashreporter.submitEnabled") {
        // Crash reporter submit pref must be fetched from nsICrashReporter service.
        Services.prefs.setBoolPref(PREF_PREFIX + pref.key, CrashReporter.submitReports);
        CrashReporter.submitReports = pref.value;
      } else if (pref.type == "bool") {
        Services.prefs.setBoolPref(PREF_PREFIX + pref.key, Services.prefs.getBoolPref(pref.key));
        Services.prefs.setBoolPref(pref.key, pref.value);
      } else if (pref.type == "int") {
        Services.prefs.setIntPref(PREF_PREFIX + pref.key, Services.prefs.getIntPref(pref.key));
        Services.prefs.setIntPref(pref.key, pref.value);
      } else if (pref.type == "sp-bool") {
        Services.prefs.setBoolPref(PREF_PREFIX + pref.key, SharedPreferences.forApp().getBoolPref(pref.key));
        SharedPreferences.forApp().setBoolPref(pref.key, pref.value);
      } else {
        Cu.reportError("Privacy Coach: Can't set unknown pref type: " + JSON.stringify(pref));
      }
    }

    LightweightThemeManager.currentTheme = THEME;
    broadcastSharedPrefs();
  }

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
  if (reason == ADDON_UNINSTALL || reason == ADDON_DISABLE) {
    // Restore the original pref values.
    for (let pref of PREFS) {
      if (pref.key == "datareporting.crashreporter.submitEnabled") {
        // Crash reporter submit pref must be fetched from nsICrashReporter service.
        CrashReporter.submitReports = Services.prefs.getBoolPref(PREF_PREFIX + pref.key);
      } else if (pref.type == "bool") {
        Services.prefs.setBoolPref(pref.key, Services.prefs.getBoolPref(PREF_PREFIX + pref.key));
      } else if (pref.type == "int") {
        Services.prefs.setIntPref(pref.key, Services.prefs.getIntPref(PREF_PREFIX + pref.key));
      } else if (pref.type == "sp-bool") {
        SharedPreferences.forApp().setBoolPref(pref.key, Services.prefs.getBoolPref(PREF_PREFIX + pref.key));
      } else {
        Cu.reportError("Privacy Coach: Can't reset unknown pref type: " + JSON.stringify(pref));
      }

      // Clear the pref that we set for restore purposes.
      Services.prefs.clearUserPref(PREF_PREFIX + pref.key);
      Services.prefs.clearUserPref(PREF_DONT_WARN_ENGINES);
    }

    LightweightThemeManager.forgetUsedTheme(THEME.id);
    broadcastSharedPrefs();
  }

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
