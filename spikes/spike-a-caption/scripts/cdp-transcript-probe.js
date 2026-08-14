/**
 * YouTube Transcript Feature & Player Caption Probe
 */

import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9337;

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
    '--user-data-dir=C:\\Users\\nguye\\AppData\\Local\\Temp\\chrome_spike_a_transcript',
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

    // Let's test calling youtubei/v1/get_transcript or extracting caption segments from player
    const probeResult = await cdp.evaluate(`
      (async () => {
        // 1. Check ytInitialData engagement panels for get_transcript params
        let transcriptParams = null;
        try {
          const panels = window.ytInitialData?.engagementPanels || [];
          for (const p of panels) {
            const renderer = p.engagementPanelSectionListRenderer;
            if (renderer?.panelIdentifier === 'engagement-panel-searchable-transcript') {
              transcriptParams = renderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint?.params;
            }
          }
        } catch(e) {}

        // 2. Also check ytcfg
        let apiKey = null;
        let clientContext = null;
        try {
          if (window.ytcfg) {
            apiKey = window.ytcfg.get('INNERTUBE_API_KEY');
            clientContext = window.ytcfg.get('INNERTUBE_CONTEXT');
          }
        } catch(e) {}

        return {
          hasTranscriptParams: Boolean(transcriptParams),
          transcriptParams: transcriptParams || null,
          hasApiKey: Boolean(apiKey),
          hasClientContext: Boolean(clientContext)
        };
      })()
    `);

    console.log('Probe result:', JSON.stringify(probeResult, null, 2));

    // If we have transcriptParams, try fetching get_transcript endpoint
    if (probeResult.hasApiKey && probeResult.hasTranscriptParams) {
      const getTranscriptResult = await cdp.evaluate(`
        (async () => {
          const apiKey = window.ytcfg.get('INNERTUBE_API_KEY');
          const context = window.ytcfg.get('INNERTUBE_CONTEXT');
          const params = window.ytInitialData?.engagementPanels
            ?.find(p => p.engagementPanelSectionListRenderer?.panelIdentifier === 'engagement-panel-searchable-transcript')
            ?.engagementPanelSectionListRenderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint?.params;

          const res = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context,
              params
            })
          });

          const data = await res.json();
          return {
            status: res.status,
            keys: Object.keys(data),
            hasActions: Boolean(data.actions),
            sample: JSON.stringify(data).slice(0, 500)
          };
        })()
      `);

      console.log('get_transcript result:', JSON.stringify(getTranscriptResult, null, 2));
    }

    await cdp.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main();
