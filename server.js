import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import WebSocket, { WebSocketServer } from 'ws';
import { createGame, step, checksum } from './shared/game.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['public/index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['public/style.css', 'text/css; charset=utf-8']],
  ['/client.js', ['public/client.js', 'text/javascript; charset=utf-8']],
  ['/render.js', ['public/render.js', 'text/javascript; charset=utf-8']],
  ['/shared/game.js', ['shared/game.js', 'text/javascript; charset=utf-8']],
]);

function send(socket, message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export async function startServer({ port = 3000, host = '127.0.0.1', tickMs = 50 } = {}) {
  const players = [null, null];
  const inputs = [0, 0];
  let game = null;
  let ticker = null;
  let restartTimer = null;

  const server = http.createServer(async (request, response) => {
    const entry = files.get(new URL(request.url, 'http://localhost').pathname);
    if (!entry) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('未找到页面');
      return;
    }
    try {
      const content = await readFile(path.join(root, entry[0]));
      response.writeHead(200, { 'content-type': entry[1], 'cache-control': 'no-store' });
      response.end(content);
    } catch {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('页面加载失败');
    }
  });
  const sockets = new WebSocketServer({ server });

  function stopMatch() {
    if (ticker) clearInterval(ticker);
    if (restartTimer) clearTimeout(restartTimer);
    ticker = null;
    restartTimer = null;
    game = null;
    inputs[0] = 0;
    inputs[1] = 0;
  }

  function startMatch() {
    stopMatch();
    const seed = randomInt(1, 0x100000000);
    game = createGame(seed);
    for (const socket of players) send(socket, { type: 'start', seed });
    ticker = setInterval(() => {
      if (!game) return;
      const frameInputs = [...inputs];
      game = step(game, frameInputs);
      const message = { type: 'frame', frame: game.frame, inputs: frameInputs, checksum: checksum(game) };
      for (const socket of players) send(socket, message);
      if (game.phase === 'finished') {
        clearInterval(ticker);
        ticker = null;
        restartTimer = setTimeout(() => {
          if (players[0] && players[1]) startMatch();
        }, 4000);
      }
    }, tickMs);
  }

  sockets.on('connection', (socket) => {
    const player = players.findIndex((entry) => entry === null);
    if (player === -1) {
      send(socket, { type: 'full' });
      socket.close();
      return;
    }
    players[player] = socket;
    send(socket, { type: 'welcome', player });
    if (players[0] && players[1]) startMatch();
    else send(socket, { type: 'waiting' });

    socket.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (message?.type === 'input' && Number.isInteger(message.mask) && message.mask >= 0 && message.mask <= 15) {
        inputs[player] = message.mask;
      }
    });

    socket.on('close', () => {
      if (players[player] !== socket) return;
      players[player] = null;
      stopMatch();
      for (const other of players) send(other, { type: 'waiting' });
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return {
    port: server.address().port,
    close: async () => {
      stopMatch();
      for (const socket of players) socket?.terminate();
      await new Promise((resolve) => sockets.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '127.0.0.1';
  startServer({ port, host })
    .then((app) => console.log(`星星竞技场已启动：http://${host}:${app.port}`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
