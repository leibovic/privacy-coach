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

let gPrefs = [
  {
    label: "Do Not Track",
    description: "DNT lets your browser tell websites that you do not want to be tracked.",
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
    },
    page: "preferences_privacy"
  },
  {
    label: "Cookies",
    description: "Cookies let websites store small pieces of data in your browser to rememeber state when you navigate between webpages. However, this means they can also be used to track you.",
    get value() {
      let val = Services.prefs.getIntPref("network.cookie.cookieBehavior");
      if (val === 0) {
        return "Enabled";
      }
      if (val === 1) {
        return "Enabled, excluding 3rd party";
      }
      return "Disabled";
    },
    page: "preferences_privacy"
  },
  {
    label: "Firefox Health Report",
    description: "FHR shares data with Mozilla about your browser health and helps you understand your browser performance.",
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.healthreport.uploadEnabled");
      return val ? "Enabled" : "Disabled";
    },
    page: "preferences_vendor"
  },
  {
    label: "Telemetry",
    description: "Telemetry shares more detailed performance, usage, hardware and customization data about your browser with Mozilla to help us make the browser better.",
    get value() {
      let val = Services.prefs.getBoolPref("toolkit.telemetry.enabled");
      return val ? "Enabled" : "Disabled";
    },
    page: "preferences_vendor"
  },
  {
    label: "Crash reporter",
    description: "The crash reporter lets you choose to submit crash reports to Mozilla to help us make the browser more stable and secure.",
    get value() {
      let val = CrashReporter.submitReports;
      return val ? "Enabled" : "Disabled";
    },
    page: "preferences_vendor"
  },
  {
    label: "MozStumbler",
    description: "The MozStumbler shares approximate Wi-Fi and cellular location with Mozilla to help improve our geolocation service.",
    get value() {
      let val = SharedPreferences.forApp().getBoolPref("android.not_a_preference.app.geo.reportdata");
      return val ? "Enabled" : "Disabled";
    },
    page: "preferences_vendor"
  }
];

function initPrefsList() {
  let prefsList = document.getElementById("prefs");
  gPrefs.forEach(function(pref) {
    let li = document.createElement("li");

    let label = document.createElement("h4");
    label.textContent = pref.label;
    li.appendChild(label);

    let desc = document.createElement("p");
    desc.textContent = pref.description;
    li.appendChild(desc);

    let valueContainer = document.createElement("div");
    valueContainer.classList.add("pref-value");

    let value = document.createElement("div");
    value.textContent = "Current value: " + pref.value;
    valueContainer.appendChild(value);

    let button = document.createElement("button");
    button.textContent = "Change";
    button.addEventListener("click", () => openPrefPage(pref.page), false);
    valueContainer.appendChild(button);

    li.appendChild(valueContainer);

    prefsList.appendChild(li);
  });
}

function initSearchMessage() {
  Services.search.init(() => {
    let searchMessage = document.getElementById("search-message");

    let div = document.createElement("div");
    let engine = Services.search.defaultEngine;

    if (engine.getSubmission("").uri.scheme === "https") {
      div.textContent = "Excellent! Your default search engine (" + engine.name + ") uses HTTPS.";
    } else {
      div.classList.add("warn");
      div.textContent = "Watch out! Your default search engine (" + engine.name + ") doesn't use HTTPS."
    }

    searchMessage.appendChild(div);

    let button = document.createElement("button");
    button.textContent = "Change";
    button.addEventListener("click", () => openPrefPage("preferences_search"), false);
    searchMessage.appendChild(button);
  });
}

function initClearOnExit() {
  let button = document.getElementById("clear-on-exit");
  button.addEventListener("click", () => openPrefPage("preferences_privacy"), false);
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
  initPrefsList();
  initSearchMessage();
  initClearOnExit();
}, false);
