import { isBrowser } from "./utils.js";
import { NotSupportedError, parseMediaError } from "./errors.js";

/**
 * @typedef {Object} MediaDeviceInfoSummary
 * @property {string} deviceId
 * @property {string} label
 * @property {string} kind
 * @property {string} groupId
 */

/**
 * Enumerates all media input/output devices.
 * Note: device labels are only populated by the browser after camera/microphone
 * permission has been granted at least once.
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function getMediaDevices() {
  if (!isBrowser() || !navigator.mediaDevices?.enumerateDevices) {
    throw new NotSupportedError("enumerateDevices() is not supported in this environment.");
  }
  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch (err) {
    throw parseMediaError(err, "Failed to enumerate media devices");
  }
}

/**
 * Returns available video input devices (cameras).
 * @returns {Promise<MediaDeviceInfoSummary[]>}
 */
export async function getCameras() {
  const devices = await getMediaDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
      kind: device.kind,
      groupId: device.groupId,
    }));
}

/**
 * Returns available audio input devices (microphones).
 * @returns {Promise<MediaDeviceInfoSummary[]>}
 */
export async function getMicrophones() {
  const devices = await getMediaDevices();
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
      kind: device.kind,
      groupId: device.groupId,
    }));
}

/**
 * Queries camera or microphone permission status via the Permissions API where supported.
 * Returns 'granted' | 'prompt' | 'denied' | 'unsupported'.
 * @param {'camera' | 'microphone'} [permissionName='camera']
 * @returns {Promise<'granted' | 'prompt' | 'denied' | 'unsupported'>}
 */
export async function getPermissionStatus(permissionName = "camera") {
  if (!isBrowser() || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    // Note: permission descriptor name for camera is 'camera' in modern specs
    const status = await navigator.permissions.query({ name: /** @type {any} */ (permissionName) });
    return status.state;
  } catch {
    // Some browsers do not support { name: 'camera' } in permissions.query
    return "unsupported";
  }
}

/**
 * Listens for hardware device changes (e.g. webcam plugged in or unplugged).
 * @param {(devices: MediaDeviceInfo[]) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onDeviceChange(callback) {
  if (!isBrowser() || !navigator.mediaDevices?.addEventListener) {
    return () => {};
  }

  const handler = async () => {
    try {
      const devices = await getMediaDevices();
      callback(devices);
    } catch {
      // Ignore enumeration failure on devicechange
    }
  };

  navigator.mediaDevices.addEventListener("devicechange", handler);
  return () => {
    navigator.mediaDevices.removeEventListener("devicechange", handler);
  };
}
