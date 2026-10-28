"use client";

import React, { useState } from "react";
import { useCamera } from "media-capture-sdk/react";

/**
 * Next.js Client Component Example
 *
 * In Next.js (App Router or Pages Router), browser media APIs (navigator.mediaDevices)
 * do not exist on the Node server during SSR.
 *
 * By declaring "use client"; at the top of this file and using useCamera(),
 * media-capture-sdk ensures:
 * 1. Zero ReferenceError during server-side module evaluation.
 * 2. Camera streams and event listeners only initialize after mounting in the browser.
 * 3. Automatic track termination and timer cleanup when unmounting or navigating away.
 */
export default function NextCameraRecorder({ onMediaReady }) {
  const [photoPreview, setPhotoPreview] = useState(null);

  const {
    previewRef,
    open,
    close,
    capturePhoto,
    startRecording,
    stopRecording,
    isRecording,
    duration,
    isActive,
    error,
  } = useCamera({
    resolution: "1080p",
    mode: "both",
    onCapture: (media) => {
      if (media.kind === "photo") {
        setPhotoPreview(media.url);
      }
      if (onMediaReady) {
        onMediaReady(media);
      }
    },
  });

  return (
    <div className="next-camera-container p-4 bg-slate-900 rounded-xl text-white">
      <h2 className="text-lg font-bold mb-3">Next.js Camera Client Component</h2>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
        <video
          ref={previewRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {error && (
        <div className="p-2 mb-3 bg-red-600 text-sm rounded">
          {error.message}
        </div>
      )}

      <div className="flex gap-3">
        {!isActive ? (
          <button
            onClick={() => open()}
            className="px-4 py-2 bg-blue-600 rounded font-medium hover:bg-blue-700"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={() => close()}
            className="px-4 py-2 bg-slate-700 rounded font-medium hover:bg-slate-600"
          >
            Stop Camera
          </button>
        )}

        <button
          onClick={() => capturePhoto()}
          disabled={!isActive}
          className="px-4 py-2 bg-indigo-600 rounded font-medium disabled:opacity-50"
        >
          Capture Photo
        </button>

        {!isRecording ? (
          <button
            onClick={() => startRecording()}
            disabled={!isActive}
            className="px-4 py-2 bg-red-600 rounded font-medium disabled:opacity-50"
          >
            Record Clip
          </button>
        ) : (
          <button
            onClick={() => stopRecording()}
            className="px-4 py-2 bg-red-700 rounded font-medium animate-pulse"
          >
            Stop ({Math.floor(duration)}s)
          </button>
        )}
      </div>

      {photoPreview && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-1">Captured Photo:</h3>
          <img src={photoPreview} alt="Captured" className="w-48 rounded border border-slate-700" />
        </div>
      )}
    </div>
  );
}
