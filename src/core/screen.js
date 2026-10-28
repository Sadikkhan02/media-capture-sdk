import { EventEmitter } from "./events.js";
import { StreamRecorder } from "./recorder.js";
import { isBrowser } from "./utils.js";
import { InvalidStateError, NotSupportedError, parseMediaError, UserCancelledError } from "./errors.js";

/**
 * @typedef {Object} ScreenCaptureOptions
 * @property {boolean | MediaTrackConstraints} [video=true]
 * @property {boolean | MediaTrackConstraints} [audio=false]
 * @property {'screen' | 'window' | 'tab'} [displaySurface]
 * @property {(media: import('./media-result.js').MediaResult) => void} [onCapture]
 * @property {(error: Error) => void} [onError]
 */

export class ScreenCaptureController extends EventEmitter {
  /**
   * @param {ScreenCaptureOptions} [options={}]
   */
  constructor(options = {}) {
    super();
    this.options = { video: true, audio: false, ...options };

    /** @type {'idle' | 'capturing' | 'recording' | 'stopped'} */
    this.state = "idle";
    /** @type {MediaStream | null} */
    this.stream = null;
    /** @type {StreamRecorder | null} */
    this.recorder = null;
    /** @type {HTMLVideoElement | null} */
    this._previewElement = null;

    if (this.options.onCapture) this.on("capture", this.options.onCapture);
    if (this.options.onError) this.on("error", this.options.onError);
  }

  /**
   * Prompts user to select a screen, window, or tab and starts display capture.
   * @param {DisplayMediaStreamOptions} [customConstraints]
   * @returns {Promise<MediaStream>}
   */
  async startCapture(customConstraints) {
    if (!isBrowser() || !navigator.mediaDevices?.getDisplayMedia) {
      const err = new NotSupportedError("Screen capture (getDisplayMedia) is not supported in this browser.");
      this.emit("error", err);
      throw err;
    }

    if (this.state === "capturing" || this.state === "recording") {
      return this.stream;
    }

    const constraints = customConstraints || {
      video: this.options.video,
      audio: this.options.audio,
    };

    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.state = "capturing";

      // Listen for the user stopping screen share via native browser UI bar
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.emit("ended");
          this.stop();
        };
      }

      if (this._previewElement) {
        this._previewElement.srcObject = this.stream;
        this._previewElement.play().catch(() => {});
      }

      this.emit("start", this.stream);
      return this.stream;
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "NotAllowedError") {
        const cancelledErr = new UserCancelledError("User cancelled screen selection or permission was denied.", err);
        this.emit("error", cancelledErr);
        throw cancelledErr;
      }
      const parsed = parseMediaError(err, "Screen capture failed");
      this.emit("error", parsed);
      throw parsed;
    }
  }

  /**
   * Attaches the live display stream to a video element.
   * @param {HTMLVideoElement} videoElement
   */
  attachPreview(videoElement) {
    this._previewElement = videoElement;
    if (this._previewElement && this.stream) {
      this._previewElement.srcObject = this.stream;
      this._previewElement.play().catch(() => {});
    }
  }

  /**
   * Starts recording the active screen stream.
   * @param {import('./recorder.js').RecordingOptions} [options]
   */
  startRecording(options = {}) {
    if (!this.stream || this.state === "idle" || this.state === "stopped") {
      throw new InvalidStateError("Cannot start recording: No active screen capture stream.");
    }

    this.recorder = new StreamRecorder(this.stream, options);
    this.recorder.on("start", () => this.emit("recordStart"));
    this.recorder.on("pause", () => this.emit("recordPause"));
    this.recorder.on("resume", () => this.emit("recordResume"));
    this.recorder.on("progress", (data) => this.emit("recordProgress", data));
    this.recorder.on("error", (err) => this.emit("error", err));

    this.recorder.start(options);
    this.state = "recording";
  }

  /**
   * Pauses the screen recording.
   */
  pauseRecording() {
    if (!this.recorder) throw new InvalidStateError("No active recorder to pause.");
    this.recorder.pause();
  }

  /**
   * Resumes the screen recording.
   */
  resumeRecording() {
    if (!this.recorder) throw new InvalidStateError("No active recorder to resume.");
    this.recorder.resume();
  }

  /**
   * Stops the screen recording and returns the media result.
   * @returns {Promise<import('./media-result.js').MediaResult>}
   */
  async stopRecording() {
    if (!this.recorder) throw new InvalidStateError("No active recorder to stop.");
    const result = await this.recorder.stop();
    this.state = this.stream ? "capturing" : "stopped";
    this.emit("capture", result);
    return result;
  }

  /**
   * Stops screen capture, stops recording if active, and releases all tracks.
   */
  stop() {
    if (this.recorder && this.recorder.state === "recording") {
      this.recorder.stop().catch(() => {});
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      }
      this.stream = null;
    }
    if (this._previewElement) {
      this._previewElement.srcObject = null;
    }
    this.state = "stopped";
    this.emit("stop");
  }

  /**
   * Fully disposes of the screen capture controller and listeners.
   */
  dispose() {
    this.stop();
    if (this.recorder) {
      this.recorder.dispose();
      this.recorder = null;
    }
    this.removeAllListeners();
  }
}

/**
 * Factory to create a screen capture instance.
 * @param {ScreenCaptureOptions} [options]
 * @returns {ScreenCaptureController}
 */
export function createScreenCapture(options) {
  return new ScreenCaptureController(options);
}
