const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\PrasanthS\\.gemini\\antigravity-ide\\brain\\872ed88b-5d5c-4351-be19-54168e4ecc2a';
const darkImgPath = path.join(ARTIFACTS_DIR, 'master_dark_banner_1789634966939.jpg');
const whiteImgPath = path.join(ARTIFACTS_DIR, 'master_white_banner_1789634991362.jpg');

const darkBase64 = fs.readFileSync(darkImgPath).toString('base64');
const whiteBase64 = fs.readFileSync(whiteImgPath).toString('base64');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; background: #000; }</style>
</head>
<body>
  <canvas id="darkCanvas" width="2400" height="500"></canvas>
  <canvas id="whiteCanvas" width="2400" height="500"></canvas>
  <script>
    async function generateBanners() {
      const darkImg = new Image();
      darkImg.src = 'data:image/jpeg;base64,${darkBase64}';
      await new Promise(r => darkImg.onload = r);

      const whiteImg = new Image();
      whiteImg.src = 'data:image/jpeg;base64,${whiteBase64}';
      await new Promise(r => whiteImg.onload = r);

      // --- 1. DARK BANNER (2400 x 500) ---
      const dc = document.getElementById('darkCanvas');
      const dctx = dc.getContext('2d');

      // Base cosmic gradient
      const dGrad = dctx.createLinearGradient(0, 0, 2400, 500);
      dGrad.addColorStop(0, '#070014');
      dGrad.addColorStop(0.35, '#0D0224');
      dGrad.addColorStop(0.75, '#160536');
      dGrad.addColorStop(1, '#23084C');
      dctx.fillStyle = dGrad;
      dctx.fillRect(0, 0, 2400, 500);

      // Draw dark image on right side (scaled proportionally to height 500)
      const dImgH = 500;
      const dImgW = Math.round(dImgH * (darkImg.width / darkImg.height)); // 500 * (1376/768) = 896px
      const dImgX = 2400 - dImgW;
      const dImgY = 0;

      dctx.drawImage(darkImg, dImgX, dImgY, dImgW, dImgH);

      // Soft feathering gradient on the left boundary of the image
      const dFadeGrad = dctx.createLinearGradient(dImgX - 30, 0, dImgX + 320, 0);
      dFadeGrad.addColorStop(0, '#0D0224');
      dFadeGrad.addColorStop(0.25, 'rgba(13, 2, 36, 0.95)');
      dFadeGrad.addColorStop(0.65, 'rgba(13, 2, 36, 0.3)');
      dFadeGrad.addColorStop(1, 'transparent');
      dctx.fillStyle = dFadeGrad;
      dctx.fillRect(dImgX - 30, 0, 350, 500);

      // Extend glowing particle waves across the left section
      for (let w = 0; w < 5; w++) {
        const yBase = 370 + w * 22;
        const amp = 36 + w * 10;
        const freq = 0.0032 + w * 0.0006;
        const phase = w * 0.9;

        for (let x = 0; x < dImgX + 180; x += 10) {
          const y = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * 0.0018) * 12;
          const alpha = Math.min(0.9, Math.max(0.08, (x / (dImgX + 180)))) * (0.55 - w * 0.08);
          dctx.fillStyle = w % 2 === 0 ? 'rgba(217, 70, 239, ' + alpha + ')' : 'rgba(139, 92, 246, ' + alpha + ')';
          dctx.fillRect(x, y, 1.8, 1.8);
        }
      }

      // --- 2. WHITE BANNER (2400 x 500) ---
      const wc = document.getElementById('whiteCanvas');
      const wctx = wc.getContext('2d');

      // Base pure white to soft lavender gradient
      const wGrad = wctx.createLinearGradient(0, 0, 2400, 500);
      wGrad.addColorStop(0, '#FFFFFF');
      wGrad.addColorStop(0.35, '#FDFAFF');
      wGrad.addColorStop(0.75, '#F5F0FD');
      wGrad.addColorStop(1, '#EDE4FA');
      wctx.fillStyle = wGrad;
      wctx.fillRect(0, 0, 2400, 500);

      // Draw white image on right side
      const wImgH = 500;
      const wImgW = Math.round(wImgH * (whiteImg.width / whiteImg.height));
      const wImgX = 2400 - wImgW;
      const wImgY = 0;

      wctx.drawImage(whiteImg, wImgX, wImgY, wImgW, wImgH);

      // Left edge feathering mask
      const wFadeGrad = wctx.createLinearGradient(wImgX - 30, 0, wImgX + 320, 0);
      wFadeGrad.addColorStop(0, '#FFFFFF');
      wFadeGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.95)');
      wFadeGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
      wFadeGrad.addColorStop(1, 'transparent');
      wctx.fillStyle = wFadeGrad;
      wctx.fillRect(wImgX - 30, 0, 350, 500);

      // Extend glowing violet particle waves across the left section on light background
      for (let w = 0; w < 5; w++) {
        const yBase = 370 + w * 22;
        const amp = 36 + w * 10;
        const freq = 0.0032 + w * 0.0006;
        const phase = w * 0.9;

        for (let x = 0; x < wImgX + 180; x += 10) {
          const y = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * 0.0018) * 12;
          const alpha = Math.min(0.85, Math.max(0.1, (x / (wImgX + 180)))) * (0.6 - w * 0.09);
          wctx.fillStyle = w % 2 === 0 ? 'rgba(192, 38, 211, ' + alpha + ')' : 'rgba(124, 58, 237, ' + alpha + ')';
          wctx.fillRect(x, y, 2, 2);
        }
      }

      window.__DARK_DATA__ = dc.toDataURL('image/jpeg', 0.96);
      window.__WHITE_DATA__ = wc.toDataURL('image/jpeg', 0.96);
      window.__READY__ = true;
    }

    generateBanners();
  </script>
</body>
</html>
`;

fs.writeFileSync('c:\\Users\\PrasanthS\\Documents\\STT\\build_panoramic_banners.html', htmlContent);

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  '--window-size=2500,1200',
  '--remote-debugging-port=9270',
  'http://localhost:5173/build_panoramic_banners.html'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9270/json', (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => {
      const tab = JSON.parse(raw).find(t => t.type === 'page');
      if (!tab) {
        console.error('No page tab found');
        edge.kill();
        process.exit(1);
      }
      const ws = new (globalThis.WebSocket)(tab.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        const checkInterval = setInterval(() => {
          ws.send(JSON.stringify({
            id: 10,
            method: 'Runtime.evaluate',
            params: {
              expression: '({ ready: !!window.__READY__, dark: window.__DARK_DATA__, white: window.__WHITE_DATA__ })',
              returnByValue: true
            }
          }));
        }, 500);

        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === 10 && msg.result && msg.result.result && msg.result.result.value) {
            const val = msg.result.result.value;
            if (val.ready && val.dark && val.white) {
              clearInterval(checkInterval);

              const darkBuffer = Buffer.from(val.dark.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
              const whiteBuffer = Buffer.from(val.white.replace(/^data:image\/jpeg;base64,/, ''), 'base64');

              // Save to brain artifacts
              fs.writeFileSync(path.join(ARTIFACTS_DIR, 'panoramic_dark_banner.jpg'), darkBuffer);
              fs.writeFileSync(path.join(ARTIFACTS_DIR, 'panoramic_white_banner.jpg'), whiteBuffer);

              // Copy to project assets
              fs.writeFileSync('c:\\Users\\PrasanthS\\Documents\\STT\\src\\assets\\STTGDC_Hero_Dark.jpg', darkBuffer);
              fs.writeFileSync('c:\\Users\\PrasanthS\\Documents\\STT\\src\\webparts\\unifiedOperationsPortal\\assets\\STTGDC_Hero_Dark.jpg', darkBuffer);

              fs.writeFileSync('c:\\Users\\PrasanthS\\Documents\\STT\\src\\assets\\STTGDC_Hero_Light.jpg', whiteBuffer);
              fs.writeFileSync('c:\\Users\\PrasanthS\\Documents\\STT\\src\\webparts\\unifiedOperationsPortal\\assets\\STTGDC_Hero_Light.jpg', whiteBuffer);

              console.log('PANORAMIC_BANNERS_GENERATED_SUCCESSFULLY');
              ws.close();
              edge.kill();
              process.exit(0);
            }
          }
        };
      };
    });
  });
}, 1500);
