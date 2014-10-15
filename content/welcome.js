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
        return 0;
      }
      let dntState = Services.prefs.getIntPref("privacy.donottrackheader.value");
      if (dntState === 0) {
        return 1;
      }
      return 2;
    }
  },
  cookies: {
    get value() {
      return Services.prefs.getIntPref("network.cookie.cookieBehavior");
    }
  },
  fhr: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.healthreport.uploadEnabled");
      return val ? 0 : 1;
    }
  },
  telemetry: {
    get value() {
      let val = Services.prefs.getBoolPref("toolkit.telemetry.enabled");
      return val ? 0 : 1;
    }
  },
  crash: {
    get value() {
      let val = CrashReporter.submitReports;
      return val ? 0 : 1;
    }
  },
  stumbler: {
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.app.geo.reportdata");
      return val ? 0 : 1;
    }
  }
};

function initPrefValues() {
  let uls = document.querySelectorAll(".pref-value-list");
  for (let i = 0; i < uls.length; i++) {
    let list = uls[i];
    let pref = gPrefs[list.getAttribute("pref")];
    list.children[pref.value].classList.add("current-value");
  }
}

function initSearchMessage() {
  Services.search.init(() => {
    let searchMessage = document.getElementById("search-audit");
    let engine = Services.search.defaultEngine;

    if (engine.getSubmission("").uri.scheme === "https") {
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

document.addEventListener("DOMContentLoaded", function() {
  initPrefValues();
  initSearchMessage();
  initButtons();
}, false);
