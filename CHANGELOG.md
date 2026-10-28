# Changelog

All notable changes to `media-capture-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-28

### Added
- **Core Camera Management (`CameraController`, `createCamera`):**
  - Live camera preview with resolution presets (`480p`, `720p`, `1080p`, `4k`, custom).
  - Physical camera enumeration and device switching (`switchCamera`).
  - Safe stream lifecycle management (`open`, `close`, `dispose`) and track cleanup.
- **Still Photo & Screenshot Capture (`capturePhotoFromVideo`):**
  - Uncompressed canvas frame capture with configurable format (`image/jpeg`, `image/png`, `image/webp`), quality, mirroring, and filters.
  - SDK preview screenshot capture (`captureScreenshot`).
- **Video Recording (`StreamRecorder`):**
  - Full MediaRecorder wrapper with automated format negotiation (VP9, VP8, H264, WebM, MP4).
  - Pause, resume, stop controls.
  - Max duration and max size byte limits.
  - Periodic duration/progress emission.
- **Screen & Display Capture (`ScreenCaptureController`, `createScreenCapture`):**
  - Display surface capture (`getDisplayMedia`) with user cancellation and track termination handling.
  - Recording support for screen streams.
- **Media Result Contract (`MediaResult`):**
  - Standardized result format containing raw `Blob`, standard `File`, MIME type, dimensions, duration, and managed Object URLs with explicit cleanup (`revokeUrl()`).
- **Error Model (`MediaCaptureError`):**
  - Complete error hierarchy (`PermissionDeniedError`, `DeviceNotFoundError`, `DeviceNotReadableError`, `NotSupportedError`, `UserCancelledError`, `RecordingError`, `InvalidStateError`, `ConfigurationError`).
  - DOMException error parser (`parseMediaError`).
- **Visual Filters Module (`media-capture-sdk/filters`):**
  - Built-in presets (`grayscale`, `sepia`, `blur`, `contrast`, `invert`, `vintage`, `warm`, `cool`, `dramatic`).
  - Real-time `FilteredStreamProcessor` using canvas stream capture.
- **DOM UI Module (`media-capture-sdk/ui`):**
  - Accessible, scoped camera capture widget (`createCameraUI`).
  - Mode switching tabs, camera selector, filter selector, shutter/record button, timer badge, and error notifications.
- **React Adapter (`media-capture-sdk/react`):**
  - SSR-safe hooks `useCamera()` and `useScreenCapture()`.
  - Ready-to-use `<CameraCaptureView />` component with zero SSR breakage.
- **Developer Documentation & Examples:**
  - Architecture specifications, API reference, browser compatibility matrix, publishing checklist, troubleshooting guide.
  - Vanilla JS, React, and Next.js client examples.
