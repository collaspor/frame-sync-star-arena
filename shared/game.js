export const WIDTH = 960;
export const HEIGHT = 540;
export const MAX_FRAMES = 1800;
export const TARGET_SCORE = 7;
export const INPUT = Object.freeze({ UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8 });

const PLAYER_RADIUS = 18;
const STAR_RADIUS = 17;
const SPEED = 6;
const DEFAULT_SEED = 0x6d2b79f5;

function nextRandom(state) {
  let value = state.seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed;
}

function starTouchesPlayer(x, y, player) {
  const dx = x - player.x;
  const dy = y - player.y;
  const minimum = PLAYER_RADIUS + STAR_RADIUS + 14;
  return dx * dx + dy * dy < minimum * minimum;
}

function spawnStar(state) {
  for (let attempt = 0; attempt < 128; attempt++) {
    const x = 60 + (nextRandom(state) % 15) * 60;
    const y = 60 + (nextRandom(state) % 8) * 60;
    if (state.players.every((player) => !starTouchesPlayer(x, y, player))) {
      state.star = { x, y };
      return;
    }
  }
  // 极端情况下仍使用确定性的固定位置，避免随机重试无限循环。
  state.star = { x: 480, y: 270 };
}

export function createGame(seed) {
  const value = Number.isInteger(seed) ? seed >>> 0 : DEFAULT_SEED;
  const state = {
    frame: 0,
    seed: value || DEFAULT_SEED,
    remaining: MAX_FRAMES,
    phase: 'playing',
    winner: -1,
    players: [
      { x: 180, y: 270, score: 0 },
      { x: 780, y: 270, score: 0 },
    ],
    star: { x: 480, y: 270 },
  };
  spawnStar(state);
  return state;
}

function clamp(value, minimum, maximum) {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}

function move(player, mask) {
  const input = Number.isInteger(mask) ? mask & 15 : 0;
  const horizontal = Number(Boolean(input & INPUT.RIGHT)) - Number(Boolean(input & INPUT.LEFT));
  const vertical = Number(Boolean(input & INPUT.DOWN)) - Number(Boolean(input & INPUT.UP));
  player.x = clamp(player.x + horizontal * SPEED, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
  player.y = clamp(player.y + vertical * SPEED, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS);
}

export function step(current, inputs) {
  if (current.phase !== 'playing') return current;
  const state = {
    frame: current.frame + 1,
    seed: current.seed,
    remaining: current.remaining - 1,
    phase: current.phase,
    winner: current.winner,
    players: current.players.map((player) => ({ ...player })),
    star: { ...current.star },
  };

  move(state.players[0], inputs[0]);
  move(state.players[1], inputs[1]);

  for (let index = 0; index < 2; index++) {
    const player = state.players[index];
    const dx = player.x - state.star.x;
    const dy = player.y - state.star.y;
    const reach = PLAYER_RADIUS + STAR_RADIUS;
    if (dx * dx + dy * dy <= reach * reach) {
      player.score += 1;
      if (player.score >= TARGET_SCORE) {
        state.phase = 'finished';
        state.winner = index;
      } else {
        spawnStar(state);
      }
      break;
    }
  }

  if (state.remaining <= 0 && state.phase === 'playing') {
    state.remaining = 0;
    state.phase = 'finished';
    const [first, second] = state.players;
    state.winner = first.score === second.score ? -1 : first.score > second.score ? 0 : 1;
  }
  return state;
}

export function checksum(state) {
  const values = [
    state.frame, state.seed, state.remaining,
    state.phase === 'playing' ? 1 : 2, state.winner,
    state.players[0].x, state.players[0].y, state.players[0].score,
    state.players[1].x, state.players[1].y, state.players[1].score,
    state.star.x, state.star.y,
  ];
  let hash = 2166136261;
  for (const value of values) {
    hash = Math.imul(hash ^ (value >>> 0), 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
