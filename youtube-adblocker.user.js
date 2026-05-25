// ==UserScript==
// @name         TPTTH ADBLOCK YOUTUBE
// @namespace    https://github.com/yt-adblock
// @version      4.0
// @description  Block 100% quảng cáo YouTube: pre-roll, mid-roll, banner, overlay, shorts ads — response interception + playback-rate trick
// @author       Custom
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const LOG = (...a) => console.log('[YT-AdBlock]', ...a);

    // ═══════════════════════════════════════════════════════════════
    // 0. DEEP AD CLEANER — dùng cho mọi response / config object
    // ═══════════════════════════════════════════════════════════════
    const AD_KEYS = new Set([
        'adPlacements', 'adSlots', 'adParams', 'playerAds',
        'adBreakParams', 'linearAd', 'nonlinearAd', 'adBreaks',
        'decoratedPlayerBarRenderer', 'engagementPanelSectionListRenderer',
    ]);

    function cleanAdConfigDeep(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            for (let i = obj.length - 1; i >= 0; i--) {
                if (obj[i] && typeof obj[i] === 'object') {
                    if (obj[i].adSlotRenderer || obj[i].promotedSparklesWebRenderer || obj[i].promotedVideoRenderer) {
                        obj.splice(i, 1);
                        continue;
                    }
                    cleanAdConfigDeep(obj[i]);
                }
            }
        } else {
            for (const key of Object.keys(obj)) {
                if (AD_KEYS.has(key)) {
                    delete obj[key];
                    continue;
                }
                if (key === 'auxiliaryUi' && obj[key]?.message?.rendererContext?.notificationTitleRenderer) {
                    delete obj[key];
                    continue;
                }
                if (typeof obj[key] === 'object') cleanAdConfigDeep(obj[key]);
            }
        }
        return obj;
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. HOOK JSON.parse — lọc ads trong MỌI JSON response
    // ═══════════════════════════════════════════════════════════════
    const _jsonParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        const parsed = _jsonParse.call(this, text, reviver);
        if (parsed && typeof parsed === 'object') {
            if (parsed.adPlacements || parsed.playerAds || parsed.adBreaks) {
                cleanAdConfigDeep(parsed);
            }
            if (parsed.playerResponse) cleanAdConfigDeep(parsed.playerResponse);
            if (parsed.response) cleanAdConfigDeep(parsed.response);
        }
        return parsed;
    };

    // ═══════════════════════════════════════════════════════════════
    // 2. BLOCK NETWORK + INTERCEPT RESPONSE (Fetch + XHR)
    // ═══════════════════════════════════════════════════════════════
    const AD_DOMAINS = [
        'doubleclick.net', 'googleads.g.doubleclick.net', 'static.doubleclick.net',
        'pagead2.googlesyndication.com', 'googlesyndication.com', 'ad.youtube.com',
        'www.youtube.com/pagead', 'www.youtube.com/api/stats/ads',
        'www.youtube.com/ptracking', 'www.youtube.com/youtubei/v1/log_event',
        'youtube.com/pagead/lvz', 'securepubads.g.doubleclick.net',
        'youtube.com/api/stats/qoe?adformat', 'youtube.com/pagead/adview',
    ];

    function isAdUrl(url) {
        if (typeof url !== 'string') return false;
        return AD_DOMAINS.some(d => url.includes(d));
    }

    function isPlayerOrNextUrl(url) {
        if (typeof url !== 'string') return false;
        return url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next') || url.includes('get_video_info');
    }

    // --- Fetch hook (intercept response body) ---
    const _fetch = window.fetch;
    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : input?.url;
        if (isAdUrl(url)) {
            LOG('Blocked fetch:', url);
            return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const response = await _fetch.apply(this, arguments);
        if (isPlayerOrNextUrl(url)) {
            try {
                const text = await response.clone().text();
                const json = _jsonParse(text);
                cleanAdConfigDeep(json);
                return new Response(JSON.stringify(json), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                });
            } catch (e) { /* fallthrough */ }
        }
        return response;
    };

    // --- XHR hook (intercept responseText cho player endpoint) ---
    const _xhrOpen = XMLHttpRequest.prototype.open;
    const _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._url = url;
        return _xhrOpen.call(this, method, url, ...args);
    };
    XMLHttpRequest.prototype.send = function (...args) {
        if (isAdUrl(this._url)) {
            LOG('Blocked XHR:', this._url);
            return;
        }
        if (isPlayerOrNextUrl(this._url)) {
            const self = this;
            const origOnload = this.onload;
            this.onload = function () {
                try {
                    const json = _jsonParse(self.responseText);
                    cleanAdConfigDeep(json);
                    const newText = JSON.stringify(json);
                    Object.defineProperty(self, 'responseText', {
                        get() { return newText; },
                        configurable: true,
                    });
                } catch (e) {}
                if (origOnload) origOnload.apply(this, arguments);
            };
        }
        return _xhrSend.apply(this, args);
    };

    // ═══════════════════════════════════════════════════════════════
    // 3. HOOK ytInitialPlayerResponse + ytInitialData
    // ═══════════════════════════════════════════════════════════════
    (function hookProp(propName) {
        let val = undefined;
        Object.defineProperty(window, propName, {
            get() { return val; },
            set(newVal) {
                if (newVal && typeof newVal === 'object') {
                    cleanAdConfigDeep(newVal);
                }
                val = newVal;
            },
            configurable: true,
        });
    })('ytInitialPlayerResponse');

    (function hookProp(propName) {
        let val = undefined;
        Object.defineProperty(window, propName, {
            get() { return val; },
            set(newVal) {
                if (newVal && typeof newVal === 'object') {
                    cleanAdConfigDeep(newVal);
                }
                val = newVal;
            },
            configurable: true,
        });
    })('ytInitialData');

    // ═══════════════════════════════════════════════════════════════
    // 4. AUTO SKIP + PLAYBACK-RATE TRICK
    //    Khi ad-showing → speed 16x + mute; khi hết → restore
    // ═══════════════════════════════════════════════════════════════
    const SKIP_SELECTORS = [
        '.ytp-ad-skip-button',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-modern',
        'button.ytp-ad-skip-button-slot',
        '[class*="skip-button"]',
        '[id*="skip-button"]',
        '.ytp-ad-skip-button-text',
    ];

    let savedPlaybackRate = 1;

    function trySkipAd() {
        for (const sel of SKIP_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn) {
                btn.click();
                LOG('Clicked skip button:', sel);
                return true;
            }
        }
        return false;
    }

    function handleAdPlayback() {
        const player = document.querySelector('.html5-video-player');
        const video = document.querySelector('video');
        if (!player || !video) return;

        const isAd =
            player.classList.contains('ad-showing') ||
            document.querySelector('.ytp-ad-module') ||
            document.querySelector('.ytp-ad-player-overlay');

        if (isAd) {
            trySkipAd();
            if (video.playbackRate !== 16) savedPlaybackRate = video.playbackRate || 1;
            video.playbackRate = 16;
            video.muted = true;
        } else {
            if (video.playbackRate === 16) {
                video.playbackRate = savedPlaybackRate || 1;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. REMOVE AD DOM ELEMENTS + FIX GRID GAP
    // ═══════════════════════════════════════════════════════════════
    const AD_INNER_SELECTORS = [
        '.ytp-ad-overlay-container',
        '.ytp-ad-text-overlay',
        '.ytp-ad-image-overlay',
        '.ytp-ad-overlay-close-button',
        '.ytp-ad-progress',
        '.ytp-ad-progress-list',
        '.ytp-ad-player-overlay',
        '.ytp-ad-player-overlay-instream-info',
        '.ytp-ad-module',
        '#masthead-ad',
        'ytd-display-ad-renderer',
        'ytd-promoted-sparkles-web-renderer',
        'ytd-banner-promo-renderer',
        'ytd-ad-slot-renderer',
        'ytd-in-feed-ad-layout-renderer',
        'ytd-promoted-video-renderer',
        'ytd-search-pyv-renderer',
        'ytd-compact-promoted-video-renderer',
        '.ytd-masthead-ad',
        '[data-ad-slot-id]',
        'ytd-reel-video-renderer[is-active] ytd-ad-slot-renderer',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
        'ytd-reel-shelf-renderer',               // Shorts shelf quảng cáo
        'ytd-merch-shelf-renderer',
        'ytd-compact-promoted-item-renderer',
    ];

    const GRID_WRAPPER_TAGS = new Set([
        'ytd-rich-item-renderer',
        'ytd-rich-grid-row',
        'ytd-shelf-renderer',
        'ytd-item-section-renderer',
        'ytd-search-pyv-renderer',
    ]);

    function findRemoveTarget(el) {
        let cur = el.parentElement;
        while (cur && cur !== document.body) {
            if (GRID_WRAPPER_TAGS.has(cur.tagName.toLowerCase())) {
                const hasRealVideo = cur.querySelector(
                    'ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, a#video-title, ytd-reel-video-renderer'
                );
                if (!hasRealVideo) return cur;
                return el;
            }
            cur = cur.parentElement;
        }
        return el;
    }

    function removeAdElements() {
        let removed = 0;
        const toRemove = new Set();
        for (const sel of AD_INNER_SELECTORS) {
            document.querySelectorAll(sel).forEach(el => {
                const target = findRemoveTarget(el);
                toRemove.add(target);
            });
        }
        toRemove.forEach(el => {
            el.style.cssText = 'transition:opacity 0.15s;opacity:0;';
            setTimeout(() => el.remove(), 150);
            removed++;
        });
        if (removed > 0) LOG(`Removed ${removed} ad elements (with wrappers)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. BYPASS ANTI-ADBLOCK + PREMIUM UPSELL
    // ═══════════════════════════════════════════════════════════════
    function removeEnforcementAndPopups() {
        const selectors = [
            'ytd-mealbar-promo-renderer',
            '.ytd-mealbar-promo-renderer',
            'tp-yt-paper-dialog[has-scrolling-region] .ytd-enforcement-message-view-model',
            '.ytd-enforcement-message-view-model',
            '#header-ad',
            '#error-screen',
            'tp-yt-iron-overlay-backdrop',
            'ytd-enforcement-message-view-model',
        ];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Un-pause nếu bị pause do anti-adblock
        const video = document.querySelector('video');
        if (video && video.paused && document.querySelector('.ytd-enforcement-message-view-model, #error-screen')) {
            video.play();
        }

        const rejectBtn = document.querySelector(
            'button[aria-label*="No thanks"], button[aria-label*="Dismiss"], .yt-spec-button-shape-next--tonal'
        );
        if (rejectBtn && document.querySelector('.ytd-enforcement-message-view-model')) {
            rejectBtn.click();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. CSS HIDE (backup layer)
    // ═══════════════════════════════════════════════════════════════
    const style = document.createElement('style');
    style.textContent = `
        .ytp-ad-overlay-container,
        .ytp-ad-text-overlay,
        .ytp-ad-image-overlay,
        .ytp-ad-progress,
        .ytp-ad-player-overlay,
        .ytp-ad-module,
        ytd-display-ad-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-banner-promo-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-promoted-video-renderer,
        ytd-compact-promoted-video-renderer,
        ytd-compact-promoted-item-renderer,
        ytd-merch-shelf-renderer,
        ytd-reel-shelf-renderer,
        #masthead-ad,
        ytd-mealbar-promo-renderer,
        ytd-enforcement-message-view-model,
        #error-screen,
        tp-yt-iron-overlay-backdrop {
            display: none !important;
        }

        ytd-ad-slot-renderer { display: none !important; }

        ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
        ytd-rich-item-renderer:has(ytd-display-ad-renderer),
        ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
        ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
        ytd-rich-item-renderer:has(ytd-promoted-video-renderer) {
            display: none !important;
        }

        ytd-rich-grid-renderer #contents > ytd-rich-item-renderer[hidden],
        ytd-rich-grid-renderer #contents > ytd-rich-item-renderer:empty {
            display: none !important;
        }

        .ad-showing .ytp-chrome-bottom {
            display: flex !important;
        }

        /* Ngăn layout jump do ad overlay */
        .ad-showing .ytp-ad-module {
            display: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // ═══════════════════════════════════════════════════════════════
    // 8. MUTATION OBSERVER + INTERVAL BACKUP
    // ═══════════════════════════════════════════════════════════════
    const observer = new MutationObserver(() => {
        handleAdPlayback();
        removeAdElements();
        removeEnforcementAndPopups();
    });

    function startObserver() {
        observer.observe(document.documentElement, { childList: true, subtree: true });
        LOG('Observer started');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }

    // Chạy ngay lần đầu
    handleAdPlayback();
    removeAdElements();
    removeEnforcementAndPopups();

    setInterval(() => {
        handleAdPlayback();
        removeAdElements();
        removeEnforcementAndPopups();
    }, 200);   // nhanh hơn một chút

    LOG('v4.0 loaded — response interception + playback-rate trick active');
})();