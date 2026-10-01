const MINT = '#b9ef6c';
const CORAL = '#ff8069';
const GOLD = '#ffce6b';

function drawBackground(ctx) {
  ctx.fillStyle = '#0a202a';
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = '#183944';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }
  for (let y = 0; y <= 540; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#294c55';
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 15; column++) {
      ctx.fillRect(60 + column * 60 - 1, 60 + row * 60 - 1, 3, 3);
    }
  }
  ctx.strokeStyle = '#3b6064';
  ctx.lineWidth = 2;
  const corners = [[21, 21, 1, 1], [939, 21, -1, 1], [21, 519, 1, -1], [939, 519, -1, -1]];
  for (const [x, y, hx, vy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + hx * 24, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + vy * 24);
    ctx.stroke();
  }
  ctx.fillStyle = '#315460';
  ctx.font = '700 12px monospace';
  ctx.fillText('SECTOR A-01', 35, 50);
  ctx.fillText('20 FPS / LOCKSTEP', 774, 510);
}

function drawStar(ctx, star, frame) {
  const pulse = frame % 20 < 10 ? 0 : 3;
  const radius = 17 + pulse;
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 28;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(6, -6);
  ctx.lineTo(radius, 0);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, radius);
  ctx.lineTo(-6, 6);
  ctx.lineTo(-radius, 0);
  ctx.lineTo(-6, -6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff8d0';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.strokeStyle = '#ab8641';
  ctx.lineWidth = 2;
  ctx.strokeRect(-29, -29, 58, 58);
  ctx.restore();
}

function drawPlayer(ctx, player, index, frame) {
  const color = index === 0 ? MINT : CORAL;
  const x = player.x;
  const y = player.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(18, -7);
  ctx.lineTo(18, 13);
  ctx.lineTo(0, 21);
  ctx.lineTo(-18, 13);
  ctx.lineTo(-18, -7);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b2730';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(9, -3);
  ctx.lineTo(9, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-9, 8);
  ctx.lineTo(-9, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f9f7e9';
  ctx.fillRect(-3, -4, 6, 8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const orbit = frame % 30 < 15 ? 27 : 29;
  ctx.strokeRect(-orbit, -orbit, orbit * 2, orbit * 2);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.font = '800 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`P${index + 1}`, x, y - 37);
  ctx.textAlign = 'start';
}

export function renderArena(canvas, state) {
  const ctx = canvas.getContext('2d');
  drawBackground(ctx);
  if (!state) return;
  drawStar(ctx, state.star, state.frame);
  state.players.forEach((player, index) => drawPlayer(ctx, player, index, state.frame));
}
