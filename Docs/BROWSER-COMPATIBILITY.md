# Browser Compatibility & Media Codec Support

Version: 1.0.0

---

## 1. Supported Browsers Matrix

`media-capture-sdk` uses feature detection for all browser media APIs (`getUserMedia`, `getDisplayMedia`, `MediaRecorder`, `HTMLCanvasElement`).

| Browser | Camera Preview | Photo Capture | Video Recording | Screen Capture | Visual Filters |
|---|:---:|:---:|:---:|:---:|:---:|
| **Google Chrome (Desktop)** 80+ | ✅ Supported | ✅ Supported | ✅ Supported (`webm`, `mp4`) | ✅ Supported | ✅ Supported |
| **Google Chrome (Android)** 80+ | ✅ Supported | ✅ Supported | ✅ Supported (`webm`) | ⚠️ OS Dependent | ✅ Supported |
| **Mozilla Firefox (Desktop)** 75+ | ✅ Supported | ✅ Supported | ✅ Supported (`webm`) | ✅ Supported | ✅ Supported |
| **Apple Safari (macOS)** 14+ | ✅ Supported | ✅ Supported | ✅ Supported (`mp4`) | ✅ Supported (13+) | ✅ Supported |
| **Apple Safari (iOS)** 14.3+ | ✅ Supported | ✅ Supported | ✅ Supported (`mp4`) | ❌ Restricted by iOS | ✅ Supported |
| **Microsoft Edge** 80+ | ✅ Supported | ✅ Supported | ✅ Supported (`webm`, `mp4`) | ✅ Supported | ✅ Supported |

---

## 2. Recording MIME Types & Codecs

Browsers differ in the video container formats and codecs they support for recording via `MediaRecorder`.

The SDK automatically evaluates supported formats in the following order of preference using `MediaRecorder.isTypeSupported`:

1. `video/webm;codecs=vp9,opus` (Chrome, Firefox, Edge)
2. `video/webm;codecs=vp8,opus` (Chrome, Firefox, Android)
3. `video/webm;codecs=h264,opus` (Chrome, Edge)
4. `video/webm` (General WebM fallback)
5. `video/mp4;codecs=avc1,mp4a` (Safari 14.1+, iOS Safari 14.3+)
6. `video/mp4` (General MP4 fallback)

Consumers can query currently supported formats at runtime:
```javascript
import { getSupportedVideoMimeTypes, getBestSupportedMimeType } from "media-capture-sdk";

const supported = getSupportedVideoMimeTypes();
console.log("Supported formats on this browser:", supported);
```

---

## 3. Secure Context Requirements (HTTPS)

Modern browser security specifications mandate that camera access via `navigator.mediaDevices.getUserMedia` is only available in a **Secure Context**:
- In production: `https://`
- In development: `http://localhost` or `http://127.0.0.1`

Attempting to access the camera over plain `http://` on any remote IP or hostname will result in `navigator.mediaDevices` being `undefined` or throwing a `SecurityError`.

---

## 4. Mobile Safari & Autoplay Restrictions
- **Inline Video Playback:** iOS Safari requires `<video playsinline>` to display camera preview inline without launching full-screen playback. `media-capture-sdk` automatically sets `playsInline = true`.
- **Muted Preview:** Browsers block unmuted programmatic video playback. The SDK automatically sets `muted = true` on the preview element so that camera preview starts instantly without waiting for user interaction.
