// ==UserScript==
// @name         TPTTH ADBLOCK YOUTUBE
// @namespace    https://github.com/yt-adblock
// @version      3.1
// @description  Block tất cả quảng cáo YouTube: pre-roll, mid-roll, banner, overlay, shorts ads
// @author       Custom
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // 1. BLOCK NETWORK REQUEST (XHR + Fetch)
    //    Chặn các request đến server quảng cáo ngay từ đầu
    // ═══════════════════════════════════════════════════════════════
    const AD_DOMAINS = [
        'doubleclick.net',
        'googleads.g.doubleclick.net',
        'static.doubleclick.net',
        'pagead2.googlesyndication.com',
        'googlesyndication.com',
        'ad.youtube.com',
        'www.youtube.com/pagead',
        'www.youtube.com/api/stats/ads',
        'www.youtube.com/ptracking',
        'www.youtube.com/youtubei/v1/log_event',
        'youtube.com/pagead/lvz',
        'securepubads.g.doubleclick.net',
    ];

    function isAdUrl(url) {
        if (typeof url !== 'string') return false;
        return AD_DOMAINS.some(d => url.includes(d));
    }

    // Intercept XMLHttpRequest
    const _xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (isAdUrl(url)) {
            console.log('[YT-AdBlock] Blocked XHR:', url);
            return; // Hủy request
        }
        return _xhrOpen.call(this, method, url, ...args);
    };

    // Intercept fetch()
    const _fetch = window.fetch;
    window.fetch = function (url, ...args) {
        if (isAdUrl(typeof url === 'string' ? url : url?.url)) {
            console.log('[YT-AdBlock] Blocked fetch:', url);
            return Promise.resolve(new Response('{}', {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
        return _fetch.apply(this, [url, ...args]);
    };


    // ═══════════════════════════════════════════════════════════════
    // 2. INTERCEPT YOUTUBE PLAYER CONFIG
    //    Xóa thông tin quảng cáo khỏi config trước khi player đọc
    // ═══════════════════════════════════════════════════════════════
    function cleanAdConfig(config) {
        if (!config || typeof config !== 'object') return config;

        // Xóa các key liên quan đến ads
        const adKeys = [
            'adPlacements', 'adSlots', 'adParams',
            'auxiliaryUi', 'playerAds', 'adBreakParams',
            'linearAd', 'nonlinearAd',
        ];

        adKeys.forEach(key => {
            if (config[key]) delete config[key];
        });

        // Đệ quy với các object con
        Object.keys(config).forEach(key => {
            if (typeof config[key] === 'object') {
                cleanAdConfig(config[key]);
            }
        });

        return config;
    }

    // Hook vào ytInitialPlayerResponse
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        set(val) {
            if (val?.adPlacements) {
                console.log('[YT-AdBlock] Cleaned ytInitialPlayerResponse ads');
                cleanAdConfig(val);
            }
            Object.defineProperty(window, 'ytInitialPlayerResponse', {
                value: val, writable: true, configurable: true
            });
        },
        configurable: true,
    });


    // ═══════════════════════════════════════════════════════════════
    // 3. AUTO SKIP ADS
    //    Tự động nhấn nút skip và tua video quảng cáo
    // ═══════════════════════════════════════════════════════════════
    const SKIP_SELECTORS = [
        '.ytp-ad-skip-button',
        '.ytp-skip-ad-button',
        '.ytp-ad-skip-button-modern',
        'button.ytp-ad-skip-button-slot',
        '[class*="skip-button"]',
        '[id*="skip-button"]',
    ];

    function trySkipAd() {
        // Thử click nút skip
        for (const sel of SKIP_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn) {
                btn.click();
                console.log('[YT-AdBlock] Clicked skip button:', sel);
                return true;
            }
        }

        // Nếu không có nút skip → tua video đến cuối
        const video = document.querySelector('video');
        if (!video) return false;

        const isAdPlaying =
            document.querySelector('.ad-showing') ||
            document.querySelector('.ytp-ad-player-overlay') ||
            document.querySelector('[class*="ad-showing"]');

        if (isAdPlaying && video.duration && isFinite(video.duration)) {
            video.currentTime = video.duration;
            video.muted = true;
            console.log('[YT-AdBlock] Seeked ad to end');
            return true;
        }

        return false;
    }


    // ═══════════════════════════════════════════════════════════════
    // 4. REMOVE AD DOM ELEMENTS + FIX GRID GAP
    //    Xóa phần tử quảng cáo VÀ container cha để không để lại ô trống
    // ═══════════════════════════════════════════════════════════════

    // Các selector nhận diện ad element bên trong
    const AD_INNER_SELECTORS = [
        // Video player overlays
        '.ytp-ad-overlay-container',
        '.ytp-ad-text-overlay',
        '.ytp-ad-image-overlay',
        '.ytp-ad-overlay-close-button',
        '.ytp-ad-progress',
        '.ytp-ad-progress-list',
        '.ytp-ad-player-overlay',
        '.ytp-ad-player-overlay-instream-info',

        // Page ad components
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

        // Shorts ads
        'ytd-reel-video-renderer[is-active] ytd-ad-slot-renderer',
    ];

    // Các tag là "grid item wrapper" của YouTube — nếu chứa ad thì xóa cả wrapper
    // để lưới tự fill vào thay vì để ô trống
    const GRID_WRAPPER_TAGS = new Set([
        'ytd-rich-item-renderer',       // ô trong feed trang chủ
        'ytd-rich-grid-row',            // hàng trong grid
        'ytd-shelf-renderer',           // kệ video
        'ytd-item-section-renderer',    // section
        'ytd-search-pyv-renderer',      // search ad wrapper
    ]);

    /**
     * Walk up DOM tree từ el, tìm wrapper grid gần nhất.
     * Nếu wrapper đó CHỈ chứa ad (không có video thật) → trả về wrapper để xóa.
     * Nếu wrapper có cả content thật → chỉ xóa el.
     */
    function findRemoveTarget(el) {
        let cur = el.parentElement;
        while (cur && cur !== document.body) {
            if (GRID_WRAPPER_TAGS.has(cur.tagName.toLowerCase())) {
                // Kiểm tra wrapper có video thật không
                const hasRealVideo = cur.querySelector(
                    'ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, a#video-title'
                );
                if (!hasRealVideo) return cur; // Wrapper toàn ad → xóa cả wrapper
                return el;                      // Có video thật → chỉ xóa inner ad
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
            // Animate out để không bị "giật" layout đột ngột
            el.style.cssText = 'transition:opacity 0.15s;opacity:0;';
            setTimeout(() => el.remove(), 150);
            removed++;
        });

        if (removed > 0) console.log(`[YT-AdBlock] Removed ${removed} ad elements (with wrappers)`);
    }


    // ═══════════════════════════════════════════════════════════════
    // 5. BYPASS PREMIUM UPSELL
    //    Ẩn popup nhắc mua YouTube Premium
    // ═══════════════════════════════════════════════════════════════
    function removePremiumPopups() {
        const premiumSelectors = [
            'ytd-mealbar-promo-renderer',
            '.ytd-mealbar-promo-renderer',
            'tp-yt-paper-dialog[has-scrolling-region] .ytd-enforcement-message-view-model',
            '.ytd-enforcement-message-view-model',
            '#header-ad',
        ];
        premiumSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Đóng dialog "Bật ad blocker" của YouTube
        const rejectBtn = document.querySelector(
            'button[aria-label*="No thanks"], button[aria-label*="Dismiss"], .yt-spec-button-shape-next--tonal'
        );
        if (rejectBtn && document.querySelector('.ytd-enforcement-message-view-model')) {
            rejectBtn.click();
        }
    }


    // ═══════════════════════════════════════════════════════════════
    // 6. CSS HIDE (backup layer)
    //    Ẩn qua CSS phòng khi JS chưa kịp xóa
    // ═══════════════════════════════════════════════════════════════
    const style = document.createElement('style');
    style.textContent = `
        /* Ẩn ad elements ngay lập tức qua CSS — không để lại khoảng trắng */
        .ytp-ad-overlay-container,
        .ytp-ad-text-overlay,
        .ytp-ad-image-overlay,
        .ytp-ad-progress,
        .ytp-ad-player-overlay,
        ytd-display-ad-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-banner-promo-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-promoted-video-renderer,
        #masthead-ad,
        ytd-mealbar-promo-renderer {
            display: none !important;
        }

        /* Ẩn ytd-ad-slot-renderer VÀ wrapper cha của nó trong grid */
        ytd-ad-slot-renderer {
            display: none !important;
        }
        ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
        ytd-rich-item-renderer:has(ytd-display-ad-renderer),
        ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
        ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer) {
            display: none !important;
        }

        /* Fix: không để ô trống trong grid */
        ytd-rich-grid-renderer #contents > ytd-rich-item-renderer[hidden],
        ytd-rich-grid-renderer #contents > ytd-rich-item-renderer:empty {
            display: none !important;
        }

        /* Khôi phục controls khi ad đang chạy */
        .ad-showing .ytp-chrome-bottom {
            display: flex !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);


    // ═══════════════════════════════════════════════════════════════
    // 7. MUTATION OBSERVER — theo dõi DOM thay đổi
    //    YouTube là SPA, cần observer để bắt ad load sau
    // ═══════════════════════════════════════════════════════════════
    const observer = new MutationObserver((mutations) => {
        let shouldAct = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) {
                shouldAct = true;
                break;
            }
        }
        if (shouldAct) {
            trySkipAd();
            removeAdElements();
            removePremiumPopups();
        }
    });

    // Bắt đầu observe sau khi DOM sẵn sàng
    function startObserver() {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        console.log('[YT-AdBlock] Observer started');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }


    // ═══════════════════════════════════════════════════════════════
    // 8. INTERVAL BACKUP — chạy định kỳ
    //    Phòng trường hợp observer bị miss
    // ═══════════════════════════════════════════════════════════════
    setInterval(() => {
        trySkipAd();
        removeAdElements();
        removePremiumPopups();
    }, 300);

    // Chạy ngay lần đầu
    document.addEventListener('DOMContentLoaded', () => {
        trySkipAd();
        removeAdElements();
        removePremiumPopups();
    });

    console.log('[YT-AdBlock] v3.1 loaded');

})();