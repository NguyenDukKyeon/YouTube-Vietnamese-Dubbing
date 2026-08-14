/**
 * SPIKE-A-CAPTION Content Script
 *
 * Runs on YouTube watch pages, handles SPA transitions, acquires caption tracks,
 * parses and normalizes canonical segments, and exposes diagnostics.
 */

import { LifecycleManager } from './extractor/lifecycle-manager.js';
import { probePlayerTracks } from './extractor/player-probe.js';
import { selectBestEnglishTrack } from './extractor/track-selector.js';
import { fetchAndParseCaptions } from './extractor/caption-fetcher.js';
import { AcquisitionStatus } from './types.js';

const lifecycle = new LifecycleManager();

function getVideoIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('v');
  } catch {
    return null;
  }
}

async function acquireCaptionsForCurrentVideo() {
  const videoId = getVideoIdFromUrl();
  if (!videoId) {
    return;
  }

  const session = lifecycle.startTransition(videoId);
  const startTime = performance.now();

  try {
    // Retry probing player up to 5 times (total ~2.5s) to allow YouTube player to fully initialize
    let probeResult = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      if (session.signal.aborted) return;
      probeResult = await probePlayerTracks(videoId, { timeoutMs: 1000, signal: session.signal });
      if (probeResult.tracks && probeResult.tracks.length > 0) {
        break;
      }
      // Wait 300ms before retrying
      await new Promise(r => setTimeout(r, 300));
    }

    if (session.signal.aborted) return;

    const rawTracks = probeResult?.tracks || [];
    const selection = selectBestEnglishTrack(rawTracks);

    if (!selection.selectedTrack || !selection.selectedRawTrack) {
      const durationMs = Math.round(performance.now() - startTime);
      const output = lifecycle.finalizeResult(session.generation, videoId, {
        status: selection.reason || AcquisitionStatus.NO_USABLE_ENGLISH_CAPTIONS,
        allTracks: selection.allTracks,
        latencyMs: durationMs
      });
      publishResult(output);
      return;
    }

    // Fetch and parse captions
    const fetchResult = await fetchAndParseCaptions(
      selection.selectedRawTrack,
      selection.selectedTrack,
      { signal: session.signal }
    );

    if (session.signal.aborted) return;

    const durationMs = Math.round(performance.now() - startTime);
    const output = lifecycle.finalizeResult(session.generation, videoId, {
      ...fetchResult,
      trackMetadata: selection.selectedTrack,
      allTracks: selection.allTracks,
      latencyMs: durationMs
    });

    publishResult(output);
  } catch (err) {
    if (session.signal.aborted) return;
    const durationMs = Math.round(performance.now() - startTime);
    const output = lifecycle.finalizeResult(session.generation, videoId, {
      status: AcquisitionStatus.NETWORK_ERROR,
      errorMessage: err.message,
      latencyMs: durationMs
    });
    publishResult(output);
  }
}

function publishResult(result) {
  window.__SPIKE_A_LATEST_RESULT__ = result;
  window.__SPIKE_A_LIFECYCLE__ = lifecycle.getTimeline();

  // Send message to background worker if extension runtime available
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        type: 'SPIKE_A_RESULT',
        payload: result
      }).catch(() => {});
    } catch {}
  }

  // Also dispatch window custom event for test harnesses
  window.dispatchEvent(new CustomEvent('__SPIKE_A_COMPLETION__', { detail: result }));
}

// Attach listeners for YouTube SPA navigation
function initNavigationListeners() {
  window.addEventListener('yt-navigate-finish', () => {
    acquireCaptionsForCurrentVideo();
  });

  window.addEventListener('spfdone', () => {
    acquireCaptionsForCurrentVideo();
  });

  window.addEventListener('popstate', () => {
    acquireCaptionsForCurrentVideo();
  });

  // Observe URL changes as robust fallback
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      acquireCaptionsForCurrentVideo();
    }
  }, 500);

  // Initial trigger
  if (getVideoIdFromUrl()) {
    acquireCaptionsForCurrentVideo();
  }
}

if (typeof window !== 'undefined') {
  initNavigationListeners();
}
