/**
 * Utility functions and environment guards
 */

/**
 * Checks if running in a client-side browser environment.
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

/**
 * Checks if the current execution context is secure (HTTPS or localhost).
 * @returns {boolean}
 */
export function isSecureContext() {
  if (!isBrowser()) return false;
  if (typeof window.isSecureContext === "boolean") {
    return window.isSecureContext;
  }
  const hostname = window.location?.hostname || "";
  return (
    window.location?.protocol === "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Comprehensive browser media capability detection
 * @returns {{
 *   isBrowser: boolean;
 *   isSecureContext: boolean;
 *   hasMediaDevices: boolean;
 *   hasGetUserMedia: boolean;
 *   hasGetDisplayMedia: boolean;
 *   hasMediaRecorder: boolean;
 * }}
 */
export function checkBrowserCapabilities() {
  const browser = isBrowser();
  if (!browser) {
    return {
      isBrowser: false,
      isSecureContext: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasGetDisplayMedia: false,
      hasMediaRecorder: false,
    };
  }

  const nav = navigator;
  const hasMediaDevices = Boolean(nav && nav.mediaDevices);
  const hasGetUserMedia = Boolean(hasMediaDevices && typeof nav.mediaDevices.getUserMedia === "function");
  const hasGetDisplayMedia = Boolean(hasMediaDevices && typeof nav.mediaDevices.getDisplayMedia === "function");
  const hasMediaRecorder = typeof window.MediaRecorder === "function";

  return {
    isBrowser: true,
    isSecureContext: isSecureContext(),
    hasMediaDevices,
    hasGetUserMedia,
    hasGetDisplayMedia,
    hasMediaRecorder,
  };
}

/**
 * Candidate recording MIME types in order of preference
 */
export const CANDIDATE_RECORDING_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

/**
 * Returns a list of recording MIME types supported by the current browser.
 * @returns {string[]}
 */
export function getSupportedVideoMimeTypes() {
  if (!isBrowser() || typeof window.MediaRecorder !== "function") {
    return [];
  }
  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return [];
  }

  return CANDIDATE_RECORDING_MIME_TYPES.filter((mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });
}

/**
 * Determines the best supported MIME type given an optional preferred format.
 * @param {string} [preferredMimeType]
 * @returns {string}
 */
export function getBestSupportedMimeType(preferredMimeType) {
  if (
    preferredMimeType &&
    isBrowser() &&
    typeof MediaRecorder?.isTypeSupported === "function" &&
    MediaRecorder.isTypeSupported(preferredMimeType)
  ) {
    return preferredMimeType;
  }

  const supported = getSupportedVideoMimeTypes();
  if (supported.length > 0) {
    return supported[0];
  }

  // Fallback default
  return "video/webm";
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS string
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const paddedM = String(mins).padStart(2, "0");
  const paddedS = String(secs).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${paddedM}:${paddedS}`;
  }
  return `${paddedM}:${paddedS}`;
}

/**
 * Clamps a number between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
