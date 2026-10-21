// h264only
// Copyright 2026 Pavel Sobolev
//
// This file is part of the h264only project, located at
// <https://h264only.paveloom.dev/>.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: GPL-3.0-or-later

// ==UserScript==
// @name         h264only
// @namespace    dev.paveloom.h264only
// @description  Block support for any video compression standard besides H.264
// @version      0.1.0
// @license      GPL-3.0-or-later
// @match        *://m.youtube.com/*
// @match        *://music.youtube.com/*
// @match        *://www.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

console.info("[h264only] userscript started")

function patch() {
    function isBlocked(mimeType) {
        const regex = /(vp0?8|vp0?9|av0?1)/i;
        return typeof mimeType === "string" && regex.test(mimeType);
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canPlayType
    if (window.HTMLMediaElement && HTMLMediaElement.prototype.canPlayType) {
        const original = HTMLMediaElement.prototype.canPlayType;
        HTMLMediaElement.prototype.canPlayType = function(type) {
            return isBlocked(type) ? "" : original.call(this, type);
        };
        console.info("[h264only] override for `window.HTMLMediaElement` applied")
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo
    if (navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
        const original = navigator.prototype.mediaCapabilities;
        navigator.mediaCapabilities.decodingInfo = (configuration) => {
            const contentType = configuration?.video?.contentType;
            if (isBlocked(contentType)) {
                return Promise.resolve({
                    supported: false,
                    smooth: false,
                    powerEfficient: false
                });
            } else {
                return original.call(this, configuration);
            }
        };
        console.info("[h264only] override for `navigator.mediaCapabilities` applied")
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported_static
    if (window.MediaSource && MediaSource.isTypeSupported) {
        const original = MediaSource.isTypeSupported;
        MediaSource.isTypeSupported = function(type) {
            return isBlocked(type) ? false : original(type);
        }
        console.info("[h264only] override for `window.MediaSource` applied")
    }

    console.info("[h264only] patch applied");
}

// https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement/textContent

if (typeof trustedTypes === "undefined")
    trustedTypes = { createPolicy: (_, rules) => rules };

const policy = trustedTypes.createPolicy("h264only", {
    createScript: (x) => x
});

const untrustedScript = "(" + patch.toString() + ")();";
const trustedScript = policy.createScript(untrustedScript);

try {
    const script = document.createElement("script");
    script.textContent = trustedScript;
    document.appendChild(script);
    script.remove();

    console.info("[h264only] injection succeeded");
} catch {
    console.error("[h264only] injection failed");
}
