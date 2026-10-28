/**
 * Lightweight, zero-dependency EventEmitter for browser & SSR
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Register an event listener
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("Event handler must be a function");
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);

    return () => this.off(event, handler);
  }

  /**
   * Remove an event listener
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Register a one-time event listener
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  once(event, handler) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      handler(...args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event
   * @param {...unknown} args
   */
  emit(event, ...args) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;

    // Iterate over a snapshot in case listeners unregister during execution
    for (const handler of Array.from(handlers)) {
      try {
        handler(...args);
      } catch (err) {
        // Emit uncaught error event if not currently emitting 'error'
        if (event !== "error" && this._listeners.has("error")) {
          this.emit("error", err);
        } else {
          console.error(`[MediaCaptureSDK] Error in listener for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners for a given event, or all listeners entirely
   * @param {string} [event]
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}
