// Drives headless Chrome over the DevTools protocol: phone-sized viewport at 3x, real-time waits, optional scroll.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [out, W, H] = [process.argv[2], 430, 932];
const shots = JSON.parse(process.argv[3]);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${out}/.chrome`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 3, mobile: true });
for (const s of shots) {
  await send('Page.navigate', { url: s.url });
  await sleep(s.wait ?? 9000);
  if (s.js) { await send('Runtime.evaluate', { expression: s.js }); await sleep(1500); }
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${out}/${s.name}.png`, Buffer.from(data, 'base64'));
  console.log('captured', s.name);
}
ws.close(); chrome.kill();
