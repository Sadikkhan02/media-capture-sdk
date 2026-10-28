# Architecture & Technical Design Document

## Media Capture SDK (`media-capture-sdk`)
Version: 1.0.0
Date: October 2026

---

## 1. Executive Architecture Overview

`media-capture-sdk` is an unopinionated, client-side, framework-independent JavaScript SDK for browser camera access, live video preview, photo capture, video recording, screen capture, and visual filters.

### Key Architectural Tenets:
1. **Zero Backend Coupling:** Operates entirely client-side. Emits standard `MediaResult` objects containing raw `Blob` and `File` objects. Does not implement storage, uploads, databases, or business logic.
2. **Framework Independence:** Core functionality is implemented in standard ES2022 JavaScript with zero external runtime dependencies.
3. **Safe SSR / Next.js Ready:** All modules are guarded against `window` / `navigator` execution during server-side rendering. Submodules can be imported safely in Node.js/Next.js without throwing `ReferenceError`.
4. **Reliable Lifecycle & Resource Cleanup:** Explicit lifecycle methods (`open()`, `startRecording()`, `stopRecording()`, `capturePhoto()`, `close()`, `dispose()`). All MediaStream tracks (`getTracks().forEach(t => t.stop())`), event listeners, canvas contexts, and generated Object URLs are tracked and released deterministically.
5. **Decoupled Extensions:** Screen capture and visual filters exist as modular subpath exports (`media-capture-sdk/filters`, `media-capture-sdk/ui`, `media-capture-sdk/react`), preventing bundle bloat for consumers who only need the headless core camera.

---

## 2. Package Architecture & Subpath Exports

We use a single npm package with subpath exports defined in `package.json`:

| Subpath Export | Target Entry | Description |
|---|---|---|
| `media-capture-sdk` | `dist/index.js` | Headless Core: `createCamera`, `createScreenCapture`, `MediaCaptureError`, device utils |
| `media-capture-sdk/ui` | `dist/ui/index.js` | Ready-to-use DOM UI component & styles (`createCameraUI`) |
| `media-capture-sdk/filters`| `dist/filters/index.js`| Filter presets (grayscale, sepia, blur, etc.) & canvas filter pipeline |
| `media-capture-sdk/react` | `dist/react/index.js` | React integration (`useCamera`, `useScreenCapture`, `<CameraCaptureView />`) |

### Dual Build (ESM + CommonJS) & TypeScript Support:
- Built using `tsup` targeting both ESM (`import`) and CJS (`require`).
- TypeScript declaration files (`.d.ts`) provided alongside every entry point so TypeScript consumers get full autocompletion without needing manual typings.

---

## 3. Core Subsystems

### 3.1 Device & Capability Detection (`src/core/devices.js`)
- Feature detection for `navigator.mediaDevices`, `navigator.mediaDevices.getUserMedia`, `navigator.mediaDevices.getDisplayMedia`, and `window.MediaRecorder`.
- Device enumeration: `enumerateCameras()` and `enumerateMicrophones()`.
- Device change listeners (`navigator.mediaDevices.ondevicechange`).
- Permission status detection via `navigator.permissions.query({ name: 'camera' })` where supported.

### 3.2 Camera Controller (`src/core/camera.js`)
- Manages `MediaStream` acquisition via `getUserMedia`.
- Configurable constraints: `deviceId`, `facingMode` (`'user'` | `'environment'`), `resolution` (`'720p'`, `'1080p'`, `'4k'`, or custom `{ width, height }`), `frameRate`, and `audio` (`boolean` or `MediaTrackConstraints`).
- Attaches to HTML `<video>` preview elements with appropriate attributes (`autoplay`, `playsInline`, `muted`).
- Seamless camera switching without tearing down consumer UI.
- Lifecycle states: `idle` -> `opening` -> `ready` -> `recording` / `paused` -> `closed` -> `disposed`.

### 3.3 MediaRecorder Controller (`src/core/recorder.js`)
- Automatic MIME type negotiation (`video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`, `video/webm`, `video/mp4;codecs=avc1,mp4a`, `video/mp4`).
- Handles `start()`, `pause()`, `resume()`, `stop()`.
- Max duration timer and max size monitoring (`ondataavailable` chunk accumulation).
- Emits real recording metrics (actual duration elapsed, chunk bytes, actual mimeType).

### 3.4 Photo & Screenshot Capture (`src/core/photo.js`)
- Captures uncompressed video frame onto an in-memory `<canvas>` matching video's native `videoWidth` and `videoHeight`.
- Encodes to `image/jpeg`, `image/png`, or `image/webp` with user-specified quality (0.0 to 1.0).
- Applies active visual filters to the canvas context prior to export if configured.
- Returns a structured `MediaResult` with width, height, mimeType, blob, and timestamp.

### 3.5 Screen Capture (`src/core/screen.js`)
- Wraps `navigator.mediaDevices.getDisplayMedia`.
- Distinct from camera capture; handles user cancellation gracefully (e.g. `AbortError` or user closing browser screen picker).
- Detects track `ended` events (when user clicks browser native "Stop Sharing" bar) and triggers graceful cleanup.

### 3.6 Media Result Contract (`src/core/media-result.js`)
- Standardized object structure:
  ```ts
  interface MediaResult {
    blob: Blob;
    file: File;
    kind: 'photo' | 'video' | 'screenshot';
    mimeType: string;
    width?: number;
    height?: number;
    duration?: number; // In seconds (for video)
    url: string;       // Object URL (managed)
    revokeUrl(): void; // Revokes the object URL
    download(filename?: string): void;
  }
  ```
- Safe URL management: Consumers can call `mediaResult.revokeUrl()` when done, or rely on auto-revocation when camera is disposed if specified.

### 3.7 Error Hierarchy (`src/core/errors.js`)
- `MediaCaptureError` (Base class)
  - `PermissionDeniedError` (`NotAllowedError`, `PermissionDeniedError`)
  - `DeviceNotFoundError` (`NotFoundError`, `DevicesNotFoundError`)
  - `DeviceNotReadableError` (`NotReadableError`, `TrackStartError`)
  - `NotSupportedError` (missing APIs, unsupported mimeType)
  - `UserCancelledError` (cancelled screen pick)
  - `RecordingError` (MediaRecorder runtime errors)
  - `InvalidStateError` (calling methods in wrong lifecycle phase)
  - `ConfigurationError` (invalid options)

---

## 4. UI & React Integrations

- **Vanilla UI (`src/ui/`):** Lightweight, accessible HTML5/CSS capture widget. Mountable to any container element. Features live preview, recording timer, shutter/record button, switch camera dropdown, and snapshot thumbnail preview.
- **React Adapter (`src/react/`):** Clean hook `useCamera(options)` managing component mount/unmount stream lifecycle safely, plus `<CameraCaptureView />` UI component.

---

## 5. Security & Privacy Guarantees
- Zero telemetry, zero external network requests, zero storage.
- Requires Secure Context (`https://` or `localhost`).
- Explicit stream track termination on every cleanup phase.
