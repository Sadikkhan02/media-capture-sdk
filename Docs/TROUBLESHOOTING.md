# Troubleshooting Guide

Common issues and diagnosis steps for `media-capture-sdk`.

---

## 1. `PermissionDeniedError` ("Permission denied")
- **Cause:** User clicked "Block" or "Dismiss" on the browser's permission prompt, or camera access is blocked in OS settings.
- **Resolution:**
  - Guide the user to click the camera icon in their browser address bar (URL bar) and select "Always allow".
  - On macOS, check **System Settings > Privacy & Security > Camera** and ensure the browser has permission.
  - On Windows, check **Settings > Privacy > Camera**.

---

## 2. `DeviceNotReadableError` ("Device not readable or in use")
- **Cause:** Another application (e.g. Zoom, Google Meet, Microsoft Teams, OBS) has locked the physical camera exclusively.
- **Resolution:** Close other video applications and retry.

---

## 3. Black Video Preview
- **Cause 1:** Video element is missing `autoplay` or `playsinline`. The SDK attaches these automatically when using `camera.attachPreview(videoEl)`.
- **Cause 2:** Video is not muted during preview. Browsers block unmuted autoplay. The SDK sets `videoEl.muted = true` by default.
- **Cause 3:** Hardware camera privacy shutter is closed. Verify the physical camera switch or laptop slider.

---

## 4. `navigator.mediaDevices is undefined`
- **Cause:** Application is running on plain `http://` over an IP or domain.
- **Resolution:** Access your app over `http://localhost` during development or configure HTTPS with SSL certificates for staging/production.

---

## 5. Audio Feedback Loop (Whistling / Screeching)
- **Cause:** The live camera preview video element has audio enabled, causing microphone input to play directly into the speakers.
- **Resolution:** Keep preview video elements muted (`videoEl.muted = true`). When recording with `audio: true`, audio is captured by the `MediaRecorder` into the recording Blob without routing through preview speakers.

---

## 6. Video Recording Produces Empty or Corrupted File
- **Cause:** Calling `stopRecording()` immediately before any media frames have been processed.
- **Resolution:** Ensure recording runs for at least 500ms before calling `stopRecording()`. The SDK automatically buffers chunks and validates that `totalBytes > 0`.
