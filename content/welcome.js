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

let gThemes = [
  {
    category: "None",
    iconURL: "https://addons.cdn.mozilla.net/user-media/addons/18066/preview_small.jpg?1241572934",
    headerURL: "https://addons.cdn.mozilla.net/user-media/addons/18066/1232849758499.jpg?1241572934",
    name: "Dark Fox",
    author: "randomaster",
    footer: "https://addons.cdn.mozilla.net/user-media/addons/18066/1232849758500.jpg?1241572934",
    previewURL: "https://addons.cdn.mozilla.net/user-media/addons/18066/preview_large.jpg?1241572934",
    updateURL: "https://versioncheck.addons.mozilla.org/en-US/themes/update-check/18066",
    accentcolor: "#000000",
    header: "https://addons.cdn.mozilla.net/user-media/addons/18066/1232849758499.jpg?1241572934",
    version: "1.0",
    footerURL: "https://addons.cdn.mozilla.net/user-media/addons/18066/1232849758500.jpg?1241572934",
    detailURL: "https://addons.mozilla.org/en-US/android/addon/dark-fox-18066/",
    textcolor: "#ffffff",
    id: "18066",
    description: "My dark version of the Firefox logo."
  },
  {
    category: "Nature",
    iconURL: "https://addons.cdn.mozilla.net/user-media/addons/60179/preview_small.jpg?1353185054",
    headerURL: "https://addons.cdn.mozilla.net/user-media/addons/60179/dupa.jpg?1353185054",
    name: "little flowers",
    author: "bluszcz",
    footer: "https://addons.cdn.mozilla.net/user-media/addons/60179/Beznazwy1.jpg?1353185054",
    previewURL: "https://addons.cdn.mozilla.net/user-media/addons/60179/preview_large.jpg?1353185054",
    updateURL: "https://versioncheck.addons.mozilla.org/en-US/themes/update-check/60179",
    accentcolor: "#",
    header: "https://addons.cdn.mozilla.net/user-media/addons/60179/dupa.jpg?1353185054",
    version: "1.0",
    footerURL: "https://addons.cdn.mozilla.net/user-media/addons/60179/Beznazwy1.jpg?1353185054",
    detailURL: "https://addons.mozilla.org/en-US/android/addon/little-flowers/",
    textcolor: "#",
    id: "60179",
    description: ""
  },
  {
    category: "None",
    iconURL: "https://addons.cdn.mozilla.net/user-media/addons/46852/preview_small.jpg?1377881898",
    headerURL: "https://addons.cdn.mozilla.net/user-media/addons/46852/NSH.jpg?1377881898",
    name: "Sunset Over Water",
    author: "MaDonna",
    footer: "https://addons.cdn.mozilla.net/user-media/addons/46852/NSF.jpg?1377881898",
    previewURL: "https://addons.cdn.mozilla.net/user-media/addons/46852/preview_large.jpg?1377881898",
    updateURL: "https://versioncheck.addons.mozilla.org/en-US/themes/update-check/46852",
    accentcolor: "#000000",
    header: "https://addons.cdn.mozilla.net/user-media/addons/46852/NSH.jpg?1377881898",
    version: "1.0",
    footerURL: "https://addons.cdn.mozilla.net/user-media/addons/46852/NSF.jpg?1377881898",
    detailURL: "https://addons.mozilla.org/en-US/android/addon/sunset-over-water/",
    textcolor: "#faf5f5",
    id: "46852",
    description: "This is a photo I took on Chuckanut Drive in Washington state.\n© MaDonnas Personas\n\nDesigned by MaDonna\n\nI have a desktop wallpaper that matches and you can find it at:\n<a href=\"http://outgoing.mozilla.org/v1/1687c5b2724e719966c797b44e3eb79ba02fae6f32729b1c7344a911ba8449ea/http%3A//nature.desktopnexus.com/wallpaper/335230/\" rel=\"nofollow\">http://nature.desktopnexus.com/wallpaper/335230/</a>"
  }
];

function initPrefsList() {
  let prefsList = document.getElementById("prefs");
  gPrefs.forEach(function(pref) {
    let li = document.createElement("li");

    let label = document.createElement("div");
    label.textContent = pref.label;
    label.classList.add("pref-label");
    li.appendChild(label);

    let desc = document.createElement("div");
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

function initThemesList() {
  let themesList = document.getElementById("themes");
  gThemes.forEach(function(theme) {
    let li = document.createElement("li");

    let preview = document.createElement("div");
    preview.classList.add("theme-preview");
    preview.style.backgroundImage = "url(" + theme.previewURL + ")";
    preview.addEventListener("click", () => LightweightThemeManager.previewTheme(theme), false);

    li.appendChild(preview);

    themesList.appendChild(li);
  });
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
  initThemesList();
}, false);
