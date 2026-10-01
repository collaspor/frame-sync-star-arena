import { createGame, step, checksum, INPUT, MAX_FRAMES, TARGET_SCORE } from '/shared/game.js';
import { renderArena } from '/render.js';

const canvas = document.querySelector('#arena');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayDetail = document.querySelector('#overlay-detail');
const connection = document.querySelector('#connection');
const role = document.querySelector('#role');
const syncStatus = document.querySelector('#sync-status');
const copyButton = document.querySelector('#copy-link');
const keyBits = new Map([
  ['KeyW', INPUT.UP], ['ArrowUp', INPUT.UP],
  ['KeyS', INPUT.DOWN], ['ArrowDown', INPUT.DOWN],
  ['KeyA', INPUT.LEFT], ['ArrowLeft', INPUT.LEFT],
  ['KeyD', INPUT.RIGHT], ['ArrowRight', INPUT.RIGHT],
]);

let socket;
let state = null;
let player = -1;
let pressed = new Set();
let sentMask = -1;
let desynced = false;
let roomFull = false;

function showOverlay(title, detail) {
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
  overlay.classList.remove('hidden');
}

function setSync(text, error = false) {
  syncStatus.lastElementChild.textContent = text;
  syncStatus.classList.toggle('error', error);
}

function updateHud() {
  document.querySelector('#score-0').textContent = state?.players[0].score ?? 0;
  document.querySelector('#score-1').textContent = state?.players[1].score ?? 0;
  document.querySelector('#frame').textContent = String(state?.frame ?? 0).padStart(4, '0');
  document.querySelector('#seed').textContent = state ? state.seed.toString(16).toUpperCase().padStart(8, '0') : '--------';
  document.querySelector('#checksum').textContent = state ? checksum(state).toUpperCase() : '--------';
  const seconds = state ? Math.trunc((state.remaining + 19) / 20) : Math.trunc(MAX_FRAMES / 20);
  document.querySelector('#timer').textContent = `${String(Math.trunc(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  renderArena(canvas, state);
}

function inputMask() {
  let mask = 0;
  for (const code of pressed) mask |= keyBits.get(code) || 0;
  return mask;
}

function sendInput() {
  const mask = inputMask();
  if (mask === sentMask || socket?.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'input', mask }));
  sentMask = mask;
}

window.addEventListener('keydown', (event) => {
  if (!keyBits.has(event.code)) return;
  event.preventDefault();
  pressed.add(event.code);
  sendInput();
});
window.addEventListener('keyup', (event) => {
  if (!keyBits.has(event.code)) return;
  event.preventDefault();
  pressed.delete(event.code);
  sendInput();
});
window.addEventListener('blur', () => {
  pressed = new Set();
  sendInput();
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyButton.firstChild.textContent = '链接已复制 ';
  } catch {
    copyButton.firstChild.textContent = '复制失败，请复制地址栏 ';
  }
  setTimeout(() => { copyButton.firstChild.textContent = '复制游戏链接 '; }, 2500);
});

function onMessage(message) {
  if (message.type === 'welcome') {
    player = message.player;
    document.querySelector(`#player-${player}`).classList.add('is-you');
    role.textContent = `你是 ${player === 0 ? '薄荷舰队 / P1' : '珊瑚舰队 / P2'}`;
    connection.textContent = '已连接';
  } else if (message.type === 'waiting') {
    state = null;
    sentMask = -1;
    desynced = false;
    showOverlay('等待另一位玩家', '在第二个浏览器窗口打开当前地址，双人就绪后自动开局。');
    setSync('等待开局');
    updateHud();
  } else if (message.type === 'start') {
    state = createGame(message.seed);
    desynced = false;
    sentMask = -1;
    showOverlay('对局开始', '准备拾取第一颗星');
    overlay.classList.add('hidden');
    setSync('两端状态已同步');
    sendInput();
    updateHud();
  } else if (message.type === 'frame') {
    if (!state || desynced) return;
    if (message.frame !== state.frame + 1) {
      desynced = true;
      setSync('帧序列中断', true);
      showOverlay('同步已中断', `预期第 ${state.frame + 1} 帧，收到第 ${message.frame} 帧。请刷新页面重连。`);
      return;
    }
    state = step(state, message.inputs);
    if (checksum(state) !== message.checksum) {
      desynced = true;
      setSync('状态校验失败', true);
      showOverlay('同步已中断', `第 ${state.frame} 帧的状态不一致。请刷新页面重连。`);
      return;
    }
    updateHud();
    if (state.phase === 'finished') {
      const result = state.winner === -1 ? '平局！' : state.winner === player ? '你赢了！' : '对手获胜';
      showOverlay(result, '4 秒后自动开启下一局');
      setSync('本局帧校验全部通过');
    }
  } else if (message.type === 'full') {
    roomFull = true;
    connection.textContent = '房间已满';
    showOverlay('房间已满', '当前对局已有两位玩家，请稍后刷新页面。');
    setSync('等待空位');
  }
}

function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);
  socket.addEventListener('message', (event) => {
    try { onMessage(JSON.parse(event.data)); }
    catch (error) { console.error('消息处理失败', error); }
  });
  socket.addEventListener('close', () => {
    if (roomFull) return;
    state = null;
    connection.textContent = '连接已断开';
    setSync('连接已断开', true);
    showOverlay('连接已断开', '请刷新页面重新加入对局。');
    updateHud();
  });
  socket.addEventListener('error', () => {
    connection.textContent = '连接失败';
  });
}

updateHud();
connect();
