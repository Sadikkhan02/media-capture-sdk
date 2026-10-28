import { isBrowser } from "./utils.js";

/**
 * @typedef {'photo' | 'video' | 'screenshot'} MediaKind
 */

/**
 * Standard MediaResult returned by photo capture and video recording.
 */
export class MediaResult {
  /**
   * @param {Object} options
   * @param {Blob} options.blob
   * @param {MediaKind} options.kind
   * @param {string} options.mimeType
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {number} [options.duration]
   * @param {string} [options.filename]
   * @param {Record<string, unknown>} [options.metadata]
   */
  constructor({ blob, kind, mimeType, width, height, duration, filename, metadata = {} }) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("MediaResult requires a valid Blob instance.");
    }

    this.blob = blob;
    this.kind = kind;
    this.mimeType = mimeType || blob.type || "application/octet-stream";
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.size = blob.size;
    this.timestamp = new Date();
    this.metadata = metadata;

    const ext = this._getDefaultExtension(this.mimeType, kind);
    this.defaultFilename = filename || `capture-${this.timestamp.toISOString().replace(/[:.]/g, "-")}.${ext}`;

    // Lazy URL management
    /** @type {string | null} */
    this._url = null;
    /** @type {File | null} */
    this._file = null;
  }

  /**
   * Returns a standard Web File representation of the media.
   * @returns {File}
   */
  get file() {
    if (!this._file) {
      if (typeof File !== "undefined") {
        this._file = new File([this.blob], this.defaultFilename, {
          type: this.mimeType,
          lastModified: this.timestamp.getTime(),
        });
      } else {
        // Fallback for non-browser/node environments if File is not present
        this._file = /** @type {any} */ (this.blob);
      }
    }
    return this._file;
  }

  /**
   * Returns an object URL for the captured blob.
   * Cached until revokeUrl() is called.
   * @returns {string}
   */
  get url() {
    if (!this._url) {
      if (isBrowser() && typeof URL?.createObjectURL === "function") {
        this._url = URL.createObjectURL(this.blob);
      } else {
        this._url = "";
      }
    }
    return this._url;
  }

  /**
   * Explicitly revokes the created Object URL to free memory.
   */
  revokeUrl() {
    if (this._url && isBrowser() && typeof URL?.revokeObjectURL === "function") {
      URL.revokeObjectURL(this._url);
      this._url = null;
    }
  }

  /**
   * Reads the blob as an ArrayBuffer.
   * @returns {Promise<ArrayBuffer>}
   */
  async arrayBuffer() {
    return await this.blob.arrayBuffer();
  }

  /**
   * Converts the blob to a base64 Data URL.
   * @returns {Promise<string>}
   */
  async toDataURL() {
    return new Promise((resolve, reject) => {
      if (!isBrowser() || typeof FileReader === "undefined") {
        reject(new Error("toDataURL is only supported in browser environments with FileReader"));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(/** @type {string} */ (reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(this.blob);
    });
  }

  /**
   * Triggers a browser download of the captured media file.
   * @param {string} [filename]
   */
  download(filename) {
    if (!isBrowser() || typeof document === "undefined") return;

    const downloadName = filename || this.defaultFilename;
    const downloadUrl = this.url;
    if (!downloadUrl) return;

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = downloadName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  /**
   * Determines appropriate file extension from MIME type
   * @private
   */
  _getDefaultExtension(mimeType, kind) {
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    return kind === "video" ? "webm" : "jpg";
  }
}
