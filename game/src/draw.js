// draw.js — all food art, drawn with canvas shapes only (no images, no network).
// One clear job: make every ingredient look worth serving. Every drawing is
// centred on (x, y) and fits inside a square of side `size`.

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawIngredient(ctx, id, x, y, size) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.strokeStyle = 'rgba(60, 30, 10, 0.55)';
  switch (id) {
    case 'bun': {
      ctx.fillStyle = '#e8a94f';
      roundRect(ctx, -s * 0.48, -s * 0.34, s * 0.96, s * 0.68, s * 0.3);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6cd8a';
      roundRect(ctx, -s * 0.48, -s * 0.34, s * 0.96, s * 0.3, s * 0.14);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      for (const [dx, dy] of [[-0.22, -0.2], [0.05, -0.24], [0.26, -0.16], [-0.05, -0.1], [0.18, -0.06]]) {
        ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.045, s * 0.028, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = '#7a4a21';
      roundRect(ctx, -s * 0.48, -s * 0.26, s * 0.96, s * 0.52, s * 0.18);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5d3413';
      for (const [dx, dy] of [[-0.3, -0.05], [-0.08, 0.1], [0.16, -0.1], [0.32, 0.06]]) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.045, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 190, 120, 0.5)';
      ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.12); ctx.lineTo(s * 0.4, -s * 0.12); ctx.stroke();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-s * 0.46, s * 0.3); ctx.lineTo(s * 0.46, s * 0.3); ctx.lineTo(s * 0.46, -s * 0.12);
      ctx.lineTo(-s * 0.1, -s * 0.3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9962b';
      for (const [dx, dy] of [[-0.2, 0.12], [0.14, 0.05], [0.3, 0.18]]) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = -s * 0.48 + (i * s * 0.96) / 8;
        const py = (i % 2 === 0 ? -s * 0.18 : s * 0.18) * 0.9;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineTo(s * 0.48, s * 0.3); ctx.lineTo(-s * 0.48, s * 0.3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#2f7d3d';
      ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.4, 0); ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e4572e';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4845f';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd9c9';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.16, Math.sin(a) * s * 0.16, s * 0.07, s * 0.045, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#3f9e4d';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.44, s * 0.1, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#fdf6df';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.46, s * 0.36, 0.15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2a007';
      ctx.beginPath(); ctx.arc(s * 0.05, s * 0.02, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.02, s * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'noodle': {
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const yy = -s * 0.24 + i * s * 0.17;
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, yy);
        ctx.bezierCurveTo(-s * 0.2, yy - s * 0.12, s * 0.1, yy + s * 0.12, s * 0.42, yy);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(60, 30, 10, 0.4)'; ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.48, s * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'broth': {
      ctx.fillStyle = '#b5541e';
      ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.46, s * 0.3, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d98e32';
      ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.4, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#58b368';
      ctx.beginPath(); ctx.ellipse(-s * 0.12, s * 0.02, s * 0.12, s * 0.05, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(s * 0.16, s * 0.08, s * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'chili': {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.1);
      ctx.quadraticCurveTo(0, s * 0.42, s * 0.42, -s * 0.22);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.05, -s * 0.1, -s * 0.28);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3f9e4d'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.12); ctx.quadraticCurveTo(-s * 0.52, -s * 0.3, -s * 0.34, -s * 0.34); ctx.stroke();
      break;
    }
    case 'rice': {
      ctx.fillStyle = '#f5f0e1';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.1, s * 0.46, s * 0.3, 0, Math.PI, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffdf4';
      for (const [dx, dy] of [[-0.2, -0.08], [0.05, -0.18], [0.24, -0.06], [-0.02, 0.02]]) {
        ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.07, s * 0.045, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    default: {
      ctx.fillStyle = '#cccccc';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}
