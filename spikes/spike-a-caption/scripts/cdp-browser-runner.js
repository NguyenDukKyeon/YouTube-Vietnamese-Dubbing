/**
 * CDP Browser Test Runner for SPIKE-A-CAPTION
 *
 * Launches Google Chrome with remote debugging, navigates to representative YouTube videos,
 * executes the caption extraction probe in real browser context, exercises SPA navigation,
 * and records empirical results.
 */

import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9333;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new globalThis.WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async close() {
    this.ws.close();
  }
}

async function main() {
  console.log('[CDP Runner] Starting Chrome on port', DEBUG_PORT);
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:\\Users\\nguye\\AppData\\Local\\Temp\\chrome_spike_a',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const versionData = await versionRes.json();
    console.log('[CDP Runner] Connected to browser:', versionData.Browser, 'User-Agent:', versionData['User-Agent']);

    const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.ready;
    console.log('[CDP Runner] CDP Connected.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Test Video 1: Me at the zoo (Manual captions)
    console.log('\n--- 1. Testing Video 1: Me at the zoo (jNQXAC9IVRw) ---');
    await cdp.send('Page.navigate', { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' });
    await sleep(4000);

    const probe1 = await cdp.evaluate(`
      (async () => {
        const player = document.getElementById('movie_player');
        const tracks = player?.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks
          || window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
          || [];

        const enTrack = tracks.find(t => t.languageCode === 'en');
        let fetchStatus = null;
        let sample = null;
        let length = 0;

        if (enTrack?.baseUrl) {
          try {
            const res = await fetch(enTrack.baseUrl + '&fmt=json3');
            fetchStatus = res.status;
            const text = await res.text();
            length = text.length;
            sample = text.slice(0, 300);
          } catch(e) {
            fetchStatus = e.message;
          }
        }

        return {
          title: document.title,
          trackCount: tracks.length,
          tracks: tracks.map(t => ({ lang: t.languageCode, name: t.name, kind: t.kind, vssId: t.vssId, url: t.baseUrl })),
          enTrackFound: Boolean(enTrack),
          fetchStatus,
          length,
          sample
        };
      })()
    `);

    console.log('Result 1:', JSON.stringify(probe1, null, 2));

    await cdp.close();
  } catch (err) {
    console.error('[CDP Runner] Error:', err);
  } finally {
    chromeProcess.kill();
    console.log('[CDP Runner] Chrome process terminated.');
  }
}

main();
