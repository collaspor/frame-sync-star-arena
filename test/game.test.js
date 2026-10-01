import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, checksum, INPUT, WIDTH, HEIGHT, MAX_FRAMES, TARGET_SCORE } from '../shared/game.js';

test('同一种子和输入序列得到完全相同的每帧状态', () => {
  const inputs = [[INPUT.RIGHT, INPUT.LEFT], [INPUT.RIGHT | INPUT.DOWN, INPUT.UP], [0, 0]];
  let left = createGame(123456789);
  let right = createGame(123456789);
  for (let index = 0; index < 300; index++) {
    left = step(left, inputs[index % inputs.length]);
    right = step(right, inputs[index % inputs.length]);
    assert.deepEqual(left, right);
    assert.equal(checksum(left), checksum(right));
  }
});

test('规则状态全部是整数且玩家不能越界', () => {
  let state = createGame(42);
  for (let index = 0; index < 300; index++) {
    state = step(state, [INPUT.UP | INPUT.LEFT, INPUT.DOWN | INPUT.RIGHT]);
  }
  for (const player of state.players) {
    assert.ok(player.x >= 18 && player.x <= WIDTH - 18);
    assert.ok(player.y >= 18 && player.y <= HEIGHT - 18);
  }
  for (const number of [state.frame, state.seed, state.remaining, state.star.x, state.star.y, ...state.players.flatMap(({ x, y, score }) => [x, y, score])]) {
    assert.ok(Number.isInteger(number));
  }
});

test('拾取星星加分并推进唯一随机种子', () => {
  const state = createGame(71);
  const previousSeed = state.seed;
  state.players[0].x = state.star.x;
  state.players[0].y = state.star.y;
  const next = step(state, [0, 0]);
  assert.equal(next.players[0].score, 1);
  assert.equal(next.players[1].score, 0);
  assert.notEqual(next.seed, previousSeed);
  assert.deepEqual(state.players[0], { x: state.star.x, y: state.star.y, score: 0 });
});

test('达到目标分数后停在获胜帧', () => {
  const state = createGame(91);
  state.players[0].score = TARGET_SCORE - 1;
  state.players[0].x = state.star.x;
  state.players[0].y = state.star.y;
  const finished = step(state, [0, 0]);
  assert.equal(finished.phase, 'finished');
  assert.equal(finished.winner, 0);
  assert.deepEqual(step(finished, [INPUT.RIGHT, INPUT.LEFT]), finished);
});

test('时间结束时按比分判定', () => {
  const state = createGame(99);
  state.frame = MAX_FRAMES - 1;
  state.remaining = 1;
  state.players[1].score = 2;
  state.star = { x: WIDTH / 2, y: HEIGHT / 2 };
  const finished = step(state, [0, 0]);
  assert.equal(finished.phase, 'finished');
  assert.equal(finished.winner, 1);
  assert.equal(finished.remaining, 0);
});
