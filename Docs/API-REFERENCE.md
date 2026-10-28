# Media Capture SDK — Complete API Reference

Version: 1.0.0

---

## Table of Contents
1. [Core Factory & Controller](#1-core-factory--controller)
2. [MediaResult Contract](#2-mediaresult-contract)
3. [Screen Capture](#3-screen-capture)
4. [Stream Recorder](#4-stream-recorder)
5. [Device Management & Utilities](#5-device-management--utilities)
6. [Error Hierarchy](#6-error-hierarchy)
7. [DOM UI Widget (`media-capture-sdk/ui`)](#7-dom-ui-widget)
8. [Visual Filters (`media-capture-sdk/filters`)](#8-visual-filters)
9. [React Adapter (`media-capture-sdk/react`)](#9-react-adapter)

---

## 1. Core Factory & Controller

### `createCamera(options?: CameraOptions): CameraController`
Creates an instance of `CameraController`.

#### `CameraOptions`
| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'video' \| 'photo' \| 'both'` | `'both'` | Capture mode |
| `video` | `boolean \| MediaTrackConstraints` | `true` | Video constraints |
| `audio` | `boolean \| MediaTrackConstraints` | `false` | Audio constraints |
| `deviceId` | `string` | `undefined` | Specific device ID to open |
| `facingMode` | `'user' \| 'environment'` | `undefined` | Mobile camera direction |
| `resolution` | `'480p' \| '720p' \| '1080p' \| '4k' \| { width, height }` | `undefined` | Resolution preset or dimensions |
| `frameRate` | `number` | `undefined` | Ideal video frame rate |
| `previewElement` | `HTMLVideoElement` | `undefined` | Initial preview element |
| `onCapture` | `(media: MediaResult) => void` | `undefined` | Called on photo capture or video stop |
| `onError` | `(error: MediaCaptureError) => void` | `undefined` | Called on capture errors |
| `onStateChange` | `(state: CameraLifecycleState) => void` | `undefined` | State transition listener |

#### Lifecycle States (`CameraLifecycleState`)
- `'idle'`: Controller created, no active stream.
- `'opening'`: Permission requested / acquiring stream.
- `'ready'`: Live camera preview active.
- `'recording'`: Video recording currently running.
- `'paused'`: Video recording paused.
- `'closed'`: Stream tracks stopped, preview detached.
- `'disposed'`: All listeners, timers, and resources destroyed.

#### Methods
- `open(): Promise<MediaStream>`
  Requests permission and initializes camera stream.
- `attachPreview(videoElement: HTMLVideoElement): void`
  Attaches live stream with `autoplay`, `playsInline`, `muted`.
- `detachPreview(): void`
  Clears preview video `srcObject`.
- `switchCamera(target: string | { deviceId?: string; facingMode?: 'user' | 'environment' }): Promise<MediaStream>`
  Switches active hardware camera device.
- `capturePhoto(options?: PhotoCaptureOptions): Promise<MediaResult>`
  Captures current video frame to canvas.
- `captureScreenshot(options?: PhotoCaptureOptions): Promise<MediaResult>`
  Captures screenshot of preview element.
- `startRecording(options?: RecordingOptions): void`
  Starts recording video stream.
- `pauseRecording(): void`
  Pauses recording.
- `resumeRecording(): void`
  Resumes paused recording.
- `stopRecording(): Promise<MediaResult>`
  Stops recording and returns assembled media result.
- `close(): void`
  Stops all stream tracks.
- `dispose(): void`
  Cleans all resources and listeners.

---

## 2. MediaResult Contract

Standardized result returned by all captures:

```typescript
class MediaResult {
  readonly blob: Blob;
  readonly file: File;
  readonly kind: 'photo' | 'video' | 'screenshot';
  readonly mimeType: string;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number; // In seconds (video only)
  readonly size: number;      // Bytes
  readonly timestamp: Date;
  readonly defaultFilename: string;
  readonly metadata: Record<string, unknown>;

  get url(): string;          // Lazy Object URL
  revokeUrl(): void;          // Explicit memory release
  arrayBuffer(): Promise<ArrayBuffer>;
  toDataURL(): Promise<string>;
  download(filename?: string): void;
}
```

---

## 3. Screen Capture

### `createScreenCapture(options?: ScreenCaptureOptions): ScreenCaptureController`

```typescript
interface ScreenCaptureOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  displaySurface?: 'screen' | 'window' | 'tab';
  onCapture?: (media: MediaResult) => void;
  onError?: (error: Error) => void;
}
```

Methods:
- `startCapture(constraints?): Promise<MediaStream>`
- `attachPreview(videoEl): void`
- `startRecording(options?): void`
- `pauseRecording(): void`
- `resumeRecording(): void`
- `stopRecording(): Promise<MediaResult>`
- `stop(): void`
- `dispose(): void`

---

## 4. Device Management & Utilities

- `getCameras(): Promise<MediaDeviceInfoSummary[]>`
- `getMicrophones(): Promise<MediaDeviceInfoSummary[]>`
- `getMediaDevices(): Promise<MediaDeviceInfo[]>`
- `getPermissionStatus(name?): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'>`
- `onDeviceChange(callback): () => void`
- `checkBrowserCapabilities(): { isBrowser, isSecureContext, hasMediaDevices, hasGetUserMedia, hasGetDisplayMedia, hasMediaRecorder }`
- `getSupportedVideoMimeTypes(): string[]`
- `getBestSupportedMimeType(preferredType?): string`
- `formatDuration(seconds: number): string`

---

## 5. Error Hierarchy

All errors inherit from `MediaCaptureError`:
- `PermissionDeniedError`: User or browser denied camera/microphone access (`PERMISSION_DENIED`).
- `DeviceNotFoundError`: Requested device was not found (`DEVICE_NOT_FOUND`).
- `DeviceNotReadableError`: Hardware device in use or hardware error (`DEVICE_NOT_READABLE`).
- `NotSupportedError`: Browser lacks required API or codec (`NOT_SUPPORTED`).
- `UserCancelledError`: User cancelled screen sharing prompt (`USER_CANCELLED`).
- `RecordingError`: MediaRecorder runtime failure (`RECORDING_ERROR`).
- `InvalidStateError`: Operation attempted in invalid lifecycle state (`INVALID_STATE`).
- `ConfigurationError`: Overconstrained settings or invalid parameters (`CONFIGURATION_ERROR`).
