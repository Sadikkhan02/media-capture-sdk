/**
 * Standard Error Classes for Media Capture SDK
 */

export class MediaCaptureError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {Error|DOMException|null} [originalError]
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, code = "MEDIA_CAPTURE_ERROR", originalError = null, details = {}) {
    super(message);
    this.name = "MediaCaptureError";
    this.code = code;
    this.originalError = originalError;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class PermissionDeniedError extends MediaCaptureError {
  constructor(message = "Camera or microphone permission was denied by the user or browser.", originalError = null, details = {}) {
    super(message, "PERMISSION_DENIED", originalError, details);
    this.name = "PermissionDeniedError";
  }
}

export class DeviceNotFoundError extends MediaCaptureError {
  constructor(message = "No matching camera or audio input device found.", originalError = null, details = {}) {
    super(message, "DEVICE_NOT_FOUND", originalError, details);
    this.name = "DeviceNotFoundError";
  }
}

export class DeviceNotReadableError extends MediaCaptureError {
  constructor(message = "The camera or audio device is already in use by another application or cannot be accessed.", originalError = null, details = {}) {
    super(message, "DEVICE_NOT_READABLE", originalError, details);
    this.name = "DeviceNotReadableError";
  }
}

export class NotSupportedError extends MediaCaptureError {
  constructor(message = "The requested browser API, recording codec, or constraint is not supported in this browser.", originalError = null, details = {}) {
    super(message, "NOT_SUPPORTED", originalError, details);
    this.name = "NotSupportedError";
  }
}

export class UserCancelledError extends MediaCaptureError {
  constructor(message = "User cancelled the screen or media selection.", originalError = null, details = {}) {
    super(message, "USER_CANCELLED", originalError, details);
    this.name = "UserCancelledError";
  }
}

export class RecordingError extends MediaCaptureError {
  constructor(message = "An error occurred during media recording.", originalError = null, details = {}) {
    super(message, "RECORDING_ERROR", originalError, details);
    this.name = "RecordingError";
  }
}

export class InvalidStateError extends MediaCaptureError {
  constructor(message = "The operation cannot be performed in the current lifecycle state.", originalError = null, details = {}) {
    super(message, "INVALID_STATE", originalError, details);
    this.name = "InvalidStateError";
  }
}

export class ConfigurationError extends MediaCaptureError {
  constructor(message = "Invalid configuration options or overconstrained media settings.", originalError = null, details = {}) {
    super(message, "CONFIGURATION_ERROR", originalError, details);
    this.name = "ConfigurationError";
  }
}

/**
 * Normalizes any native DOMException or unknown error into a structured MediaCaptureError.
 * @param {unknown} error
 * @param {string} [contextMessage]
 * @returns {MediaCaptureError}
 */
export function parseMediaError(error, contextMessage = "") {
  if (error instanceof MediaCaptureError) {
    return error;
  }

  const errName = error?.name || "";
  const errMsg = error?.message || String(error);
  const prefix = contextMessage ? `${contextMessage}: ` : "";

  switch (errName) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return new PermissionDeniedError(`${prefix}Permission denied: ${errMsg}`, error);

    case "NotFoundError":
    case "DevicesNotFoundError":
      return new DeviceNotFoundError(`${prefix}Device not found: ${errMsg}`, error);

    case "NotReadableError":
    case "TrackStartError":
      return new DeviceNotReadableError(`${prefix}Device not readable or in use: ${errMsg}`, error);

    case "OverconstrainedError":
      return new ConfigurationError(`${prefix}Media constraints could not be satisfied: ${errMsg}`, error, {
        constraint: error?.constraint,
      });

    case "AbortError":
      return new UserCancelledError(`${prefix}Operation aborted or cancelled: ${errMsg}`, error);

    case "NotSupportedError":
      return new NotSupportedError(`${prefix}Feature not supported: ${errMsg}`, error);

    case "TypeError":
      return new ConfigurationError(`${prefix}Invalid argument or configuration: ${errMsg}`, error);

    default:
      return new MediaCaptureError(`${prefix}${errMsg}`, "UNKNOWN_ERROR", error);
  }
}
