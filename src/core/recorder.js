import { EventEmitter } from "./events.js";
import { MediaResult } from "./media-result.js";
import { getBestSupportedMimeType, isBrowser } from "./utils.js";
import { InvalidStateError, NotSupportedError, RecordingError } from "./errors.js";

/**
 * @typedef {'idle' | 'recording' | 'paused' | 'stopped'} RecorderState
 */

/**
 * @typedef {Object} RecordingOptions
 * @property {string} [mimeType]
 * @property {number} [timeSlice] Interval in ms for dataavailable chunks
 * @property {number} [maxDuration] Max recording duration in seconds
 * @property {number} [maxSizeBytes] Max recording size in bytes
 * @property {number} [audioBitsPerSecond]
 * @property {number} [videoBitsPerSecond]
 */

export class StreamRecorder extends EventEmitter {
  /**
   * @param {MediaStream} stream
   * @param {RecordingOptions} [defaultOptions={}]
   */
  constructor(stream, defaultOptions = {}) {
    super();
    if (!isBrowser() || typeof window.MediaRecorder === "undefined") {
      throw new NotSupportedError("MediaRecorder is not supported in this environment.");
    }
    if (!stream || !stream.getTracks || stream.getTracks().length === 0) {
      throw new InvalidStateError("A valid MediaStream with active tracks is required for recording.");
    }

    this.stream = stream;
    this.defaultOptions = defaultOptions;

    /** @type {RecorderState} */
    this.state = "idle";
    /** @type {MediaRecorder | null} */
    this.mediaRecorder = null;
    /** @type {Blob[]} */
    this._chunks = [];
    /** @type {string} */
    this._actualMimeType = "";

    // Duration & Timing tracking
    this._startTime = 0;
    this._elapsedBeforePause = 0;
    this._pauseStartTime = 0;
    this._totalBytes = 0;
    /** @type {NodeJS.Timeout | number | null} */
    this._progressTimer = null;
    /** @type {NodeJS.Timeout | number | null} */
    this._maxDurationTimer = null;
  }

  /**
   * Starts video recording.
   * @param {RecordingOptions} [options]
   */
  start(options = {}) {
    if (this.state === "recording" || this.state === "paused") {
      throw new InvalidStateError(`Cannot start recording while in state: ${this.state}`);
    }

    const opts = { ...this.defaultOptions, ...options };
    const selectedMime = getBestSupportedMimeType(opts.mimeType);

    /** @type {MediaRecorderOptions} */
    const recorderOptions = {
      mimeType: selectedMime,
    };
    if (opts.audioBitsPerSecond) recorderOptions.audioBitsPerSecond = opts.audioBitsPerSecond;
    if (opts.videoBitsPerSecond) recorderOptions.videoBitsPerSecond = opts.videoBitsPerSecond;

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
    } catch {
      // If preferred format failed, try default without mimeType
      try {
        this.mediaRecorder = new MediaRecorder(this.stream);
      } catch (innerErr) {
        throw new RecordingError(
          `Failed to initialize MediaRecorder: ${innerErr?.message || String(innerErr)}`,
          innerErr
        );
      }
    }

    this._actualMimeType = this.mediaRecorder.mimeType || selectedMime;
    this._chunks = [];
    this._totalBytes = 0;
    this._elapsedBeforePause = 0;
    this._startTime = Date.now();
    this.state = "recording";

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this._chunks.push(event.data);
        this._totalBytes += event.data.size;
        this.emit("dataavailable", event.data);

        // Check max size limit
        if (opts.maxSizeBytes && this._totalBytes >= opts.maxSizeBytes) {
          this.stop().catch(() => {});
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      const err = new RecordingError("MediaRecorder runtime error", event?.error || null);
      this.emit("error", err);
    };

    // Start native recorder
    if (opts.timeSlice && opts.timeSlice > 0) {
      this.mediaRecorder.start(opts.timeSlice);
    } else {
      this.mediaRecorder.start(1000); // Default 1s timeslice for smooth chunk availability
    }

    // Setup max duration timer
    if (opts.maxDuration && opts.maxDuration > 0) {
      this._maxDurationTimer = setTimeout(() => {
        if (this.state === "recording" || this.state === "paused") {
          this.stop().catch(() => {});
        }
      }, opts.maxDuration * 1000);
    }

    // Setup progress timer (emits duration every 250ms)
    this._progressTimer = setInterval(() => {
      if (this.state === "recording") {
        this.emit("progress", {
          duration: this.getDuration(),
          bytes: this._totalBytes,
        });
      }
    }, 250);

    this.emit("start");
  }

  /**
   * Pauses the recording if currently recording.
   */
  pause() {
    if (this.state !== "recording") {
      throw new InvalidStateError(`Cannot pause recording when state is: ${this.state}`);
    }
    if (this.mediaRecorder && typeof this.mediaRecorder.pause === "function") {
      this.mediaRecorder.pause();
      this._pauseStartTime = Date.now();
      this._elapsedBeforePause += this._pauseStartTime - this._startTime;
      this.state = "paused";
      this.emit("pause");
    } else {
      throw new NotSupportedError("MediaRecorder pause() is not supported by this browser.");
    }
  }

  /**
   * Resumes a paused recording.
   */
  resume() {
    if (this.state !== "paused") {
      throw new InvalidStateError(`Cannot resume recording when state is: ${this.state}`);
    }
    if (this.mediaRecorder && typeof this.mediaRecorder.resume === "function") {
      this.mediaRecorder.resume();
      this._startTime = Date.now();
      this.state = "recording";
      this.emit("resume");
    } else {
      throw new NotSupportedError("MediaRecorder resume() is not supported by this browser.");
    }
  }

  /**
   * Stops recording and returns the assembled MediaResult.
   * @returns {Promise<MediaResult>}
   */
  async stop() {
    if (this.state === "idle" || this.state === "stopped") {
      throw new InvalidStateError(`Cannot stop recording when state is: ${this.state}`);
    }

    this._clearTimers();
    const finalDuration = this.getDuration();

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.state = "stopped";
        reject(new InvalidStateError("No active MediaRecorder found."));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const finalBlob = new Blob(this._chunks, { type: this._actualMimeType });

          // Extract stream video track dimensions if present
          const videoTrack = this.stream.getVideoTracks()[0];
          const settings = videoTrack?.getSettings?.() || {};

          const result = new MediaResult({
            blob: finalBlob,
            kind: "video",
            mimeType: this._actualMimeType,
            duration: Math.round(finalDuration * 100) / 100,
            width: settings.width,
            height: settings.height,
            metadata: {
              frameRate: settings.frameRate,
              chunkCount: this._chunks.length,
            },
          });

          this.state = "stopped";
          this.emit("stop", result);
          resolve(result);
        } catch (err) {
          reject(new RecordingError("Failed to assemble recorded video result", err));
        }
      };

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        reject(new RecordingError("Error while stopping MediaRecorder", err));
      }
    });
  }

  /**
   * Returns current recording duration in seconds.
   * @returns {number}
   */
  getDuration() {
    if (this.state === "idle") return 0;
    let ms = this._elapsedBeforePause;
    if (this.state === "recording") {
      ms += Date.now() - this._startTime;
    }
    return Math.max(0, ms / 1000);
  }

  /**
   * Cleans up all resources, timers, and listeners.
   */
  dispose() {
    this._clearTimers();
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop error during disposal
      }
    }
    this.mediaRecorder = null;
    this._chunks = [];
    this.state = "stopped";
    this.removeAllListeners();
  }

  /**
   * @private
   */
  _clearTimers() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
    if (this._maxDurationTimer) {
      clearTimeout(this._maxDurationTimer);
      this._maxDurationTimer = null;
    }
  }
}
