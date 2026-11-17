// Screenshot fixture: replays an answer the live reader gave for the sample chart (store/fixtures), with CORS for the web preview.
const http = require('http');
const ANSWER = require('fs').readFileSync(process.argv[2], 'utf8');
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  req.on('data', () => {}); req.on('end', () => { res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' }); res.end(ANSWER); });
}).listen(8099);
