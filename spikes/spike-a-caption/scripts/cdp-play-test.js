/**
 * Play Video & Extract Captions in Active Browser Session
 */

import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9338;

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
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--user-data-dir=C:\\Users\\nguye\\AppData\\Local\\Temp\\chrome_spike_a_play',
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
    await sleep(5000);

    const playResult = await cdp.evaluate(`
      (async () => {
        const player = document.getElementById('movie_player');
        if (!player) return { error: 'No player' };

        // Mute and play video
        player.mute();
        player.playVideo();

        // Load English captions
        player.loadOption('captions', 'track', { languageCode: 'en' });
        player.setOption('captions', 'track', { languageCode: 'en' });

        return {
          state: player.getPlayerState(),
          currentTime: player.getCurrentTime(),
          duration: player.getDuration(),
          track: player.getOption('captions', 'track')
        };
      })()
    `);

    console.log('Play result:', JSON.stringify(playResult, null, 2));

    await sleep(4000);

    // Check player caption events or network events
    const timedtextRequests = cdp.events.filter(e =>
      e.method === 'Network.requestWillBeSent' && e.params.request.url.includes('timedtext')
    );

    console.log(`Found ${timedtextRequests.length} timedtext requests sent by YouTube player.`);
    for (const req of timedtextRequests) {
      console.log('  Request URL:', req.params.request.url);
    }

    const timedtextResponses = cdp.events.filter(e =>
      e.method === 'Network.responseReceived' && e.params.response.url.includes('timedtext')
    );

    for (const res of timedtextResponses) {
      console.log('  Response status:', res.params.response.status, 'url:', res.params.response.url);
      try {
        const body = await cdp.send('Network.getResponseBody', { requestId: res.params.requestId });
        console.log('  Response body length:', body.body.length, 'sample:', body.body.slice(0, 300));
      } catch (err) {
        console.log('  Could not get body:', err.message);
      }
    }

    // Also check DOM caption window
    const domCaptionText = await cdp.evaluate(`
      (() => {
        const captionWindow = document.querySelector('.ytp-caption-window-bottom') || document.querySelector('.caption-window');
        const segments = Array.from(document.querySelectorAll('.ytp-caption-segment')).map(el => el.innerText);
        return {
          hasCaptionWindow: Boolean(captionWindow),
          segments
        };
      })()
    `);

    console.log('DOM Caption Window:', JSON.stringify(domCaptionText, null, 2));

    await cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main();
