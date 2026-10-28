import { createCameraUI, createScreenCapture } from "../../dist/index.js";

// Simulated Host Application Video Editor API
class HostVideoEditor {
  constructor() {
    this.mediaPool = [];
    this.mediaBinEl = document.getElementById("media-bin");
    this.emptyStateEl = document.getElementById("empty-state");
    this.v1TrackEl = document.getElementById("v1-track");
    this.a1TrackEl = document.getElementById("a1-track");
  }

  /**
   * Host application's media import method
   * Receives standard MediaResult or File from the SDK!
   */
  importMedia(mediaResult) {
    // Hide empty placeholder
    if (this.emptyStateEl) this.emptyStateEl.style.display = "none";

    const item = {
      id: `media-${Date.now()}`,
      file: mediaResult.file,
      blob: mediaResult.blob,
      url: mediaResult.url,
      kind: mediaResult.kind,
      mimeType: mediaResult.mimeType,
      duration: mediaResult.duration || 0,
      width: mediaResult.width || 0,
      height: mediaResult.height || 0,
      revokeUrl: () => mediaResult.revokeUrl(),
      download: () => mediaResult.download(),
    };

    this.mediaPool.push(item);
    this._renderMediaCard(item);
    this._insertToTimeline(item);
  }

  _renderMediaCard(item) {
    const card = document.createElement("div");
    card.className = "media-card";

    let previewEl;
    if (item.kind === "video") {
      previewEl = `<video src="${item.url}" controls></video>`;
    } else {
      previewEl = `<img src="${item.url}" alt="Capture Preview" />`;
    }

    card.innerHTML = `
      ${previewEl}
      <div class="media-card-body">
        <strong>${item.kind.toUpperCase()}</strong>
        <span>Format: ${item.mimeType}</span>
        ${item.duration ? `<span>Duration: ${item.duration}s</span>` : ""}
        <span>Resolution: ${item.width}x${item.height}</span>
        <div class="media-card-actions">
          <button class="btn-sm download-btn">Download</button>
        </div>
      </div>
    `;

    card.querySelector(".download-btn").addEventListener("click", () => {
      item.download();
    });

    this.mediaBinEl.appendChild(card);
  }

  _insertToTimeline(item) {
    const clip = document.createElement("div");
    clip.className = "timeline-clip";
    clip.textContent = `${item.kind.toUpperCase()} (${item.duration ? item.duration + "s" : "Still"})`;

    this.v1TrackEl.appendChild(clip);

    if (item.kind === "video") {
      const audioClip = document.createElement("div");
      audioClip.className = "timeline-clip";
      audioClip.style.background = "#059669";
      audioClip.textContent = `Audio (${item.duration}s)`;
      this.a1TrackEl.appendChild(audioClip);
    }
  }
}

// Instantiate Host Application
const editor = new HostVideoEditor();

// Mount Media Capture SDK UI
const container = document.getElementById("camera-widget-mount");
createCameraUI(container, {
  mode: "both",
  showCameraSelect: true,
  showFilterSelect: true,
  onCapture: (media) => {
    // Pass captured media result directly to the host application
    editor.importMedia(media);
  },
  onError: (err) => {
    // eslint-disable-next-line no-console
    console.error("Camera capture error:", err);
  },
});

// Setup optional Screen Capture
const screenBtn = document.getElementById("screen-capture-btn");
let activeScreenCapture = null;
let isScreenRecording = false;

screenBtn.addEventListener("click", async () => {
  if (!isScreenRecording) {
    try {
      activeScreenCapture = createScreenCapture({
        onCapture: (media) => {
          editor.importMedia(media);
        },
      });

      await activeScreenCapture.startCapture();
      activeScreenCapture.startRecording();
      isScreenRecording = true;
      screenBtn.textContent = "Stop Screen Recording";
      screenBtn.style.background = "#dc2626";
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Screen capture cancelled or failed:", err.message);
    }
  } else {
    if (activeScreenCapture) {
      await activeScreenCapture.stopRecording();
      activeScreenCapture.dispose();
      activeScreenCapture = null;
    }
    isScreenRecording = false;
    screenBtn.textContent = "Record Screen / Tab";
    screenBtn.style.background = "#334155";
  }
});
