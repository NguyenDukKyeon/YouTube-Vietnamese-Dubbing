/**
 * TimedText Parameter Matrix Prober
 */

import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9336;

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
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--user-data-dir=C:\\Users\\nguye\\AppData\\Local\\Temp\\chrome_spike_a_matrix',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];

    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.ready;

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('Navigating to https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await cdp.send('Page.navigate', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    await sleep(6000);

    const testVariants = await cdp.evaluate(`
      (async () => {
        const player = document.getElementById('movie_player');
        const response = player?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
        const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const enTrack = tracks.find(t => t.languageCode === 'en');

        if (!enTrack) return { error: 'No EN track found' };

        const baseUrl = enTrack.baseUrl;
        const variants = [
          { name: 'raw_baseUrl', url: baseUrl },
          { name: 'fmt_json3', url: baseUrl + '&fmt=json3' },
          { name: 'fmt_srv3', url: baseUrl + '&fmt=srv3' },
          { name: 'fmt_srv1', url: baseUrl + '&fmt=srv1' },
          { name: 'fmt_vtt', url: baseUrl + '&fmt=vtt' },
          { name: 'fmt_ttml', url: baseUrl + '&fmt=ttml' },
          { name: 'clean_timedtext_v_lang', url: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en' },
          { name: 'clean_timedtext_json3', url: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=json3' },
          { name: 'clean_timedtext_srv3', url: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=srv3' },
          { name: 'clean_timedtext_vtt', url: 'https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=vtt' }
        ];

        const results = [];
        for (const v of variants) {
          try {
            const res = await fetch(v.url);
            const text = await res.text();
            results.push({
              name: v.name,
              status: res.status,
              length: text.length,
              sample: text.slice(0, 150)
            });
          } catch(err) {
            results.push({
              name: v.name,
              error: err.message
            });
          }
        }

        return {
          vssId: enTrack.vssId,
          results
        };
      })()
    `);

    console.log('Matrix Results:', JSON.stringify(testVariants, null, 2));

    await cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main();
