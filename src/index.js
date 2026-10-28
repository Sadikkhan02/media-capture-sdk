/**
 * Media Capture SDK
 * Main Entry Point
 */

export { createCamera, CameraController, RESOLUTION_PRESETS } from "./core/camera.js";
export { createScreenCapture, ScreenCaptureController } from "./core/screen.js";
export { StreamRecorder } from "./core/recorder.js";
export { MediaResult } from "./core/media-result.js";
export { capturePhotoFromVideo } from "./core/photo.js";
export { createCameraUI, CameraUIWidget } from "./ui/camera-view.js";
export {
  getCameras,
  getMicrophones,
  getMediaDevices,
  getPermissionStatus,
  onDeviceChange,
} from "./core/devices.js";
export {
  checkBrowserCapabilities,
  getSupportedVideoMimeTypes,
  getBestSupportedMimeType,
  isBrowser,
  isSecureContext,
  formatDuration,
  CANDIDATE_RECORDING_MIME_TYPES,
} from "./core/utils.js";
export {
  MediaCaptureError,
  PermissionDeniedError,
  DeviceNotFoundError,
  DeviceNotReadableError,
  NotSupportedError,
  UserCancelledError,
  RecordingError,
  InvalidStateError,
  ConfigurationError,
  parseMediaError,
} from "./core/errors.js";
export { EventEmitter } from "./core/events.js";
