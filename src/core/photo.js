import { isBrowser } from "./utils.js";
import { MediaResult } from "./media-result.js";
import { InvalidStateError, MediaCaptureError } from "./errors.js";

/**
 * @typedef {Object} PhotoCaptureOptions
 * @property {'image/jpeg' | 'image/png' | 'image/webp'} [mimeType='image/jpeg']
 * @property {number} [quality=0.92] Between 0.0 and 1.0
 * @property {number} [width] Output image width (defaults to video native width)
 * @property {number} [height] Output image height (defaults to video native height)
 * @property {boolean} [mirror=false] Horizontally mirror the image (useful for front-facing camera)
 * @property {string} [filter] CSS filter expression applied during capture (e.g. "grayscale(100%)")
 * @property {'photo' | 'screenshot'} [kind='photo']
 */

/**
 * Captures a still photo from a HTMLVideoElement or active camera preview.
 * @param {HTMLVideoElement} videoElement
 * @param {PhotoCaptureOptions} [options={}]
 * @returns {Promise<MediaResult>}
 */
export async function capturePhotoFromVideo(videoElement, options = {}) {
  if (!isBrowser() || typeof document === "undefined") {
    throw new InvalidStateError("Photo capture is only available in browser environments.");
  }
  if (!videoElement) {
    throw new InvalidStateError("A valid HTMLVideoElement is required for photo capture.");
  }

  // Ensure video has loaded enough metadata to obtain dimensions
  if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    throw new InvalidStateError(
      "Video element has not loaded media frames yet. Ensure video is playing and readyState >= 2."
    );
  }

  const {
    mimeType = "image/jpeg",
    quality = 0.92,
    mirror = false,
    filter,
    kind = "photo",
  } = options;

  const width = options.width || videoElement.videoWidth;
  const height = options.height || videoElement.videoHeight;

  // Use an offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new MediaCaptureError("Failed to obtain 2D rendering context for photo capture.");
  }

  ctx.save();

  // Apply mirroring if requested
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // Apply CSS filter if specified
  if (filter && typeof filter === "string") {
    ctx.filter = filter;
  }

  // Draw video frame to canvas
  ctx.drawImage(videoElement, 0, 0, width, height);
  ctx.restore();

  // Convert canvas to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new MediaCaptureError("Failed to encode canvas frame to Blob."));
          return;
        }

        const result = new MediaResult({
          blob,
          kind,
          mimeType,
          width,
          height,
          metadata: {
            sourceWidth: videoElement.videoWidth,
            sourceHeight: videoElement.videoHeight,
            filter: filter || "none",
            mirrored: mirror,
          },
        });

        resolve(result);
      },
      mimeType,
      quality
    );
  });
}
