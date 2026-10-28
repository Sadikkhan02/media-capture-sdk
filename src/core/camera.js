import { EventEmitter } from "./events.js";
import { StreamRecorder } from "./recorder.js";
import { capturePhotoFromVideo } from "./photo.js";
import { getCameras, getMicrophones, onDeviceChange } from "./devices.js";
import { isBrowser } from "./utils.js";
import {
  InvalidStateError,
  NotSupportedError,
  parseMediaError,
} from "./errors.js";

/**
 * @typedef {'idle' | 'opening' | 'ready' | 'recording' | 'paused' | 'closed' | 'disposed'} CameraLifecycleState
 */

/**
 * Standard resolution presets mapped to constraints
 */
export const RESOLUTION_PRESETS = {
  "480p": { width: { ideal: 640 }, height: { ideal: 480 } },
  "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
  "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } },
  "4k": { width: { ideal: 3840 }, height: { ideal: 2160 } },
};

/**
 * @typedef {Object} CameraOptions
 * @property {'video' | 'photo' | 'both'} [mode='both']
 * @property {boolean | MediaTrackConstraints} [video=true]
 * @property {boolean | MediaTrackConstraints} [audio=false]
 * @property {string} [deviceId] Target video deviceId
 * @property {'user' | 'environment'} [facingMode]
 * @property {'480p' | '720p' | '1080p' | '4k' | { width: number; height: number }} [resolution]
 * @property {number} [frameRate]
 * @property {HTMLVideoElement} [previewElement] Initial video element to attach
 * @property {(media: import('./media-result.js').MediaResult) => void} [onCapture]
 * @property {(error: Error) => void} [onError]
 * @property {(state: CameraLifecycleState) => void} [onStateChange]
 */

export class CameraController extends EventEmitter {
  /**
   * @param {CameraOptions} [options={}]
   */
  constructor(options = {}) {
    super();

    this.options = {
      mode: "both",
      video: true,
      audio: false,
      ...options,
    };

    /** @type {CameraLifecycleState} */
    this.state = "idle";
    /** @type {MediaStream | null} */
    this.stream = null;
    /** @type {HTMLVideoElement | null} */
    this.previewElement = null;
    /** @type {StreamRecorder | null} */
    this.recorder = null;
    /** @type {string | null} */
    this._currentDeviceId = options.deviceId || null;
    /** @type {'user' | 'environment' | null} */
    this._currentFacingMode = options.facingMode || null;
    /** @type {() => void | null} */
    this._unsubscribeDeviceChange = null;

    if (this.options.onCapture) this.on("capture", this.options.onCapture);
    if (this.options.onError) this.on("error", this.options.onError);
    if (this.options.onStateChange) this.on("statechange", this.options.onStateChange);

    if (this.options.previewElement) {
      this.attachPreview(this.options.previewElement);
    }

    // Subscribe to hardware device changes
    this._unsubscribeDeviceChange = onDeviceChange((devices) => {
      this.emit("devicechange", devices);
    });
  }

  /**
   * Builds MediaStreamConstraints from current options and active device/resolution
   * @private
   */
  _buildConstraints() {
    let videoConstraints = {};

    if (typeof this.options.video === "object") {
      videoConstraints = { ...this.options.video };
    } else if (this.options.video === true) {
      videoConstraints = {};
    } else {
      videoConstraints = false;
    }

    if (videoConstraints !== false) {
      if (this._currentDeviceId) {
        videoConstraints.deviceId = { exact: this._currentDeviceId };
      } else if (this._currentFacingMode) {
        videoConstraints.facingMode = this._currentFacingMode;
      }

      if (this.options.resolution) {
        if (typeof this.options.resolution === "string" && RESOLUTION_PRESETS[this.options.resolution]) {
          Object.assign(videoConstraints, RESOLUTION_PRESETS[this.options.resolution]);
        } else if (typeof this.options.resolution === "object") {
          if (this.options.resolution.width) videoConstraints.width = { ideal: this.options.resolution.width };
          if (this.options.resolution.height) videoConstraints.height = { ideal: this.options.resolution.height };
        }
      }

      if (this.options.frameRate) {
        videoConstraints.frameRate = { ideal: this.options.frameRate };
      }
    }

    let audioConstraints = this.options.audio;
    if (this.options.mode === "photo") {
      // Photo-only capture does not need microphone access
      audioConstraints = false;
    }

    return {
      video: videoConstraints,
      audio: audioConstraints,
    };
  }

  /**
   * Sets new state and emits statechange event
   * @private
   */
  _setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.emit("statechange", newState, oldState);
  }

  /**
   * Requests camera permission and opens the media stream.
   * @returns {Promise<MediaStream>}
   */
  async open() {
    if (this.state === "disposed") {
      throw new InvalidStateError("Camera instance has been disposed.");
    }
    if (this.state === "ready" && this.stream && this.stream.active) {
      return this.stream;
    }

    if (!isBrowser() || !navigator.mediaDevices?.getUserMedia) {
      const err = new NotSupportedError("getUserMedia is not supported in this environment.");
      this.emit("error", err);
      throw err;
    }

    this._setState("opening");

    try {
      const constraints = this._buildConstraints();
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Cache deviceId from active track
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings?.() || {};
        if (settings.deviceId) this._currentDeviceId = settings.deviceId;
        if (settings.facingMode) this._currentFacingMode = /** @type {any} */ (settings.facingMode);

        // Listen for track ending (e.g. camera unplugged)
        videoTrack.onended = () => {
          this.emit("streamended");
          this.close();
        };
      }

      // Attach stream to preview element if already designated
      if (this.previewElement) {
        this.previewElement.srcObject = this.stream;
        this.previewElement.play().catch(() => {});
      }

      this._setState("ready");
      this.emit("stream", this.stream);
      return this.stream;
    } catch (err) {
      this._setState("closed");
      const parsed = parseMediaError(err, "Failed to open camera");
      this.emit("error", parsed);
      throw parsed;
    }
  }

  /**
   * Attaches live stream to an HTMLVideoElement.
   * @param {HTMLVideoElement} videoElement
   */
  attachPreview(videoElement) {
    if (!videoElement) {
      throw new InvalidStateError("Valid HTMLVideoElement must be provided to attachPreview.");
    }

    this.previewElement = videoElement;
    this.previewElement.autoplay = true;
    this.previewElement.playsInline = true;
    this.previewElement.muted = true; // Avoid feedback loop during preview

    if (this.stream) {
      this.previewElement.srcObject = this.stream;
      this.previewElement.play().catch(() => {});
    }
  }

  /**
   * Detaches stream from the currently attached HTMLVideoElement.
   */
  detachPreview() {
    if (this.previewElement) {
      this.previewElement.srcObject = null;
      this.previewElement = null;
    }
  }

  /**
   * Switches to a specific camera deviceId or facingMode.
   * @param {string | { deviceId?: string; facingMode?: 'user' | 'environment' }} target
   * @returns {Promise<MediaStream>}
   */
  async switchCamera(target) {
    if (this.state === "disposed") {
      throw new InvalidStateError("Camera instance has been disposed.");
    }

    if (typeof target === "string") {
      if (target === "user" || target === "environment") {
        this._currentFacingMode = target;
        this._currentDeviceId = null;
      } else {
        this._currentDeviceId = target;
        this._currentFacingMode = null;
      }
    } else if (typeof target === "object") {
      if (target.deviceId) {
        this._currentDeviceId = target.deviceId;
        this._currentFacingMode = null;
      } else if (target.facingMode) {
        this._currentFacingMode = target.facingMode;
        this._currentDeviceId = null;
      }
    }

    // Stop current tracks before switching
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      }
      this.stream = null;
    }

    return await this.open();
  }

  /**
   * Returns list of available cameras.
   */
  async getCameras() {
    return await getCameras();
  }

  /**
   * Returns list of available microphones.
   */
  async getMicrophones() {
    return await getMicrophones();
  }

  /**
   * Captures a still photo from the active preview.
   * @param {import('./photo.js').PhotoCaptureOptions} [options]
   * @returns {Promise<import('./media-result.js').MediaResult>}
   */
  async capturePhoto(options = {}) {
    if (!this.previewElement) {
      throw new InvalidStateError("Cannot capture photo: No preview element attached.");
    }
    if (this.state !== "ready" && this.state !== "recording" && this.state !== "paused") {
      throw new InvalidStateError(`Cannot capture photo in state: ${this.state}`);
    }

    try {
      const result = await capturePhotoFromVideo(this.previewElement, {
        ...options,
        kind: "photo",
      });
      this.emit("capture", result);
      return result;
    } catch (err) {
      const parsed = parseMediaError(err, "Photo capture failed");
      this.emit("error", parsed);
      throw parsed;
    }
  }

  /**
   * Captures a screenshot of the SDK preview element.
   * @param {import('./photo.js').PhotoCaptureOptions} [options]
   * @returns {Promise<import('./media-result.js').MediaResult>}
   */
  async captureScreenshot(options = {}) {
    if (!this.previewElement) {
      throw new InvalidStateError("Cannot capture screenshot: No preview element attached.");
    }
    try {
      const result = await capturePhotoFromVideo(this.previewElement, {
        ...options,
        kind: "screenshot",
      });
      this.emit("capture", result);
      return result;
    } catch (err) {
      const parsed = parseMediaError(err, "Screenshot capture failed");
      this.emit("error", parsed);
      throw parsed;
    }
  }

  /**
   * Starts recording video from the active camera stream.
   * @param {import('./recorder.js').RecordingOptions} [options]
   */
  startRecording(options = {}) {
    if (!this.stream || (this.state !== "ready" && this.state !== "paused")) {
      throw new InvalidStateError(`Cannot start recording in state: ${this.state}`);
    }

    this.recorder = new StreamRecorder(this.stream, options);

    this.recorder.on("start", () => {
      this._setState("recording");
      this.emit("recordStart");
    });
    this.recorder.on("pause", () => {
      this._setState("paused");
      this.emit("recordPause");
    });
    this.recorder.on("resume", () => {
      this._setState("recording");
      this.emit("recordResume");
    });
    this.recorder.on("progress", (data) => {
      this.emit("recordProgress", data);
    });
    this.recorder.on("error", (err) => {
      this.emit("error", err);
    });

    this.recorder.start(options);
  }

  /**
   * Pauses the active recording.
   */
  pauseRecording() {
    if (!this.recorder || this.state !== "recording") {
      throw new InvalidStateError(`Cannot pause recording in state: ${this.state}`);
    }
    this.recorder.pause();
  }

  /**
   * Resumes the paused recording.
   */
  resumeRecording() {
    if (!this.recorder || this.state !== "paused") {
      throw new InvalidStateError(`Cannot resume recording in state: ${this.state}`);
    }
    this.recorder.resume();
  }

  /**
   * Stops video recording and returns the MediaResult.
   * @returns {Promise<import('./media-result.js').MediaResult>}
   */
  async stopRecording() {
    if (!this.recorder || (this.state !== "recording" && this.state !== "paused")) {
      throw new InvalidStateError(`Cannot stop recording in state: ${this.state}`);
    }

    try {
      const result = await this.recorder.stop();
      this._setState(this.stream && this.stream.active ? "ready" : "closed");
      this.emit("recordStop", result);
      this.emit("capture", result);
      return result;
    } catch (err) {
      this._setState(this.stream && this.stream.active ? "ready" : "closed");
      const parsed = parseMediaError(err, "Stop recording failed");
      this.emit("error", parsed);
      throw parsed;
    }
  }

  /**
   * Stops camera stream and releases all active tracks.
   */
  close() {
    if (this.state === "recording" || this.state === "paused") {
      if (this.recorder) {
        this.recorder.stop().catch(() => {});
      }
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      }
      this.stream = null;
    }

    if (this.previewElement) {
      this.previewElement.srcObject = null;
    }

    this._setState("closed");
    this.emit("close");
  }

  /**
   * Fully disposes of the camera controller, unregisters all listeners and timers.
   */
  dispose() {
    this.close();

    if (this.recorder) {
      this.recorder.dispose();
      this.recorder = null;
    }

    if (this._unsubscribeDeviceChange) {
      this._unsubscribeDeviceChange();
      this._unsubscribeDeviceChange = null;
    }

    this._setState("disposed");
    this.removeAllListeners();
  }

  get isRecording() {
    return this.state === "recording";
  }

  get isPaused() {
    return this.state === "paused";
  }

  get isActive() {
    return Boolean(this.stream && this.stream.active);
  }

  getStream() {
    return this.stream;
  }

  getVideoElement() {
    return this.previewElement;
  }
}

/**
 * Factory function to instantiate a camera controller.
 * @param {CameraOptions} [options]
 * @returns {CameraController}
 */
export function createCamera(options) {
  return new CameraController(options);
}
