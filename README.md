# 🛡️ TPTTH AdBlock YouTube

> Tampermonkey script block **gần 100%** quảng cáo YouTube — pre-roll, mid-roll, banner, overlay, Shorts ads — không để lại ô trống trong feed.

---

## ✨ Tính năng (v4.0)

| Layer | Chức năng |
|---|---|
| 🌐 **Network Block** | Chặn XHR + Fetch đến server quảng cáo trước khi load |
| 🧬 **Fetch/XHR Response Interception** | Parse response `/youtubei/v1/player` & `/next`, xóa `adPlacements` / `playerAds` / `adBreaks` ngay trong body trả về |
| 🧬 **JSON.parse Hook** | Lọc ads trong MỌI JSON response YouTube parse |
| 🎛️ **Player Config Hook** | Xóa ad data khỏi `ytInitialPlayerResponse` và `ytInitialData` trước khi player đọc |
| ⚡ **Playback-Rate Trick** | Khi detect `.ad-showing` → speed 16x + mute, qua quảng cáo trong <1s |
| ⏭️ **Auto Skip** | Tự động click nút skip (nhiều selector hơn) |
| 🗑️ **DOM Removal** | Xóa banner, card, overlay, merch shelf, Shorts shelf ads |
| 🔲 **Grid Gap Fix** | Xóa cả wrapper cha — không để lại ô trống trong feed |
| �️ **Anti-Anti-Adblock** | Xóa `#error-screen`, `ytd-enforcement-message-view-model`, overlay backdrop, auto-play lại video |
| �💎 **Premium Popup** | Ẩn popup "mua YouTube Premium" và dialog adblock-detected |
| 🎨 **CSS Hide** | Ẩn ngay qua CSS trước khi JS kịp xóa |
| 👁️ **MutationObserver** | Bắt ads mới load sau khi navigate (YouTube là SPA) |

---

## 📦 Cài đặt

### Yêu cầu
- Trình duyệt: **Firefox**, **Chrome**, **Edge**, **Brave**, hoặc bất kỳ Chromium-based browser nào
- Extension: [Tampermonkey](https://www.tampermonkey.net/)

### Các bước

**1.** Cài Tampermonkey từ store tương ứng với trình duyệt của bạn:

| Trình duyệt | Link |
|---|---|
| Chrome / Edge / Brave | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |

**2.** Mở Tampermonkey Dashboard → **Create new script**

**3.** Xóa toàn bộ code mặc định, paste nội dung file [`youtube-adblocker.user.js`](./youtube-adblocker.user.js) vào

**4.** Nhấn **Ctrl + S** để lưu

**5.** Vào [YouTube](https://www.youtube.com) → mở DevTools (F12) → tab **Console** → thấy dòng sau là thành công:
```
[YT-AdBlock] v4.0 loaded — response interception + playback-rate trick active
```

---

## ⚡ Hiệu quả thực tế

| Phương pháp | Ads lọt qua | Ghi chú |
|---|---|---|
| Không có gì | ~100% | 100% youtube ads |
| Script cũ (v3.1) | ~10–15% | Chỉ tua / skip, thiếu response hook |
| Script này (v4.0 đơn lẻ) | ~2–5% | Đã có response interception + speed trick |
| uBlock Origin (Firefox) | ~2–5% | Filter list cập nhật liên tục |
| Brave Shields | ~1–3% | Block ở network level (Rust engine) |
| **Script v4.0 + Brave/uBlock** | **~0–1%** | ✅ Khuyến nghị tối đa |

> **Khuyến nghị:** Dùng script này kết hợp với **Brave** hoặc **Firefox + uBlock Origin** để đạt hiệu quả tối đa.

---

## 🔧 Các technique chính trong v4.0

1. **Intercept `/youtubei/v1/player` response** — đây là API YouTube trả về config video (gồm cả `adPlacements`). Script hook `fetch` và `XMLHttpRequest`, parse body, xóa mọi object liên quan đến ads, rồi trả lại `Response` mới. Điều này khiến player nghĩ video không có quảng cáo.
2. **Hook `JSON.parse`** — bắt mọi JSON được parse, lọc ads ngay cả khi YouTube dùng cách gọi khác.
3. **Hook `ytInitialPlayerResponse` & `ytInitialData`** — xóa ads từ config inline trong HTML.
4. **Playback-rate 16x + mute** — khi class `.ad-showing` xuất hiện (SSAI hoặc client-side), video quảng cáo bị fast-forward cực nhanh. Thường qua trong <1 giây.
5. **DOM cleanup + CSS hide** — xóa mọi overlay, banner, promoted video, ad slot, merch shelf, Shorts shelf.
6. **Anti-anti-adblock** — tự động xóa dialog "Ad blockers are not allowed", `#error-screen`, và resume video.

---

## ⚠️ Giới hạn

- **SSAI (Server-side Ad Insertion):** YouTube ghép quảng cáo thẳng vào stream video trước khi gửi về máy bạn. Không có extension nào (kể cả userscript) block được ở network level vì nó cùng domain `googlevideo.com`. Tuy nhiên, **playback-rate trick** vẫn khiến quảng cáo chỉ hiện <1 giây.
- **YouTube thay đổi selector:** YouTube thường xuyên cập nhật class name. Script cần maintain theo.
- **Race condition:** Đôi khi ads hiện 1–2 giây trước khi bị xóa do Observer chưa kịp chạy (đã giảm interval xuống 200ms).

---

## 🔄 Cập nhật

Script được maintain thủ công. Nếu YouTube update và ads lọt qua, hãy [mở Issue](../../issues) để báo cáo.

---

## 📄 License

MIT — Free to use, modify, and distribute.
