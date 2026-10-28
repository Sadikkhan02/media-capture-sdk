# media-capture-sdk

> Production-ready, client-side JavaScript Media Capture SDK for browser camera access, live video preview, photo capture, video recording, screen capture, and visual effects.

[![npm version](https://img.shields.io/badge/npm-1.0.0-blue.svg)](https://www.npmjs.com/package/media-capture-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 1. Overview

`media-capture-sdk` is an unopinionated, zero-dependency, client-side JavaScript SDK that allows developers to add camera and media recording capabilities to existing web applications without building media lifecycle management from scratch.

### Key Capabilities
- **Live Camera Preview:** Stream camera feed with configurable resolution (`720p`, `1080p`, `4k`, or custom dimensions) and frame rates.
- **Camera Selection & Switching:** Enumerate physical cameras and switch seamlessly between front/back or external webcams.
- **Still Photo Capture:** Capture uncompressed frames to canvas with configurable format (`image/jpeg`, `image/png`, `image/webp`), quality, dimensions, and mirroring.
- **Video Recording:** Record video and audio using `MediaRecorder` with automatic MIME negotiation (VP9, VP8, H264, WebM, MP4), pause, resume, max duration, and size limits.
- **Display & Screen Capture:** Screen and browser tab capture via `getDisplayMedia` with user cancellation and track termination handling.
- **Visual Effects & Filters:** Real-time CSS and canvas filters (grayscale, sepia, blur, contrast, hue-rotate, vintage, warm, cool) for live preview and recording.
- **Ready-to-Use UI or Headless:** Use the modular headless API or drop in the accessible built-in capture widget (`media-capture-sdk/ui`).
- **React & Next.js Support:** First-class SSR-safe React hook (`useCamera`, `useScreenCapture`) and `<CameraCaptureView />` component (`media-capture-sdk/react`).
- **Media Contract:** Structured `MediaResult` returning raw `Blob` and standard `File`, with managed Object URLs and explicit lifecycle cleanup.

---

## 2. Product Boundaries

This package is strictly client-side and backend-independent.

**What this package does NOT do:**
- Does not implement a database or backend server.
- Does not authenticate users or enforce server permissions.
- Does not upload files or connect to cloud storage.
- Does not send telemetry or analytics.
- Does not include a video editing timeline (the host application handles its own timeline, storage, and business logic).

---

## 3. Installation & Prerequisites

Install via npm:

```bash
npm install media-capture-sdk
```

### Browser & HTTPS Requirements
Modern browsers restrict camera and microphone access to **Secure Contexts**. Your application must run on:
- `https://` in production or staging.
- `http://localhost` or `http://127.0.0.1` during local development.

---

## 4. Quick Start (Vanilla JavaScript)

```html
<video id="preview" autoplay playsinline muted></video>
<button id="capture-btn">Take Photo</button>
<button id="record-btn">Record Video</button>
<button id="stop-btn">Stop Recording</button>

<script type="module">
  import { createCamera } from "media-capture-sdk";

  const videoElement = document.getElementById("preview");

  // 1. Initialize camera
  const camera = createCamera({
    resolution: "1080p",
    mode: "both",
    onCapture: (media) => {
      console.log(`Captured ${media.kind}:`, media.blob);
      // Integrate with host application (e.g. video editor or upload API)
      editor.addMedia(media.file);
    },
    onError: (err) => {
      console.error("Camera error:", err.message);
    },
  });

  // 2. Attach preview and open camera
  camera.attachPreview(videoElement);
  await camera.open();

  // 3. Take a photo
  document.getElementById("capture-btn").addEventListener("click", async () => {
    const photo = await camera.capturePhoto({ mimeType: "image/jpeg", quality: 0.95 });
    console.log("Photo captured:", photo.width, photo.height);
  });

  // 4. Start recording video
  document.getElementById("record-btn").addEventListener("click", () => {
    camera.startRecording({ maxDuration: 60 });
  });

  // 5. Stop recording
  document.getElementById("stop-btn").addEventListener("click", async () => {
    const video = await camera.stopRecording();
    console.log("Recorded video duration:", video.duration, "MIME:", video.mimeType);
  });
</script>
```

---

## 5. Host Application Integration (Video Editor Example)

A consuming application receives captured media through `onCapture` or direct method return and handles its own imports:

```javascript
import { createCamera } from "media-capture-sdk";

const camera = createCamera({
  mode: "video",
  audio: true,
  resolution: "1080p",
  onCapture: (mediaResult) => {
    // Pass standard File or Blob to host application editor
    myVideoEditor.timeline.insertClip({
      file: mediaResult.file,
      duration: mediaResult.duration,
      width: mediaResult.width,
      height: mediaResult.height,
    });

    // Cleanup managed URL when consumer is done
    // mediaResult.revokeUrl();
  },
});

await camera.open();
```

---

## 6. Public API Reference

### `createCamera(options)`
Instantiates a `CameraController`.

#### Options:
- `mode` (`'photo' | 'video' | 'both'`): Default `'both'`.
- `video` (`boolean | MediaTrackConstraints`): Default `true`.
- `audio` (`boolean | MediaTrackConstraints`): Default `false`.
- `deviceId` (`string`): Target video input device ID.
- `facingMode` (`'user' | 'environment'`): Camera facing mode.
- `resolution` (`'480p' | '720p' | '1080p' | '4k' | { width, height }`): Resolution constraint.
- `frameRate` (`number`): Target frame rate.
- `previewElement` (`HTMLVideoElement`): Video element to attach automatically.
- `onCapture` (`(media: MediaResult) => void`): Callback on photo capture or video recording completion.
- `onError` (`(error: MediaCaptureError) => void`): Callback on errors.
- `onStateChange` (`(state: CameraLifecycleState) => void`): Callback on lifecycle state change.

#### CameraController Methods:
- `await camera.open()`: Requests permission and starts camera stream.
- `camera.attachPreview(videoEl)`: Attaches live stream to `<video>`.
- `camera.detachPreview()`: Detaches stream from `<video>`.
- `await camera.switchCamera(target)`: Switches to device ID or `'user'` / `'environment'`.
- `await camera.getCameras()`: Returns list of available cameras `{ deviceId, label }`.
- `await camera.getMicrophones()`: Returns list of available microphones `{ deviceId, label }`.
- `await camera.capturePhoto(options)`: Captures still photo. Returns `Promise<MediaResult>`.
- `await camera.captureScreenshot(options)`: Captures preview screenshot. Returns `Promise<MediaResult>`.
- `camera.startRecording(options)`: Begins recording video.
- `camera.pauseRecording()`: Pauses active recording.
- `camera.resumeRecording()`: Resumes paused recording.
- `await camera.stopRecording()`: Stops recording. Returns `Promise<MediaResult>`.
- `camera.close()`: Stops active stream tracks and detaches preview.
- `camera.dispose()`: Closes stream, cleans timers, unregisters all event listeners.

---

### `createScreenCapture(options)`
Instantiates a `ScreenCaptureController` for display/tab capture.

```javascript
import { createScreenCapture } from "media-capture-sdk";

const screen = createScreenCapture({
  video: true,
  audio: false,
  onCapture: (media) => {
    console.log("Screen capture recorded:", media.file);
  },
});

await screen.startCapture();
screen.startRecording();
// ...
const result = await screen.stopRecording();
screen.dispose();
```

---

### `MediaResult` Contract
The standardized media output contract returned by capture operations:

| Property | Type | Description |
|---|---|---|
| `blob` | `Blob` | Raw binary media data |
| `file` | `File` | Standard Web File object with timestamped filename |
| `kind` | `'photo' \| 'video' \| 'screenshot'` | Kind of media |
| `mimeType` | `string` | Actual output MIME type (e.g. `video/webm;codecs=vp9,opus`) |
| `width` | `number` | Width in pixels (when available) |
| `height` | `number` | Height in pixels (when available) |
| `duration` | `number` | Duration in seconds (video only) |
| `size` | `number` | File size in bytes |
| `timestamp` | `Date` | Capture timestamp |
| `url` | `string` | Lazy managed Object URL via `URL.createObjectURL` |
| `revokeUrl()` | `() => void` | Explicitly releases the generated Object URL |
| `download(filename?)` | `(filename?) => void` | Triggers a browser file download |

---

## 7. Ready-to-Use UI (`media-capture-sdk/ui`)

```javascript
import { createCameraUI } from "media-capture-sdk/ui";
import "media-capture-sdk/ui/styles.css";

const widget = createCameraUI(document.getElementById("camera-container"), {
  mode: "both",
  showCameraSelect: true,
  showFilterSelect: true,
  onCapture: (media) => {
    console.log("Captured media:", media);
  },
});

// To unmount:
// widget.unmount();
```

---

## 8. Visual Filters (`media-capture-sdk/filters`)

```javascript
import { FILTER_PRESETS, getFilterCss } from "media-capture-sdk/filters";

// Available presets: none, grayscale, sepia, blur, highContrast, brightness, darken, invert, vintage, warm, cool, dramatic
camera.capturePhoto({
  filter: FILTER_PRESETS.vintage,
});
```

---

## 9. React & Next.js Integration (`media-capture-sdk/react`)

```jsx
import React from "react";
import { useCamera, CameraCaptureView } from "media-capture-sdk/react";

export function CustomCamera() {
  const {
    previewRef,
    open,
    close,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
    duration,
  } = useCamera({
    mode: "both",
    onCapture: (media) => console.log("Captured:", media.file),
  });

  return (
    <div>
      <video ref={previewRef} autoPlay playsInline muted />
      <button onClick={() => open()}>Open Camera</button>
      <button onClick={() => capturePhoto()}>Take Photo</button>
      {!isRecording ? (
        <button onClick={() => startRecording()}>Record Video</button>
      ) : (
        <button onClick={() => stopRecording()}>Stop ({Math.floor(duration)}s)</button>
      )}
      <button onClick={() => close()}>Close</button>
    </div>
  );
}
```

### Next.js Client Component Notice
Because camera access requires the browser DOM, mark your component with `'use client';`:

```jsx
'use client';
import { useCamera } from "media-capture-sdk/react";
// ...
```

---

## 10. Error Handling

All errors thrown or emitted inherit from `MediaCaptureError`:

```javascript
import {
  PermissionDeniedError,
  DeviceNotFoundError,
  DeviceNotReadableError,
  NotSupportedError,
  UserCancelledError,
  RecordingError,
} from "media-capture-sdk";

try {
  await camera.open();
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    alert("Camera permission was denied. Please allow camera access in your browser settings.");
  } else if (err instanceof DeviceNotFoundError) {
    alert("No camera device found on this system.");
  } else if (err instanceof DeviceNotReadableError) {
    alert("Camera is in use by another application.");
  }
}
```

---

## 11. Testing

```bash
# Run unit and packaging tests
npm test

# Run real-browser integration tests with Playwright
npm run test:browser

# Run all tests
npm run test:all
```

---

## 12. License

MIT License. Copyright (c) 2026 Media Capture SDK Contributors.
