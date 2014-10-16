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

XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://privacycoach/locale/privacycoach.properties");
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

let gPrefs = {
  dnt: {
    get value() {
      let enableDNT = Services.prefs.getBoolPref("privacy.donottrackheader.enabled");
      if (!enableDNT) {
        return Strings.GetStringFromName("prefs.dnt.noPref");
      }
      let dntState = Services.prefs.getIntPref("privacy.donottrackheader.value");
      if (dntState === 0) {
        return Strings.GetStringFromName("prefs.dnt.allowTracking");
      }
      return Strings.GetStringFromName("prefs.dnt.disallowTracking");
    }
  },
  cookies: {
    get value() {
      let val = Services.prefs.getIntPref("network.cookie.cookieBehavior");
      if (val == 0) {
        return Strings.GetStringFromName("prefs.enabled");
      }
      if (val == 1) {
        return Strings.GetStringFromName("prefs.cookies.firstPartyOnly");
      }
      return Strings.GetStringFromName("prefs.disabled");
    }
  },
  fhr: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.healthreport.uploadEnabled");
      let stringName = val ? "prefs.enabled" : "prefs.disabled";
      return Strings.GetStringFromName(stringName);
    }
  },
  telemetry: {
    get value() {
      let val = Services.prefs.getBoolPref("toolkit.telemetry.enabled");
      let stringName = val ? "prefs.enabled" : "prefs.disabled";
      return Strings.GetStringFromName(stringName);
    }
  },
  crash: {
    get value() {
      let val = CrashReporter.submitReports;
      let stringName = val ? "prefs.enabled" : "prefs.disabled";
      return Strings.GetStringFromName(stringName);
    }
  },
  mls: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.app.geo.reportdata");
      let stringName = val ? "prefs.enabled" : "prefs.disabled";
      return Strings.GetStringFromName(stringName);
    }
  }
};

function refreshPrefValues() {
  let divs = document.querySelectorAll(".pref-value");
  Array.prototype.forEach.call(divs, function(div) {
    let value = gPrefs[div.getAttribute("pref")].value;
    div.textContent = Strings.formatStringFromName("prefs.currentValue", [value], 1);
  });
}

function refreshSearchMessage() {
  Services.search.init(() => {
    let searchMessage = document.getElementById("search-audit");
    let engine = Services.search.defaultEngine;

    if (engine.getSubmission("").uri.scheme === "https") {
      searchMessage.classList.remove("warn");
      searchMessage.textContent = Strings.formatStringFromName("search.https", [engine.name], 1);
    } else {
      searchMessage.classList.add("warn");
      searchMessage.textContent = Strings.formatStringFromName("search.http", [engine.name], 1);
    }
  });
}

function initButtons() {
  let buttons = document.querySelectorAll(".settings-button");
  for (let i = 0; i < buttons.length; i++) {
    let button = buttons[i];
    let page = button.getAttribute("page");
    button.addEventListener("click", () => openPrefPage(page), false);
  }
}

/**
 * Uses JNI to open settings.
 */
function openPrefPage(page) {

  let jenv;
  try {
    jenv = JNI.GetForThread();

    let GeckoAppShell = JNI.LoadClass(jenv, "org.mozilla.gecko.GeckoAppShell", {
      static_methods: [
        { name: "getContext", sig: "()Landroid/content/Context;" },
      ],
    });
    let Intent = JNI.LoadClass(jenv, "android.content.Intent", {
      constructors: [
        { name: "<init>", sig: "(Landroid/content/Context;Ljava/lang/Class;)V" },
      ],
    });
    let GeckoPreferences = JNI.LoadClass(jenv, "org.mozilla.gecko.preferences.GeckoPreferences", {
      static_methods: [
        { name: "setResourceToOpen", sig: "(Landroid/content/Intent;Ljava/lang/String;)V" },
      ],
    });
    let Context = JNI.LoadClass(jenv, "android.content.Context", {
      methods: [
        { name: "startActivity", sig: "(Landroid/content/Intent;)V" },
      ],
    });

    let context = GeckoAppShell.getContext();
    let intent = Intent["new"](context, GeckoPreferences);
    GeckoPreferences.setResourceToOpen(intent, page);
    context.startActivity(intent);

  } finally {
    if (jenv) {
      JNI.UnloadClasses(jenv);
    }
  }
}

let PrefObserver = {
  _sharedPrefs: [
    "android.not_a_preference.healthreport.uploadEnabled",
    "android.not_a_preference.app.geo.reportdata",
    "datareporting.crashreporter.submitEnabled"
  ],

  init: function() {
    // Lazy. Just listen to changes to any prefs.
    Services.prefs.addObserver("", this, false);

    this._sharedPrefs.forEach((pref) => {
      SharedPreferences.forApp().addObserver(pref, this);
    });
  },

  uninit: function() {
    Services.prefs.removeObserver("", this);

    this._sharedPrefs.forEach((pref) => {
      SharedPreferences.forApp().removeObserver(pref, this);
    });
  },

  observe: function(s, t, d) {
    // Lazy. Just refresh all the pref values.
    refreshPrefValues();
    refreshSearchMessage();
  }
};

document.addEventListener("DOMContentLoaded", function() {
  refreshPrefValues();
  refreshSearchMessage();
  initButtons();

  PrefObserver.init();
}, false);

document.addEventListener("unload", PrefObserver.uninit, false);
