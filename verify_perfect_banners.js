const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\PrasanthS\\.gemini\\antigravity-ide\\brain\\872ed88b-5d5c-4351-be19-54168e4ecc2a';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  '--window-size=1440,900',
  '--remote-debugging-port=9280',
  'http://localhost:5173/'
]);

edge.on('error', (err) => {
  console.error('Failed to spawn edge:', err);
  process.exit(1);
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

setTimeout(async () => {
  http.get('http://127.0.0.1:9280/json', (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', async () => {
      const tabs = JSON.parse(raw);
      const tab = tabs.find(t => t.type === 'page');
      if (!tab) {
        console.error('No page tab found');
        edge.kill();
        process.exit(1);
      }

      const ws = new (globalThis.WebSocket)(tab.webSocketDebuggerUrl);
      let msgId = 1;
      const pending = new Map();

      function sendCommand(method, params = {}) {
        return new Promise((resolve) => {
          const id = msgId++;
          pending.set(id, resolve);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
          const resolve = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg.result);
        }
      };

      ws.onopen = async () => {
        await sendCommand('Page.enable');
        await sendCommand('Runtime.enable');

        await sleep(3000);

        // 1. Capture Light Mode
        const lightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
        if (lightShot && lightShot.data) {
          fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verify_perfect_light_banner.png'), Buffer.from(lightShot.data, 'base64'));
          console.log('SAVED_PERFECT_LIGHT_BANNER');
        }

        // 2. Switch to Dark Mode
        await sendCommand('Runtime.evaluate', {
          expression: `(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const darkBtn = buttons.find(b => b.textContent.includes('Dark'));
            if (darkBtn) darkBtn.click();
          })()`
        });

        await sleep(1500);

        // 3. Capture Dark Mode
        const darkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
        if (darkShot && darkShot.data) {
          fs.writeFileSync(path.join(ARTIFACTS_DIR, 'verify_perfect_dark_banner.png'), Buffer.from(darkShot.data, 'base64'));
          console.log('SAVED_PERFECT_DARK_BANNER');
        }

        ws.close();
        edge.kill();
        console.log('VERIFICATION_COMPLETE');
        process.exit(0);
      };
    });
  }).on('error', (err) => {
    console.error('CDP error:', err);
    edge.kill();
    process.exit(1);
  });
}, 2500);
