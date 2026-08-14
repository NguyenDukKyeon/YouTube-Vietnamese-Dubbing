/**
 * YouTube Page Inspector with Consent Handler
 */

import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9335;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new globalThis.WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
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
      } else if (msg.method) {
        this.events.push(msg);
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
    '--user-data-dir=C:\\Users\\nguye\\AppData\\Local\\Temp\\chrome_spike_a_consent',
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
    await cdp.send('Network.enable');

    console.log('Navigating to https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await cdp.send('Page.navigate', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    await sleep(6000);

    const pageInfo = await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
        const consentBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(el =>
          el.innerText?.includes('Accept') || el.innerText?.includes('I agree') || el.innerText?.includes('Reject')
        );
        if (consentBtn) {
          consentBtn.click();
        }
        return {
          title: document.title,
          url: window.location.href,
          buttons: buttons.slice(0, 10),
          hasConsentBtn: Boolean(consentBtn),
          hasPlayer: Boolean(document.getElementById('movie_player')),
          initialPlayerResponse: Boolean(window.ytInitialPlayerResponse)
        };
      })()
    `);

    console.log('Page info:', JSON.stringify(pageInfo, null, 2));

    await sleep(4000);

    // Re-check player
    const playerInfo = await cdp.evaluate(`
      (() => {
        const player = document.getElementById('movie_player');
        if (!player) return { hasPlayer: false };
        const response = player.getPlayerResponse?.();
        const captionTracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        return {
          hasPlayer: true,
          captionTracksCount: captionTracks.length,
          tracks: captionTracks.map(t => ({
            baseUrl: t.baseUrl,
            vssId: t.vssId,
            languageCode: t.languageCode,
            name: t.name,
            kind: t.kind
          }))
        };
      })()
    `);

    console.log('Player info:', JSON.stringify(playerInfo, null, 2));

    // Now test fetching the timedtext URL from within the browser page context
    if (playerInfo.tracks && playerInfo.tracks.length > 0) {
      const enTrack = playerInfo.tracks.find(t => t.languageCode === 'en') || playerInfo.tracks[0];
      console.log('Attempting fetch of track:', enTrack.vssId, enTrack.baseUrl);

      const fetchResult = await cdp.evaluate(`
        (async () => {
          const url = '${enTrack.baseUrl}&fmt=json3';
          try {
            const res = await fetch(url);
            const text = await res.text();
            return {
              status: res.status,
              length: text.length,
              sample: text.slice(0, 400)
            };
          } catch(e) {
            return { error: e.message };
          }
        })()
      `);

      console.log('Browser fetch result:', JSON.stringify(fetchResult, null, 2));
    }

    await cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main();
