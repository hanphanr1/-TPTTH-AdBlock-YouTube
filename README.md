# 🛡️ TPTTH AdBlock YouTube

> Tampermonkey script block **toàn bộ** quảng cáo YouTube — pre-roll, mid-roll, banner, overlay, Shorts ads — không để lại ô trống trong feed.

---

## ✨ Tính năng

| Layer | Chức năng |
|---|---|
| 🌐 **Network Block** | Chặn XHR + Fetch đến server quảng cáo trước khi load |
| 🎛️ **Player Config Hook** | Xóa ad data khỏi config YouTube trước khi player đọc |
| ⏭️ **Auto Skip** | Tự động click nút skip hoặc tua đến cuối quảng cáo |
| 🗑️ **DOM Removal** | Xóa banner, card, overlay quảng cáo khỏi trang |
| 🔲 **Grid Gap Fix** | Xóa cả wrapper cha — không để lại ô trống trong feed |
| 💎 **Premium Popup** | Ẩn popup "mua YouTube Premium" và dialog adblock-detected |
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
[YT-AdBlock] v3.1 loaded 
```

---

## ⚡ Hiệu quả thực tế

| Phương pháp | Ads lọt qua | Ghi chú |
|---|---|---|
| Không có gì | ~100% | 100% youtube ads |
| Script này (đơn lẻ) | ~10–15% | YouTube đổi selector, SSAI |
| uBlock Origin (Firefox) | ~2–5% | Filter list cập nhật liên tục |
| Brave Shields | ~1–3% | Block ở network level |
| **Script + Brave/uBlock** | **~0–1%** | ✅ Khuyến nghị |

> **Khuyến nghị:** Dùng script này kết hợp với **Brave** hoặc **Firefox + uBlock Origin** để đạt hiệu quả tối đa.

---

## ⚠️ Giới hạn

- **SSAI (Server-side Ad Insertion):** YouTube ghép quảng cáo thẳng vào stream video trước khi gửi về máy bạn → không thể block từ phía client bằng bất kỳ script nào.
- **YouTube thay đổi selector:** YouTube thường xuyên cập nhật class name. Script cần maintain theo.
- **Race condition:** Đôi khi ads hiện 1–2 giây trước khi bị xóa do Observer chưa kịp chạy.

---

## 🔄 Cập nhật

Script được maintain thủ công. Nếu YouTube update và ads lọt qua, hãy [mở Issue](../../issues) để báo cáo.

---

## 📄 License

MIT — Free to use, modify, and distribute.
