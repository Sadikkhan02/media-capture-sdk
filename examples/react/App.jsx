import React, { useState } from "react";
import { useCamera, CameraCaptureView } from "media-capture-sdk/react";

export function App() {
  const [captures, setCaptures] = useState([]);
  const [activeTab, setActiveTab] = useState("headless"); // 'headless' | 'component'

  // Headless React Hook integration
  const {
    previewRef,
    open,
    close,
    capturePhoto,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecording,
    isPaused,
    duration,
    isActive,
    error,
  } = useCamera({
    mode: "both",
    onCapture: (media) => {
      setCaptures((prev) => [media, ...prev]);
    },
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Media Capture SDK — React Integration Example</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("headless")}
          style={{
            padding: "8px 16px",
            background: activeTab === "headless" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "headless" ? "#fff" : "#000",
            border: "none",
            borderRadius: 6,
          }}
        >
          Headless Hook (useCamera)
        </button>
        <button
          onClick={() => setActiveTab("component")}
          style={{
            padding: "8px 16px",
            background: activeTab === "component" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "component" ? "#fff" : "#000",
            border: "none",
            borderRadius: 6,
          }}
        >
          Bundled Component (&lt;CameraCaptureView /&gt;)
        </button>
      </div>

      {activeTab === "headless" ? (
        <div style={{ background: "#0f172a", padding: 20, borderRadius: 12, color: "#fff" }}>
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", maxHeight: 380, background: "#000", borderRadius: 8 }}
          />

          {error && <div style={{ color: "#ef4444", marginTop: 8 }}>{error.message}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {!isActive ? (
              <button onClick={() => open()} style={btnStyle}>Open Camera</button>
            ) : (
              <button onClick={() => close()} style={btnStyle}>Close Camera</button>
            )}

            <button onClick={() => capturePhoto()} disabled={!isActive} style={btnStyle}>
              Take Photo
            </button>

            {!isRecording && !isPaused ? (
              <button onClick={() => startRecording()} disabled={!isActive} style={{ ...btnStyle, background: "#dc2626" }}>
                Record Video
              </button>
            ) : (
              <>
                <button onClick={isRecording ? pauseRecording : resumeRecording} style={btnStyle}>
                  {isRecording ? "Pause" : "Resume"}
                </button>
                <button onClick={() => stopRecording()} style={{ ...btnStyle, background: "#ef4444" }}>
                  Stop Recording ({Math.floor(duration)}s)
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 640 }}>
          <CameraCaptureView
            mode="both"
            onCapture={(media) => setCaptures((prev) => [media, ...prev])}
          />
        </div>
      )}

      {/* Captured results pool */}
      <div style={{ marginTop: 32 }}>
        <h2>Captured Media Pool ({captures.length})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginTop: 12 }}>
          {captures.map((media, idx) => (
            <div key={idx} style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", padding: 8 }}>
              {media.kind === "video" ? (
                <video src={media.url} controls style={{ width: "100%", height: 120, objectFit: "cover" }} />
              ) : (
                <img src={media.url} alt="Capture" style={{ width: "100%", height: 120, objectFit: "cover" }} />
              )}
              <div style={{ fontSize: 12, marginTop: 8 }}>
                <strong>{media.kind.toUpperCase()}</strong>
                <div>{media.mimeType}</div>
                <div>{media.width}x{media.height}</div>
                <button
                  onClick={() => media.download()}
                  style={{ marginTop: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
