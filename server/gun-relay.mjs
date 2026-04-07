import http from 'node:http';
import Gun from 'gun';
import 'gun/axe.js';

const port = Number(process.env.PORT) || 8765;
const host = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CampusChain Gun relay is running.\n');
});

Gun({
  web: server,
  file: 'data/gun',
  axe: false
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[gun] relay listening on http://${host}:${port}/gun`);
});
