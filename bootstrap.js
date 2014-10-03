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
    key: "android.not_a_preference.app.geo.reportdata",
    value: false
  }
];

var THEME = {
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

    LightweightThemeManager.currentTheme = THEME;
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

    LightweightThemeManager.forgetUsedTheme(THEME.id);
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
