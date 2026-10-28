import React, { useEffect, useRef, useState, useCallback } from "react";
import { createCamera } from "../core/camera.js";
import { createScreenCapture } from "../core/screen.js";
import { isBrowser } from "../core/utils.js";

/**
 * React hook to manage camera lifecycle, stream attachment, and media captures safely.
 * Fully SSR compatible.
 *
 * @param {import('../core/camera.js').CameraOptions} [options={}]
 */
export function useCamera(options = {}) {
  const [state, setState] = useState("idle");
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);

  const previewRef = useRef(null);
  const cameraRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize camera controller once on client
  useEffect(() => {
    if (!isBrowser()) return;

    const camera = createCamera({
      ...optionsRef.current,
      onCapture: (media) => {
        if (optionsRef.current.onCapture) optionsRef.current.onCapture(media);
      },
      onError: (err) => {
        setError(err);
        if (optionsRef.current.onError) optionsRef.current.onError(err);
      },
      onStateChange: (newState) => {
        setState(newState);
        if (optionsRef.current.onStateChange) optionsRef.current.onStateChange(newState);
      },
    });

    cameraRef.current = camera;

    const unsubStream = camera.on("stream", (s) => setStream(s));
    const unsubProgress = camera.on("recordProgress", ({ duration: d }) => setDuration(d));

    // Attach preview ref if available
    if (previewRef.current) {
      camera.attachPreview(previewRef.current);
    }

    return () => {
      unsubStream();
      unsubProgress();
      camera.dispose();
      cameraRef.current = null;
    };
  }, []);

  // Sync preview ref if element changes
  const setPreviewRef = useCallback((element) => {
    previewRef.current = element;
    if (element && cameraRef.current) {
      cameraRef.current.attachPreview(element);
    }
  }, []);

  const open = useCallback(async () => {
    if (!cameraRef.current) return null;
    setError(null);
    return await cameraRef.current.open();
  }, []);

  const close = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.close();
      setStream(null);
    }
  }, []);

  const capturePhoto = useCallback(async (opts) => {
    if (!cameraRef.current) throw new Error("Camera not initialized");
    return await cameraRef.current.capturePhoto(opts);
  }, []);

  const startRecording = useCallback((opts) => {
    if (!cameraRef.current) throw new Error("Camera not initialized");
    setDuration(0);
    cameraRef.current.startRecording(opts);
  }, []);

  const pauseRecording = useCallback(() => {
    if (cameraRef.current) cameraRef.current.pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    if (cameraRef.current) cameraRef.current.resumeRecording();
  }, []);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current) throw new Error("Camera not initialized");
    return await cameraRef.current.stopRecording();
  }, []);

  const switchCamera = useCallback(async (target) => {
    if (!cameraRef.current) throw new Error("Camera not initialized");
    return await cameraRef.current.switchCamera(target);
  }, []);

  return {
    camera: cameraRef.current,
    state,
    stream,
    error,
    duration,
    previewRef: setPreviewRef,
    isRecording: state === "recording",
    isPaused: state === "paused",
    isActive: Boolean(stream && stream.active),
    open,
    close,
    capturePhoto,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    switchCamera,
  };
}

/**
 * React hook to manage screen capture lifecycle safely.
 * @param {import('../core/screen.js').ScreenCaptureOptions} [options={}]
 */
export function useScreenCapture(options = {}) {
  const [state, setState] = useState("idle");
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  const previewRef = useRef(null);
  const screenRef = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!isBrowser()) return;

    const screenCtrl = createScreenCapture({
      ...optionsRef.current,
      onCapture: (media) => {
        if (optionsRef.current.onCapture) optionsRef.current.onCapture(media);
      },
      onError: (err) => {
        setError(err);
        if (optionsRef.current.onError) optionsRef.current.onError(err);
      },
    });

    screenRef.current = screenCtrl;

    const unsubStart = screenCtrl.on("start", (s) => {
      setStream(s);
      setState("capturing");
    });

    const unsubEnded = screenCtrl.on("ended", () => {
      setStream(null);
      setState("stopped");
    });

    return () => {
      unsubStart();
      unsubEnded();
      screenCtrl.dispose();
      screenRef.current = null;
    };
  }, []);

  const setPreviewRef = useCallback((element) => {
    previewRef.current = element;
    if (element && screenRef.current) {
      screenRef.current.attachPreview(element);
    }
  }, []);

  const startCapture = useCallback(async (constraints) => {
    if (!screenRef.current) return null;
    setError(null);
    return await screenRef.current.startCapture(constraints);
  }, []);

  const stop = useCallback(() => {
    if (screenRef.current) {
      screenRef.current.stop();
      setStream(null);
      setState("stopped");
    }
  }, []);

  const startRecording = useCallback((opts) => {
    if (!screenRef.current) throw new Error("Screen capture not initialized");
    screenRef.current.startRecording(opts);
    setState("recording");
  }, []);

  const stopRecording = useCallback(async () => {
    if (!screenRef.current) throw new Error("Screen capture not initialized");
    const result = await screenRef.current.stopRecording();
    setState(stream ? "capturing" : "stopped");
    return result;
  }, [stream]);

  return {
    screenCapture: screenRef.current,
    state,
    stream,
    error,
    previewRef: setPreviewRef,
    isRecording: state === "recording",
    startCapture,
    stop,
    startRecording,
    stopRecording,
  };
}

/**
 * CameraCaptureView Component
 * Ready-to-use React camera view component
 */
export function CameraCaptureView({
  mode = "both",
  onCapture,
  onError,
  className = "",
  style = {},
  showControls = true,
}) {
  const {
    previewRef,
    isRecording,
    isPaused,
    duration,
    open,
    capturePhoto,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    error,
  } = useCamera({ mode, onCapture, onError });

  useEffect(() => {
    open().catch(() => {});
  }, [open]);

  return React.createElement(
    "div",
    {
      className: `mc-react-camera-view ${className}`,
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0f172a",
        borderRadius: "12px",
        overflow: "hidden",
        ...style,
      },
    },
    React.createElement("video", {
      ref: previewRef,
      autoPlay: true,
      playsInline: true,
      muted: true,
      style: { width: "100%", height: "auto", display: "block" },
    }),
    error &&
      React.createElement(
        "div",
        {
          style: {
            padding: "8px 12px",
            background: "#ef4444",
            color: "white",
            fontSize: "13px",
          },
        },
        error.message
      ),
    showControls &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            padding: "12px",
            background: "#1e293b",
          },
        },
        (mode === "photo" || mode === "both") &&
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => capturePhoto(),
              style: {
                padding: "8px 16px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              },
            },
            "Take Photo"
          ),
        (mode === "video" || mode === "both") &&
          !isRecording &&
          !isPaused &&
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => startRecording(),
              style: {
                padding: "8px 16px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              },
            },
            "Record Video"
          ),
        (isRecording || isPaused) &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "button",
              {
                type: "button",
                onClick: isRecording ? pauseRecording : resumeRecording,
                style: {
                  padding: "8px 16px",
                  background: "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                },
              },
              isRecording ? "Pause" : "Resume"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: () => stopRecording(),
                style: {
                  padding: "8px 16px",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                },
              },
              `Stop (${Math.floor(duration)}s)`
            )
          )
      )
  );
}
