import { getFilterCss } from "./presets.js";

/**
 * FilteredStreamProcessor
 * Renders video frames onto a canvas with CSS filter effects applied
 * and generates a new MediaStream using canvas.captureStream().
 */
export class FilteredStreamProcessor {
  /**
   * @param {HTMLVideoElement} videoElement
   * @param {Object} [options]
   * @param {string} [options.filter='none']
   * @param {number} [options.frameRate=30]
   */
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.filter = options.filter || "none";
    this.frameRate = options.frameRate || 30;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    /** @type {MediaStream | null} */
    this.outputStream = null;
    /** @type {number | null} */
    this._animationFrameId = null;
    this._active = false;
  }

  /**
   * Starts processing and returns the filtered MediaStream.
   * @returns {MediaStream}
   */
  start() {
    if (this._active && this.outputStream) {
      return this.outputStream;
    }

    const width = this.videoElement.videoWidth || 1280;
    const height = this.videoElement.videoHeight || 720;
    this.canvas.width = width;
    this.canvas.height = height;

    this._active = true;

    const renderLoop = () => {
      if (!this._active) return;

      if (this.videoElement.readyState >= 2 && this.ctx) {
        if (this.canvas.width !== this.videoElement.videoWidth && this.videoElement.videoWidth > 0) {
          this.canvas.width = this.videoElement.videoWidth;
          this.canvas.height = this.videoElement.videoHeight;
        }

        this.ctx.filter = getFilterCss(this.filter);
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      }

      this._animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    if (typeof this.canvas.captureStream === "function") {
      this.outputStream = this.canvas.captureStream(this.frameRate);
    } else {
      throw new Error("canvas.captureStream() is not supported in this browser.");
    }

    return this.outputStream;
  }

  /**
   * Updates the active filter dynamically.
   * @param {string} newFilter
   */
  setFilter(newFilter) {
    this.filter = newFilter;
  }

  /**
   * Stops rendering and cleans up canvas stream tracks.
   */
  stop() {
    this._active = false;
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
    if (this.outputStream) {
      for (const track of this.outputStream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      }
      this.outputStream = null;
    }
  }
}

/**
 * Creates a filtered stream from a video element.
 * @param {HTMLVideoElement} videoElement
 * @param {Object} [options]
 * @returns {FilteredStreamProcessor}
 */
export function createFilteredStream(videoElement, options) {
  return new FilteredStreamProcessor(videoElement, options);
}
