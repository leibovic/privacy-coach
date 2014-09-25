const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "CrashReporter", function() {
  try {
    return Cc["@mozilla.org/xre/app-info;1"].getService(Ci["nsICrashReporter"]);
  } catch (e) {
    // Fennec may not be built with the crash reporter, so just return an empty
    // object instead of throwing an exception.
    return {};
  }
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
  }
];

// An example of how to create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
});

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
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
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
      } else {
        Cu.reportError("Privacy Coach: Can't set unknown pref type: " + JSON.stringify(pref));
      }
    }
  }

  // Load UI features into the main window.
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }
  Services.wm.addListener(windowListener);
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
      } else {
        Cu.reportError("Privacy Coach: Can't reset unknown pref type: " + JSON.stringify(pref));
      }

      // Clear the pref that we set for restore purposes.
      Services.prefs.clearUserPref(PREF_PREFIX + pref.key)
    }
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
