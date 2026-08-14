/**
 * SPIKE-A-CAPTION MV3 Background Service Worker
 *
 * Minimal service worker logging extension events and holding session state for verification.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SPIKE-A] Caption acquisition harness installed.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SPIKE_A_RESULT') {
    console.log('[SPIKE-A] Received caption result for video:', message.payload?.videoId, 'status:', message.payload?.status);
    sendResponse({ received: true });
  }
  return true;
});
