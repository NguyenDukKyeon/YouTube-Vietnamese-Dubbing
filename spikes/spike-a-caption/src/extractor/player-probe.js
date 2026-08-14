/**
 * Isolated Content Script Player Probe Bridge
 *
 * Injects the probe script into the page DOM (MAIN world) and requests caption tracklist
 * with timeout and generation/requestId tracking.
 */

const PROBE_REQUEST_EVENT = '__SPIKE_CAPTION_PROBE_REQUEST__';
const PROBE_RESPONSE_EVENT = '__SPIKE_CAPTION_PROBE_RESPONSE__';

let probeInjected = false;

/**
 * Injects the MAIN world probe script if not already present.
 */
export function ensureProbeInjected() {
  if (typeof document === 'undefined') return; // Node/test environment guard
  if (probeInjected || document.getElementById('__spike_caption_probe__')) {
    probeInjected = true;
    return;
  }

  try {
    const script = document.createElement('script');
    script.id = '__spike_caption_probe__';
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      script.src = chrome.runtime.getURL('src/extractor/player-probe-injected.js');
    } else {
      // Inlined fallback if chrome.runtime is unavailable
      script.textContent = `
        window.addEventListener('${PROBE_REQUEST_EVENT}', (e) => {
          const reqId = e.detail?.requestId;
          let tracks = [];
          let vid = null;
          try {
            const p = document.getElementById('movie_player') || document.querySelector('#movie_player');
            if (p) {
              vid = p.getVideoData?.()?.video_id;
              tracks = p.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks || p.getOption?.('captions', 'tracklist') || [];
            }
            if (!tracks?.length && window.ytInitialPlayerResponse) {
              tracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
              if (!vid) vid = window.ytInitialPlayerResponse?.videoDetails?.videoId;
            }
            if (!vid) {
              vid = new URLSearchParams(window.location.search).get('v');
            }
          } catch(err) {}
          window.dispatchEvent(new CustomEvent('${PROBE_RESPONSE_EVENT}', {
            detail: { requestId: reqId, success: true, videoId: vid, tracks: Array.isArray(tracks) ? tracks : [] }
          }));
        });
      `;
    }
    (document.head || document.documentElement).appendChild(script);
    probeInjected = true;
  } catch (err) {
    console.error('[SPIKE-A] Failed to inject player probe script:', err);
  }
}

/**
 * Requests caption tracks from the MAIN world player probe.
 *
 * @param {string} targetVideoId
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=3000]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ success: boolean, videoId: string|null, tracks: Array<any>, error?: string }>}
 */
export function probePlayerTracks(targetVideoId, options = {}) {
  const { timeoutMs = 3000, signal } = options;

  if (typeof window === 'undefined') {
    return Promise.resolve({ success: false, videoId: targetVideoId, tracks: [], error: 'WINDOW_UNDEFINED' });
  }

  ensureProbeInjected();

  return new Promise((resolve) => {
    const requestId = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let timerId = null;

    const cleanup = () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener(PROBE_RESPONSE_EVENT, onResponse);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const onResponse = (event) => {
      if (event.detail?.requestId === requestId) {
        cleanup();
        resolve({
          success: Boolean(event.detail.success),
          videoId: event.detail.videoId || targetVideoId,
          tracks: event.detail.tracks || [],
          error: event.detail.error
        });
      }
    };

    const onAbort = () => {
      cleanup();
      resolve({
        success: false,
        videoId: targetVideoId,
        tracks: [],
        error: 'PROBE_ABORTED'
      });
    };

    window.addEventListener(PROBE_RESPONSE_EVENT, onResponse);
    if (signal) signal.addEventListener('abort', onAbort);

    timerId = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        videoId: targetVideoId,
        tracks: [],
        error: 'PROBE_TIMEOUT'
      });
    }, timeoutMs);

    // Dispatch probe request
    window.dispatchEvent(
      new CustomEvent(PROBE_REQUEST_EVENT, {
        detail: { requestId, targetVideoId }
      })
    );
  });
}
