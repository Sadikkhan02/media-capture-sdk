import { createCamera } from "../core/camera.js";
import { formatDuration } from "../core/utils.js";
import { FILTER_PRESETS, getFilterCss } from "../filters/presets.js";

/**
 * @typedef {Object} CameraUIOptions
 * @property {CameraController} [camera] Existing camera instance
 * @property {import('../core/camera.js').CameraOptions} [cameraOptions] Options to instantiate new camera
 * @property {'video' | 'photo' | 'both'} [mode='both']
 * @property {boolean} [showCameraSelect=true]
 * @property {boolean} [showFilterSelect=true]
 * @property {boolean} [mirror=false]
 * @property {Object} [labels]
 * @property {string} [labels.takePhoto='Capture Photo']
 * @property {string} [labels.startRecording='Record Video']
 * @property {string} [labels.stopRecording='Stop Recording']
 * @property {string} [labels.pause='Pause']
 * @property {string} [labels.resume='Resume']
 * @property {(media: import('../core/media-result.js').MediaResult) => void} [onCapture]
 * @property {(error: Error) => void} [onError]
 */

export class CameraUIWidget {
  /**
   * @param {HTMLElement} container
   * @param {CameraUIOptions} [options={}]
   */
  constructor(container, options = {}) {
    if (!container || typeof container.appendChild !== "function") {
      throw new TypeError("A valid DOM container element is required to mount CameraUI.");
    }

    this.container = container;
    this.options = {
      mode: "both",
      showCameraSelect: true,
      showFilterSelect: true,
      mirror: false,
      ...options,
      labels: {
        takePhoto: "Capture Photo",
        startRecording: "Record Video",
        stopRecording: "Stop Recording",
        pause: "Pause",
        resume: "Resume",
        ...options.labels,
      },
    };

    this.camera = options.camera || createCamera(options.cameraOptions || { mode: this.options.mode });
    this.ownsCamera = !options.camera;
    this.currentMode = this.options.mode === "video" ? "video" : "photo";
    this.activeFilter = "none";
    this.isMirrored = this.options.mirror;

    /** @type {HTMLElement | null} */
    this.widgetRoot = null;
    /** @type {HTMLVideoElement | null} */
    this.videoEl = null;
    /** @type {HTMLElement | null} */
    this.recordingBadge = null;
    /** @type {HTMLElement | null} */
    this.timerText = null;
    /** @type {HTMLButtonElement | null} */
    this.actionBtn = null;
    /** @type {HTMLButtonElement | null} */
    this.pauseBtn = null;
    /** @type {HTMLSelectElement | null} */
    this.cameraSelect = null;
    /** @type {HTMLSelectElement | null} */
    this.filterSelect = null;
    /** @type {HTMLElement | null} */
    this.errorBanner = null;

    this._unsubscribers = [];
  }

  /**
   * Mounts the UI into the container and initializes camera stream.
   */
  async mount() {
    this._renderDOM();
    this._attachEventListeners();

    if (this.videoEl) {
      this.camera.attachPreview(this.videoEl);
    }

    try {
      await this.camera.open();
      await this._populateCameraList();
    } catch (err) {
      this._showError(err?.message || "Failed to start camera.");
    }
  }

  /**
   * @private
   */
  _renderDOM() {
    const root = document.createElement("div");
    root.className = "mc-capture-widget";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Camera Capture Controls");

    // Preview Container
    const previewContainer = document.createElement("div");
    previewContainer.className = "mc-preview-container";

    const video = document.createElement("video");
    video.className = `mc-preview-video ${this.isMirrored ? "mc-mirrored" : ""}`;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    this.videoEl = video;
    previewContainer.appendChild(video);

    // Recording Badge
    const badge = document.createElement("div");
    badge.className = "mc-recording-badge";
    badge.style.display = "none";
    badge.innerHTML = `<span class="mc-recording-dot"></span><span class="mc-timer">REC 00:00</span>`;
    this.recordingBadge = badge;
    this.timerText = badge.querySelector(".mc-timer");
    previewContainer.appendChild(badge);

    // Error banner
    const errBanner = document.createElement("div");
    errBanner.className = "mc-error-banner";
    errBanner.setAttribute("role", "alert");
    this.errorBanner = errBanner;
    previewContainer.appendChild(errBanner);

    root.appendChild(previewContainer);

    // Controls Panel
    const controlsPanel = document.createElement("div");
    controlsPanel.className = "mc-controls-panel";

    // Top Bar (Tabs + Selects)
    const topBar = document.createElement("div");
    topBar.className = "mc-top-bar";

    // Mode Tabs if mode is 'both'
    if (this.options.mode === "both") {
      const tabs = document.createElement("div");
      tabs.className = "mc-mode-tabs";
      tabs.innerHTML = `
        <button type="button" class="mc-tab-button ${this.currentMode === "photo" ? "mc-active" : ""}" data-mode="photo">Photo</button>
        <button type="button" class="mc-tab-button ${this.currentMode === "video" ? "mc-active" : ""}" data-mode="video">Video</button>
      `;
      topBar.appendChild(tabs);
    }

    // Dropdowns
    const dropdowns = document.createElement("div");
    dropdowns.className = "mc-dropdowns";

    if (this.options.showFilterSelect) {
      const filterSelect = document.createElement("select");
      filterSelect.className = "mc-select";
      filterSelect.setAttribute("aria-label", "Select Visual Filter");
      Object.keys(FILTER_PRESETS).forEach((key) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        filterSelect.appendChild(opt);
      });
      this.filterSelect = filterSelect;
      dropdowns.appendChild(filterSelect);
    }

    if (this.options.showCameraSelect) {
      const camSelect = document.createElement("select");
      camSelect.className = "mc-select";
      camSelect.setAttribute("aria-label", "Select Camera Device");
      this.cameraSelect = camSelect;
      dropdowns.appendChild(camSelect);
    }

    topBar.appendChild(dropdowns);
    controlsPanel.appendChild(topBar);

    // Action Bar (Buttons)
    const actionBar = document.createElement("div");
    actionBar.className = "mc-action-bar";

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "mc-btn-secondary";
    pauseBtn.textContent = this.options.labels.pause;
    pauseBtn.style.display = "none";
    this.pauseBtn = pauseBtn;
    actionBar.appendChild(pauseBtn);

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "mc-btn-shutter";
    actionBtn.setAttribute("aria-label", this.currentMode === "photo" ? this.options.labels.takePhoto : this.options.labels.startRecording);
    this.actionBtn = actionBtn;
    actionBar.appendChild(actionBtn);

    controlsPanel.appendChild(actionBar);
    root.appendChild(controlsPanel);

    this.container.appendChild(root);
    this.widgetRoot = root;
  }

  /**
   * @private
   */
  _attachEventListeners() {
    // Mode switch
    const tabs = this.widgetRoot?.querySelectorAll(".mc-tab-button");
    tabs?.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.forEach((b) => b.classList.remove("mc-active"));
        btn.classList.add("mc-active");
        this.currentMode = btn.getAttribute("data-mode") || "photo";
        this._updateUIState();
      });
    });

    // Filter select
    this.filterSelect?.addEventListener("change", (e) => {
      const target = /** @type {HTMLSelectElement} */ (e.target);
      this.activeFilter = target.value;
      if (this.videoEl) {
        this.videoEl.style.filter = getFilterCss(this.activeFilter);
      }
    });

    // Camera select
    this.cameraSelect?.addEventListener("change", async (e) => {
      const target = /** @type {HTMLSelectElement} */ (e.target);
      if (target.value) {
        try {
          await this.camera.switchCamera(target.value);
        } catch (err) {
          this._showError(err?.message || "Failed to switch camera");
        }
      }
    });

    // Action button
    this.actionBtn?.addEventListener("click", async () => {
      if (this.currentMode === "photo") {
        await this._takePhoto();
      } else {
        await this._toggleRecording();
      }
    });

    // Pause button
    this.pauseBtn?.addEventListener("click", () => {
      if (this.camera.isRecording) {
        this.camera.pauseRecording();
        this.pauseBtn.textContent = this.options.labels.resume;
      } else if (this.camera.isPaused) {
        this.camera.resumeRecording();
        this.pauseBtn.textContent = this.options.labels.pause;
      }
    });

    // Subscribe to camera events
    this._unsubscribers.push(
      this.camera.on("recordProgress", ({ duration }) => {
        if (this.timerText) {
          this.timerText.textContent = `REC ${formatDuration(duration)}`;
        }
      })
    );

    this._unsubscribers.push(
      this.camera.on("capture", (media) => {
        if (this.options.onCapture) this.options.onCapture(media);
      })
    );

    this._unsubscribers.push(
      this.camera.on("error", (err) => {
        this._showError(err.message);
        if (this.options.onError) this.options.onError(err);
      })
    );

    this._unsubscribers.push(
      this.camera.on("devicechange", () => {
        this._populateCameraList();
      })
    );
  }

  /**
   * @private
   */
  async _takePhoto() {
    try {
      this.errorBanner.style.display = "none";
      await this.camera.capturePhoto({
        filter: getFilterCss(this.activeFilter),
        mirror: this.isMirrored,
      });
    } catch (err) {
      this._showError(err?.message || "Failed to capture photo");
    }
  }

  /**
   * @private
   */
  async _toggleRecording() {
    this.errorBanner.style.display = "none";
    if (this.camera.isRecording || this.camera.isPaused) {
      try {
        await this.camera.stopRecording();
        this._updateUIState();
      } catch (err) {
        this._showError(err?.message || "Failed to stop recording");
      }
    } else {
      try {
        this.camera.startRecording();
        this._updateUIState();
      } catch (err) {
        this._showError(err?.message || "Failed to start recording");
      }
    }
  }

  /**
   * @private
   */
  _updateUIState() {
    const isRec = this.camera.isRecording || this.camera.isPaused;

    if (this.recordingBadge) {
      this.recordingBadge.style.display = isRec ? "flex" : "none";
    }

    if (this.pauseBtn) {
      this.pauseBtn.style.display = isRec ? "inline-flex" : "none";
      this.pauseBtn.textContent = this.camera.isPaused ? this.options.labels.resume : this.options.labels.pause;
    }

    if (this.actionBtn) {
      if (this.currentMode === "photo") {
        this.actionBtn.className = "mc-btn-shutter";
        this.actionBtn.setAttribute("aria-label", this.options.labels.takePhoto);
      } else {
        this.actionBtn.className = `mc-btn-shutter ${isRec ? "mc-recording" : ""}`;
        this.actionBtn.setAttribute(
          "aria-label",
          isRec ? this.options.labels.stopRecording : this.options.labels.startRecording
        );
      }
    }
  }

  /**
   * @private
   */
  async _populateCameraList() {
    if (!this.cameraSelect) return;
    try {
      const cameras = await this.camera.getCameras();
      this.cameraSelect.innerHTML = "";
      cameras.forEach((cam) => {
        const opt = document.createElement("option");
        opt.value = cam.deviceId;
        opt.textContent = cam.label;
        this.cameraSelect.appendChild(opt);
      });
    } catch {
      // Ignore enumeration failure
    }
  }

  /**
   * @private
   */
  _showError(msg) {
    if (this.errorBanner) {
      this.errorBanner.textContent = msg;
      this.errorBanner.style.display = "block";
    }
  }

  /**
   * Unmounts and tears down the UI.
   */
  unmount() {
    this._unsubscribers.forEach((unsub) => unsub());
    this._unsubscribers = [];

    if (this.ownsCamera) {
      this.camera.dispose();
    } else {
      this.camera.detachPreview();
    }

    if (this.widgetRoot && this.widgetRoot.parentNode) {
      this.widgetRoot.parentNode.removeChild(this.widgetRoot);
    }
    this.widgetRoot = null;
  }
}

/**
 * Creates and mounts a camera UI widget.
 * @param {HTMLElement} container
 * @param {CameraUIOptions} [options]
 * @returns {CameraUIWidget}
 */
export function createCameraUI(container, options) {
  const ui = new CameraUIWidget(container, options);
  ui.mount();
  return ui;
}
