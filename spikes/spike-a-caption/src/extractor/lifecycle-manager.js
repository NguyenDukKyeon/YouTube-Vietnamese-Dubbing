/**
 * YouTube SPA Lifecycle & Generation Manager
 *
 * Prevents stale asynchronous caption results from attaching to new videos across
 * SPA navigations or rapid video switching by maintaining a monotonic generation counter
 * and cancelling previous in-flight requests.
 */

import { AcquisitionStatus } from '../types.js';

export class LifecycleManager {
  constructor() {
    this.generation = 0;
    this.currentVideoId = null;
    /** @type {AbortController|null} */
    this.currentAbortController = null;
    /** @type {Array<{ timestamp: number, event: string, videoId: string, generation: number, details?: object }>} */
    this.timelineLog = [];
  }

  /**
   * Logs a lifecycle event.
   * @param {string} event
   * @param {string} videoId
   * @param {number} generation
   * @param {object} [details]
   */
  logEvent(event, videoId, generation, details = {}) {
    this.timelineLog.push({
      timestamp: Date.now(),
      event,
      videoId,
      generation,
      details
    });
  }

  /**
   * Starts a new video lifecycle session.
   * Cancels in-flight requests for the previous video and advances generation.
   *
   * @param {string} videoId
   * @returns {{ generation: number, videoId: string, signal: AbortSignal }}
   */
  startTransition(videoId) {
    if (this.currentAbortController) {
      this.currentAbortController.abort('GENERATION_ADVANCED');
      this.logEvent('ABORT_PRIOR_REQUEST', this.currentVideoId, this.generation);
    }

    this.generation += 1;
    this.currentVideoId = videoId;
    this.currentAbortController = new AbortController();

    this.logEvent('VIDEO_TRANSITION_STARTED', videoId, this.generation);

    return {
      generation: this.generation,
      videoId: this.currentVideoId,
      signal: this.currentAbortController.signal
    };
  }

  /**
   * Validates if an async completion matches current video and generation.
   *
   * @param {number} reqGeneration
   * @param {string} reqVideoId
   * @returns {boolean}
   */
  isCurrent(reqGeneration, reqVideoId) {
    const valid = reqGeneration === this.generation && reqVideoId === this.currentVideoId;
    if (!valid) {
      this.logEvent('STALE_RESULT_REJECTED', reqVideoId, reqGeneration, {
        currentGeneration: this.generation,
        currentVideoId: this.currentVideoId
      });
    }
    return valid;
  }

  /**
   * Wraps an async acquisition result, rejecting it if stale.
   *
   * @param {number} reqGeneration
   * @param {string} reqVideoId
   * @param {object} result
   * @returns {object}
   */
  finalizeResult(reqGeneration, reqVideoId, result) {
    if (!this.isCurrent(reqGeneration, reqVideoId)) {
      return {
        status: AcquisitionStatus.STALE_GENERATION_DISCARDED,
        videoId: reqVideoId,
        generation: reqGeneration,
        errorMessage: `Discarded stale result for ${reqVideoId} (gen ${reqGeneration}) while on ${this.currentVideoId} (gen ${this.generation})`
      };
    }

    this.logEvent('ACQUISITION_COMPLETED', reqVideoId, reqGeneration, {
      status: result.status
    });

    return {
      ...result,
      videoId: reqVideoId,
      generation: reqGeneration
    };
  }

  /**
   * Returns current timeline events for evidence export.
   * @returns {Array<object>}
   */
  getTimeline() {
    return [...this.timelineLog];
  }

  /**
   * Resets all state (e.g. between tests).
   */
  reset() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.generation = 0;
    this.currentVideoId = null;
    this.currentAbortController = null;
    this.timelineLog = [];
  }
}
