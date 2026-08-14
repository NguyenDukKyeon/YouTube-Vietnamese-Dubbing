/**
 * Empirical Live YouTube Caption Acquisition Runner
 *
 * Exercises real public YouTube video caption acquisition across representative
 * video categories: manual English, ASR English, non-English, and long-form.
 */

import { selectBestEnglishTrack } from '../src/extractor/track-selector.js';
import { fetchAndParseCaptions } from '../src/extractor/caption-fetcher.js';
import { AcquisitionStatus, TrackKind } from '../src/types.js';

const TEST_VIDEOS = [
  { id: 'jNQXAC9IVRw', name: 'Me at the zoo', expectedType: 'manual/asr' },
  { id: 'dQw4w9WgXcQ', name: 'Never Gonna Give You Up', expectedType: 'manual' },
  { id: '_uQrJ0TkZlc', name: 'Python in 100 Seconds (Fireship)', expectedType: 'manual/asr' },
  { id: 'kJQP7kiw5Fk', name: 'Despacito (Luis Fonsi)', expectedType: 'non_english_or_none' },
  { id: '9bZkp7q19f0', name: 'Gangnam Style (PSY)', expectedType: 'non_english_or_none' },
  { id: 'k1p4k3y5J5Y', name: 'Sample Tech Talk Long-form', expectedType: 'long_form' }
];

/**
 * Extracts player response from YouTube watch page HTML.
 * @param {string} videoId
 */
async function fetchYouTubePlayerResponse(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching watch page`);
  }

  const html = await res.text();

  // Extract ytInitialPlayerResponse
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\n|<\/script>)/s)
    || html.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);

  if (!match) {
    // Try secondary pattern
    const matchAlt = html.match(/"captions":\s*({.+?"captionTracks":\s*\[.+?\]\s*})/);
    if (matchAlt) {
      try {
        const captionsObj = JSON.parse(matchAlt[1]);
        return { captions: { playerCaptionsTracklistRenderer: captionsObj } };
      } catch {}
    }
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Failed to parse ytInitialPlayerResponse: ${err.message}`);
  }
}

async function runEmpiricalEvaluation() {
  console.log('=== SPIKE-A-CAPTION Empirical Evaluation ===\n');
  const results = [];

  for (const item of TEST_VIDEOS) {
    const startTime = performance.now();
    console.log(`[Testing] Video: ${item.name} (${item.id})`);

    try {
      const playerResponse = await fetchYouTubePlayerResponse(item.id);
      const rawTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      console.log(`  Found ${rawTracks.length} raw caption tracks in player response.`);

      const selection = selectBestEnglishTrack(rawTracks);

      if (!selection.selectedTrack || !selection.selectedRawTrack) {
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`  Selection: No usable English track. Reason: ${selection.reason}`);
        results.push({
          videoId: item.id,
          name: item.name,
          status: selection.reason || AcquisitionStatus.NO_USABLE_ENGLISH_CAPTIONS,
          rawTrackCount: rawTracks.length,
          availableLanguages: rawTracks.map(t => t.languageCode),
          latencyMs: elapsed
        });
        continue;
      }

      console.log(`  Selected Track: ${selection.selectedTrack.name} (Kind: ${selection.selectedTrack.kind}, VSS: ${selection.selectedTrack.vssId})`);

      const fetchResult = await fetchAndParseCaptions(selection.selectedRawTrack, selection.selectedTrack);
      const elapsed = Math.round(performance.now() - startTime);

      console.log(`  Fetch Status: ${fetchResult.status} (Format: ${fetchResult.formatUsed}) in ${elapsed}ms`);
      if (fetchResult.segments) {
        console.log(`  Extracted ${fetchResult.segments.length} segments. Total Duration: ${fetchResult.timingSummary?.totalDurationMs}ms`);
        console.log(`  Monotonic: ${fetchResult.timingSummary?.isMonotonic}. Anomalies: ${fetchResult.timingSummary?.anomalies?.length}`);
        if (fetchResult.segments.length > 0) {
          console.log(`  Sample Segment 1: [${fetchResult.segments[0].startMs}ms - ${fetchResult.segments[0].endMs}ms] "${fetchResult.segments[0].text}"`);
        }
      }

      results.push({
        videoId: item.id,
        name: item.name,
        status: fetchResult.status,
        trackMetadata: selection.selectedTrack,
        formatUsed: fetchResult.formatUsed,
        segmentCount: fetchResult.segments?.length || 0,
        totalDurationMs: fetchResult.timingSummary?.totalDurationMs || 0,
        isMonotonic: fetchResult.timingSummary?.isMonotonic,
        anomaliesCount: fetchResult.timingSummary?.anomalies?.length || 0,
        anomalies: fetchResult.timingSummary?.anomalies || [],
        latencyMs: elapsed,
        sampleSegments: fetchResult.segments?.slice(0, 3) || []
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      console.error(`  Error evaluating video ${item.id}:`, err.message);
      results.push({
        videoId: item.id,
        name: item.name,
        status: AcquisitionStatus.NETWORK_ERROR,
        errorMessage: err.message,
        latencyMs: elapsed
      });
    }
    console.log('');
  }

  console.log('=== Empirical Evaluation Summary ===');
  console.log(JSON.stringify(results, null, 2));
}

runEmpiricalEvaluation();
