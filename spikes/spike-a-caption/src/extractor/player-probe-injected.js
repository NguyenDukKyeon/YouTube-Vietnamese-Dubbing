/**
 * MAIN-world Injected Probe Script
 *
 * Runs inside YouTube's MAIN execution world to read player caption tracks
 * without exposing arbitrary RPC or privileged endpoints.
 */

(function () {
  const PROBE_REQUEST_EVENT = '__SPIKE_CAPTION_PROBE_REQUEST__';
  const PROBE_RESPONSE_EVENT = '__SPIKE_CAPTION_PROBE_RESPONSE__';

  function extractCaptionTracksFromPlayer() {
    try {
      const player = document.getElementById('movie_player') || document.querySelector('#movie_player');
      let captionTracks = null;
      let videoId = null;

      if (player) {
        if (typeof player.getVideoData === 'function') {
          const videoData = player.getVideoData();
          videoId = videoData?.video_id;
        }

        if (typeof player.getPlayerResponse === 'function') {
          const resp = player.getPlayerResponse();
          captionTracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        }

        if (!captionTracks && typeof player.getOption === 'function') {
          captionTracks = player.getOption('captions', 'tracklist');
        }
      }

      if (!captionTracks && window.ytInitialPlayerResponse) {
        captionTracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!videoId) {
          videoId = window.ytInitialPlayerResponse?.videoDetails?.videoId;
        }
      }

      if (!videoId) {
        const urlParams = new URLSearchParams(window.location.search);
        videoId = urlParams.get('v');
      }

      // Return sanitized tracklist copy
      const sanitizedTracks = Array.isArray(captionTracks)
        ? captionTracks.map(t => ({
            baseUrl: t.baseUrl,
            name: t.name,
            vssId: t.vssId,
            languageCode: t.languageCode,
            kind: t.kind,
            isTranslatable: Boolean(t.isTranslatable)
          }))
        : [];

      return {
        success: true,
        videoId: videoId || null,
        tracks: sanitizedTracks
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        tracks: []
      };
    }
  }

  // Listen for request from isolated content script
  window.addEventListener(PROBE_REQUEST_EVENT, (event) => {
    const requestId = event.detail?.requestId;
    const result = extractCaptionTracksFromPlayer();

    window.dispatchEvent(
      new CustomEvent(PROBE_RESPONSE_EVENT, {
        detail: {
          requestId,
          ...result
        }
      })
    );
  });
})();
