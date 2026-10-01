import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { startServer } from '../server.js';
import { INPUT } from '../shared/game.js';

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const messages = [];
    const listeners = [];
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
      for (const listener of listeners) listener(message);
    });
    socket.once('open', () => resolve({ socket, messages, listeners }));
    socket.once('error', reject);
  });
}

function waitFor(client, predicate, timeout = 2000, since = 0) {
  const existing = client.messages.slice(since).find(predicate);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.listeners.splice(client.listeners.indexOf(onMessage), 1);
      reject(new Error(`等待 WebSocket 消息超时；最近消息：${JSON.stringify(client.messages.slice(-5))}`));
    }, timeout);
    function onMessage(message) {
      if (!predicate(message)) return;
      clearTimeout(timer);
      client.listeners.splice(client.listeners.indexOf(onMessage), 1);
      resolve(message);
    }
    client.listeners.push(onMessage);
  });
}

test('双人共享开局和连续帧，满员拒绝，离线后房间可重开', async () => {
  const app = await startServer({ port: 0, tickMs: 20 });
  const url = `ws://127.0.0.1:${app.port}`;
  const clients = [];
  try {
    const first = await connect(url);
    clients.push(first);
    assert.equal((await waitFor(first, (message) => message.type === 'welcome')).player, 0);
    const second = await connect(url);
    clients.push(second);
    assert.equal((await waitFor(second, (message) => message.type === 'welcome')).player, 1);
    const firstStart = await waitFor(first, (message) => message.type === 'start');
    const secondStart = await waitFor(second, (message) => message.type === 'start');
    assert.equal(firstStart.seed, secondStart.seed);

    first.socket.send(JSON.stringify({ type: 'input', mask: INPUT.RIGHT }));
    const firstFrame = await waitFor(first, (message) => message.type === 'frame' && message.inputs[0] === INPUT.RIGHT);
    const matchingFrame = await waitFor(second, (message) => message.type === 'frame' && message.frame === firstFrame.frame);
    assert.deepEqual(matchingFrame, firstFrame);
    assert.equal(typeof firstFrame.checksum, 'string');
    await waitFor(first, (message) => message.type === 'frame' && message.frame === firstFrame.frame + 1);

    const extra = await connect(url);
    clients.push(extra);
    assert.equal((await waitFor(extra, (message) => message.type === 'full')).type, 'full');

    const beforeDisconnect = first.messages.length;
    second.socket.close();
    assert.equal((await waitFor(first, (message) => message.type === 'waiting', 2000, beforeDisconnect)).type, 'waiting');
    const replacement = await connect(url);
    clients.push(replacement);
    assert.equal((await waitFor(replacement, (message) => message.type === 'welcome')).player, 1);
    assert.equal((await waitFor(first, (message) => message.type === 'start' && message.seed !== firstStart.seed)).type, 'start');
  } finally {
    for (const client of clients) client.socket.terminate();
    await app.close();
  }
});
