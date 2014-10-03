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

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
});

// Prefix for prefs to store original user prefs.
var PREF_PREFIX = "extensions.privacycoach.";

// Prefs that the add-on sets.
var PREFS = [
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
    key: "android.not_a_pref.app.geo.reportdata",
    value: false
  }
];

function getTheme() {
  return {
    id: "privacycoach",
    name: Strings.GetStringFromName("lwt.name"),
    description: Strings.GetStringFromName("lwt.description"),
    homepageURL: "https://addons.mozilla.org/firefox/addon/space-fantasy/",
    headerURL: "chrome://privacycoach/content/header.jpg",
    footerURL: "chrome://privacycoach/content/footer.jpg",
    textcolor: "#ffffff",
    accentcolor: "#d9d9d9",
    iconURL: "chrome://privacycoach/content/icon.jpg",
    previewURL: "chrome://privacycoach/content/preview.jpg",
    author: "fx5800p",
    version: "1.0"
  };
}

function loadIntoWindow(window) {
}

function unloadFromWindow(window) {
}

/**
 * bootstrap.js API
 */
var windowListener = {
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

    LightweightThemeManager.currentTheme = getTheme();
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
      Services.prefs.clearUserPref(PREF_PREFIX + pref.key)
    }

    LightweightThemeManager.currentTheme = LightweightThemeManager.usedThemes[1];
  }

  // Unload UI features from the main window.
  Services.wm.removeListener(windowListener);
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
