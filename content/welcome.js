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

let gPrefs = {
  dnt: {
    get value() {
      let enableDNT = Services.prefs.getBoolPref("privacy.donottrackheader.enabled");
      if (!enableDNT) {
        return "Do not tell sites anything about my tracking preferences";
      }
      let dntState = Services.prefs.getIntPref("privacy.donottrackheader.value");
      if (dntState === 0) {
        return "Tell sites that I want to be tracked";
      }
      return "Tell sites that I do not want to be tracked";
    }
  },
  cookies: {
    get value() {
      let val = Services.prefs.getIntPref("network.cookie.cookieBehavior");
      if (val == 0) {
        return "Enabled";
      }
      if (val == 1) {
        return "Enabled, excluding 3rd party";
      }
      return "Disabled";
    }
  },
  fhr: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.healthreport.uploadEnabled");
      return val ? "Enabled" : "Disabled";
    }
  },
  telemetry: {
    get value() {
      let val = Services.prefs.getBoolPref("toolkit.telemetry.enabled");
      return val ? "Enabled" : "Disabled";
    }
  },
  crash: {
    get value() {
      let val = CrashReporter.submitReports;
      return val ? "Enabled" : "Disabled";
    }
  },
  mls: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.app.geo.reportdata");
      return val ? "Enabled" : "Disabled";
    }
  }
};

function refreshPrefValues() {
  let divs = document.querySelectorAll(".pref-value");
  Array.prototype.forEach.call(divs, function(div) {
    let value = gPrefs[div.getAttribute("pref")].value;
    div.textContent = "Current value: " + value;
  });
}

function refreshSearchMessage() {
  Services.search.init(() => {
    let searchMessage = document.getElementById("search-audit");
    let engine = Services.search.defaultEngine;

    if (engine.getSubmission("").uri.scheme === "https") {
      searchMessage.classList.remove("warn");
      searchMessage.textContent = "Your default search engine (" + engine.name + ") uses HTTPS, so you're already secure.";
    } else {
      searchMessage.classList.add("warn");
      searchMessage.textContent = "Your default search engine (" + engine.name + ") doesn't use HTTPS, so you may want to change your default now."
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
