// game.js — Dapur Kilat: state, rules, input and all kitchen rendering.
// One clear job: run the cooking shift. Data lives in recipes.js, food art in
// draw.js, sounds in audio.js; this file only plays the game and draws the room.

import { INGREDIENTS, RECIPES, ingredientById, recipeById, recipesForLevel, plateMatchesRecipe, plateMatchCount } from './recipes.js';
import { drawIngredient, roundRect } from './draw.js';
import { SoundBank } from './audio.js';

const W = 1280;
const H = 720;
const SHIFT_SECONDS = 180;
const MAX_ORDERS = 3;
const MAX_HEARTS = 3;
const CHOP_SECONDS = 1.2;
const COOK_SECONDS = 2.5;

function mmss(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function text(ctx, str, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBank();
    this.hit = { slots: [], serve: null, trash: null, start: null, again: null, pause: null, mute: null };
    this.toastMsg = '';
    this.toastUntil = 0;
    this.shotMode = false;
    this.reset();
  }

  reset() {
    this.state = 'title'; // title | playing | paused | over
    this.score = 0;
    this.served = 0;
    this.combo = 0;
    this.level = 1;
    this.hearts = MAX_HEARTS;
    this.shiftTime = SHIFT_SECONDS;
    this.orders = [];
    this.plate = [];
    this.stove = [];
    this.board = null;
    this.queue = []; // ingredients waiting for a free chopping board or stove slot
    this.spawnTimer = 4;
    this.orderUid = 1;
    this.overReason = '';
    this.flash = 0;
  }

  startGame() {
    this.reset();
    this.state = 'playing';
    this.spawnOrder();
    this.spawnOrder();
  }

  levelFor(served) {
    return Math.min(3, 1 + Math.floor(served / 4));
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const menu = recipesForLevel(this.level);
    const recipe = menu[Math.floor(Math.random() * menu.length)];
    const total = Math.max(26, 50 - this.level * 3);
    this.orders.push({ uid: this.orderUid++, recipeId: recipe.id, timeLeft: total, totalTime: total });
  }

  toast(msg) {
    this.toastMsg = msg;
    this.toastUntil = performance.now() + 1800;
  }

  // Clicking (or pressing the key of) an ingredient on the counter.
  addIngredient(id) {
    if (this.state !== 'playing') return;
    const ing = ingredientById(id);
    if (!ing) return;
    if (ing.prep === 'none') {
      this.plate.push(id);
      this.sound.pop();
    } else if (ing.prep === 'chop') {
      if (this.board) { this.queue.push(id); this.toast(`${ing.name} masuk antrean potong.`); return; }
      this.startChop(id);
    } else if (ing.prep === 'cook') {
      if (this.stove.length >= 2) { this.queue.push(id); this.toast(`${ing.name} masuk antrean masak.`); return; }
      this.startCook(id);
    }
  }

  startChop(id) {
    this.board = { ing: id, t: 0, total: CHOP_SECONDS };
    this.sound.chop();
  }

  startCook(id) {
    this.stove.push({ ing: id, t: 0, total: COOK_SECONDS });
    this.sound.sizzle();
  }

  // Move queued ingredients into whichever station just freed up.
  drainQueue() {
    let moved = true;
    while (moved) {
      moved = false;
      for (let i = 0; i < this.queue.length; i++) {
        const ing = ingredientById(this.queue[i]);
        if (ing.prep === 'chop' && !this.board) {
          this.queue.splice(i, 1);
          this.startChop(ing.id);
          moved = true;
          break;
        }
        if (ing.prep === 'cook' && this.stove.length < 2) {
          this.queue.splice(i, 1);
          this.startCook(ing.id);
          moved = true;
          break;
        }
      }
    }
  }

  matchingOrder() {
    return this.orders.find((o) => plateMatchesRecipe(this.plate, recipeById(o.recipeId))) || null;
  }

  serveDish() {
    if (this.state !== 'playing') return;
    const order = this.matchingOrder();
    if (!order) {
      this.toast('Piring belum cocok dengan pesanan mana pun!');
      this.sound.fail();
      this.flash = 0.25;
      return;
    }
    const recipe = recipeById(order.recipeId);
    const timeBonus = Math.round(50 * (order.timeLeft / order.totalTime));
    const rushHour = this.shiftTime <= 30;
    let points = recipe.price + timeBonus + this.combo * 10;
    if (rushHour) points *= 2;
    this.score += points;
    this.served += 1;
    this.combo += 1;
    this.level = this.levelFor(this.served);
    this.orders = this.orders.filter((o) => o.uid !== order.uid);
    this.plate = [];
    this.toast(`+${points} — ${recipe.name} tersaji!${rushHour ? ' ⚡ RUSH HOUR x2!' : ''} Combo x${this.combo}`);
    this.sound.ding();
  }

  clearPlate() {
    if (this.state !== 'playing' || this.plate.length === 0) return;
    this.plate = [];
    this.score = Math.max(0, this.score - 10);
    this.toast('Piring dibuang (-10).');
  }

  removeLast() {
    if (this.state === 'playing') this.plate.pop();
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  endShift(reason) {
    this.state = 'over';
    this.overReason = reason;
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.shiftTime -= dt;
    if (this.shiftTime <= 0) { this.shiftTime = 0; this.endShift('shift'); return; }
    if (this.flash > 0) this.flash -= dt;

    if (!this.shotMode) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnOrder();
        this.spawnTimer = Math.max(5, 9 - this.level);
      }
    }

    for (const order of this.orders) order.timeLeft -= dt;
    const expired = this.orders.filter((o) => o.timeLeft <= 0);
    if (expired.length > 0) {
      this.orders = this.orders.filter((o) => o.timeLeft > 0);
      this.hearts -= expired.length;
      this.combo = 0;
      this.toast(`Pesanan hangus! -${expired.length} hati.`);
      this.sound.fail();
      if (this.hearts <= 0) { this.hearts = 0; this.endShift('hearts'); return; }
    }

    // In shot mode the staged scene stays frozen: stove and board keep the
    // progress the preset gave them, so screenshots are deterministic.
    if (!this.shotMode) {
      for (const job of this.stove) job.t += dt;
      const done = this.stove.filter((job) => job.t >= job.total);
      if (done.length > 0) {
        this.stove = this.stove.filter((job) => job.t < job.total);
        for (const job of done) this.plate.push(job.ing);
        this.sound.pop();
      }
      if (this.board) {
        this.board.t += dt;
        if (this.board.t >= this.board.total) {
          this.plate.push(this.board.ing);
          this.board = null;
          this.sound.pop();
        }
      }
      this.drainQueue();
    }
  }

  // ---- input ----

  handleClick(x, y) {
    const hit = this.hit;
    const inside = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (this.state === 'title') {
      if (inside(hit.start)) this.startGame();
      return;
    }
    if (this.state === 'over') {
      if (inside(hit.again)) this.startGame();
      return;
    }
    if (inside(hit.pause)) { this.togglePause(); return; }
    if (inside(hit.mute)) { this.sound.toggle(); return; }
    if (this.state !== 'playing') return;
    if (inside(hit.serve)) { this.serveDish(); return; }
    if (inside(hit.trash)) { this.clearPlate(); return; }
    for (const slot of hit.slots) {
      if (inside(slot.rect)) { this.addIngredient(slot.id); return; }
    }
    // Clicking the plate itself removes the top ingredient.
    if (hit.plate && inside(hit.plate)) { this.removeLast(); return; }
  }

  handleKey(key) {
    if (key === 'Enter') {
      if (this.state === 'title' || this.state === 'over') this.startGame();
      else if (this.state === 'playing') this.serveDish();
      return;
    }
    if (key === 'r' || key === 'R') {
      if (this.state === 'over') this.startGame();
      return;
    }
    if (key === 'p' || key === 'P' || key === 'Escape') { this.togglePause(); return; }
    if (key === 'm' || key === 'M') { this.sound.toggle(); return; }
    if (this.state !== 'playing') return;
    if (key === 'Backspace') { this.removeLast(); return; }
    if (key === 't' || key === 'T') { this.clearPlate(); return; }
    const ing = INGREDIENTS.find((item) => item.key === key);
    if (ing) this.addIngredient(ing.id);
  }

  // ---- drawing ----

  draw() {
    const ctx = this.ctx;
    this.drawKitchen(ctx);
    this.drawTopBar(ctx);
    this.drawOrderBoard(ctx);
    this.drawStove(ctx);
    this.drawBoard(ctx);
    this.drawPlateZone(ctx);
    this.drawMenu(ctx);
    this.drawCounter(ctx);
    this.drawToast(ctx);
    if (this.state === 'title') this.drawTitle(ctx);
    if (this.state === 'paused') this.drawPaused(ctx);
    if (this.state === 'over') this.drawGameOver(ctx);
  }

  drawKitchen(ctx) {
    ctx.fillStyle = '#f7d9a0';
    ctx.fillRect(0, 0, W, H);
    // Tiled wall.
    ctx.fillStyle = '#f2c98d';
    ctx.fillRect(0, 0, W, 470);
    ctx.strokeStyle = 'rgba(180, 120, 60, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 30; y < 470; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 92) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 470); ctx.stroke(); }
    // Window with sun.
    ctx.fillStyle = '#bfe6f5';
    roundRect(ctx, 1080, 84, 150, 110, 10); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(1140, 122, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(1195, 160, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Hanging pans.
    ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(640, 84); ctx.lineTo(640, 108); ctx.moveTo(700, 84); ctx.lineTo(700, 108); ctx.stroke();
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath(); ctx.arc(640, 132, 24, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(700, 132, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#777';
    ctx.beginPath(); ctx.arc(640, 132, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(700, 132, 14, 0, Math.PI * 2); ctx.fill();
    // Floor.
    ctx.fillStyle = '#c98f5a';
    ctx.fillRect(0, 470, W, 250);
    ctx.fillStyle = '#b57a45';
    for (let x = 0; x < W; x += 120) ctx.fillRect(x, 470, 4, 250);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(229, 87, 46, ${this.flash * 1.4})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawTopBar(ctx) {
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = '#ffd94d';
    text(ctx, '🍳 DAPUR KILAT', 20, 42, 'bold 30px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    text(ctx, `Skor ${this.score}`, 330, 41, 'bold 24px "Trebuchet MS", Verdana, sans-serif', '#ffffff');
    text(ctx, `Tersaji ${this.served}`, 500, 41, 'bold 24px "Trebuchet MS", Verdana, sans-serif', '#ffffff');
    text(ctx, `Level ${this.level}`, 650, 41, 'bold 24px "Trebuchet MS", Verdana, sans-serif', '#aee6ff');
    if (this.combo >= 2) text(ctx, `Combo x${this.combo}`, 760, 41, 'bold 24px "Trebuchet MS", Verdana, sans-serif', '#ff9d5c');
    // Hearts.
    for (let i = 0; i < MAX_HEARTS; i++) {
      ctx.fillStyle = i < this.hearts ? '#ff5a5a' : '#6b4a2f';
      ctx.beginPath(); ctx.arc(930 + i * 34, 32, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i < this.hearts ? '#ffffff' : '#4a2c14';
      text(ctx, '♥', 930 + i * 34, 38, 'bold 15px Verdana, sans-serif', i < this.hearts ? '#ffffff' : '#4a2c14', 'center');
    }
    // Shift timer — big, impossible to miss. Last 30 s are RUSH HOUR: x2 points.
    const urgent = this.shiftTime <= 30 && this.state === 'playing';
    const rushHour = this.shiftTime <= 30 && this.state === 'playing';
    ctx.fillStyle = rushHour ? '#ff9d5c' : '#ffffff';
    roundRect(ctx, 1000, 10, 142, 44, 8);
    ctx.fill();
    text(ctx, rushHour ? `⏱ ${mmss(this.shiftTime)} ⚡x2` : `⏱ ${mmss(this.shiftTime)}`, 1071, 42, 'bold 24px "Trebuchet MS", Verdana, sans-serif', urgent ? '#c0392b' : '#2b1d12', 'center');
    this.hit.pause = { x: 1150, y: 10, w: 52, h: 44 };
    ctx.fillStyle = '#8a5a2b'; roundRect(ctx, 1150, 10, 52, 44, 8); ctx.fill();
    text(ctx, 'II', 1176, 41, 'bold 22px Verdana, sans-serif', '#ffffff', 'center');
    this.hit.mute = { x: 1210, y: 10, w: 52, h: 44 };
    ctx.fillStyle = '#8a5a2b'; roundRect(ctx, 1210, 10, 52, 44, 8); ctx.fill();
    text(ctx, this.sound.enabled ? '♪' : '✕', 1236, 41, 'bold 22px Verdana, sans-serif', '#ffffff', 'center');
  }

  drawOrderBoard(ctx) {
    ctx.fillStyle = '#6b4423';
    roundRect(ctx, 16, 76, 592, 146, 12); ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    roundRect(ctx, 22, 82, 580, 134, 8); ctx.fill();
    text(ctx, '📋 ORDER BOARD', 36, 106, 'bold 18px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    text(ctx, 'sajikan sebelum habis!', 200, 106, '15px "Trebuchet MS", Verdana, sans-serif', '#f3e2c7');
    for (let i = 0; i < MAX_ORDERS; i++) {
      const x = 30 + i * 190;
      const y = 114;
      ctx.fillStyle = '#fff8e7';
      roundRect(ctx, x, y, 180, 94, 8); ctx.fill();
      const order = this.orders[i];
      if (!order) {
        text(ctx, '— kosong —', x + 90, y + 52, 'italic 15px "Trebuchet MS", Verdana, sans-serif', '#9a7b52', 'center');
        continue;
      }
      const recipe = recipeById(order.recipeId);
      const urgent = order.timeLeft <= 10;
      text(ctx, recipe.name, x + 10, y + 20, 'bold 16px "Trebuchet MS", Verdana, sans-serif', '#2b1d12');
      text(ctx, `Rp${recipe.price}`, x + 170, y + 20, 'bold 14px "Trebuchet MS", Verdana, sans-serif', '#2f7d3d', 'right');
      // Ingredient icons, ticked when already on the plate.
      const remaining = [...this.plate];
      recipe.needs.forEach((id, j) => {
        const ix = x + 18 + j * 26;
        const iy = y + 48;
        drawIngredient(ctx, id, ix, iy, 24);
        const at = remaining.indexOf(id);
        if (at >= 0) {
          remaining.splice(at, 1);
          ctx.fillStyle = '#2f9e44';
          ctx.beginPath(); ctx.arc(ix + 9, iy + 9, 8, 0, Math.PI * 2); ctx.fill();
          text(ctx, '✓', ix + 9, iy + 13, 'bold 11px Verdana, sans-serif', '#ffffff', 'center');
        }
      });
      // Countdown bar.
      const frac = Math.max(0, order.timeLeft / order.totalTime);
      ctx.fillStyle = '#e0cba8';
      roundRect(ctx, x + 10, y + 68, 160, 12, 6); ctx.fill();
      ctx.fillStyle = urgent ? '#e4572e' : frac > 0.5 ? '#58b368' : '#f2a007';
      roundRect(ctx, x + 10, y + 68, 160 * frac, 12, 6); ctx.fill();
      text(ctx, `${Math.ceil(order.timeLeft)} dtk`, x + 90, y + 95, 'bold 13px Verdana, sans-serif', urgent ? '#c0392b' : '#6b4a2f', 'center');
    }
  }

  drawStove(ctx) {
    ctx.fillStyle = '#3d3d3d';
    roundRect(ctx, 16, 232, 284, 188, 12); ctx.fill();
    text(ctx, '🔥 KOMPOR', 30, 258, 'bold 18px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    text(ctx, 'klik bahan "Masak dulu"', 30, 280, '14px "Trebuchet MS", Verdana, sans-serif', '#d8d8d8');
    for (let i = 0; i < 2; i++) {
      const cx = 80 + i * 150;
      const cy = 350;
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.stroke();
      const job = this.stove[i];
      if (job) {
        drawIngredient(ctx, job.ing, cx, cy - 4, 56);
        const frac = job.t / job.total;
        ctx.strokeStyle = '#ff9d5c'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, cy, 62, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
        text(ctx, 'kosong', cx, cy + 5, '13px Verdana, sans-serif', '#aaa', 'center');
      }
    }
    if (this.queue.length > 0) {
      text(ctx, `Antre: ${this.queue.map((id) => ingredientById(id).name).join(', ')}`, 30, 412, '14px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    }
  }

  drawBoard(ctx) {
    ctx.fillStyle = '#a4713b';
    roundRect(ctx, 316, 232, 292, 188, 12); ctx.fill();
    text(ctx, '🔪 TALENAN', 330, 258, 'bold 18px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    text(ctx, 'klik bahan "Potong dulu"', 330, 280, '14px "Trebuchet MS", Verdana, sans-serif', '#f3e2c7');
    // Wooden board.
    ctx.fillStyle = '#d9a066';
    roundRect(ctx, 340, 296, 244, 96, 10); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
    if (this.board) {
      drawIngredient(ctx, this.board.ing, 430, 344, 56);
      const frac = this.board.t / this.board.total;
      ctx.fillStyle = '#e0cba8';
      roundRect(ctx, 360, 402, 204, 10, 5); ctx.fill();
      ctx.fillStyle = '#58b368';
      roundRect(ctx, 360, 402, 204 * frac, 10, 5); ctx.fill();
      // Knife.
      ctx.fillStyle = '#cfd6dd';
      ctx.beginPath(); ctx.moveTo(500, 312); ctx.lineTo(556, 330); ctx.lineTo(500, 348); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a2c14'; ctx.fillRect(556, 324, 22, 12);
    } else {
      text(ctx, 'talenen kosong — potong selada / tomat di sini', 462, 348, 'italic 14px "Trebuchet MS", Verdana, sans-serif', '#6b4a2f', 'center');
    }
  }

  drawPlateZone(ctx) {
    ctx.fillStyle = 'rgba(255, 248, 231, 0.92)';
    roundRect(ctx, 624, 232, 380, 238, 12); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, '🍽️ PIRING — susun pesanan di sini', 640, 258, 'bold 17px "Trebuchet MS", Verdana, sans-serif', '#4a2c14');
    // The plate.
    const px = 814;
    const py = 360;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(px, py, 150, 62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9b18a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#f3e9d2';
    ctx.beginPath(); ctx.ellipse(px, py, 118, 46, 0, 0, Math.PI * 2); ctx.fill();
    this.hit.plate = { x: px - 150, y: py - 62, w: 300, h: 124 };
    // Stacked dish, mid-assembly: layers rise as ingredients land.
    const n = this.plate.length;
    this.plate.forEach((id, i) => {
      drawIngredient(ctx, id, px, py - 6 - i * 13, 52);
    });
    if (n === 0) text(ctx, 'piring kosong — klik bahan di meja bawah', px, py + 4, 'italic 14px "Trebuchet MS", Verdana, sans-serif', '#9a7b52', 'center');
    else text(ctx, `${n} bahan di piring — klik piring untuk ambil 1`, px, py + 84, '13px Verdana, sans-serif', '#6b4a2f', 'center');
    // Serve + trash buttons.
    const match = this.matchingOrder();
    this.hit.serve = { x: 640, y: 424, w: 220, h: 38 };
    ctx.fillStyle = match ? '#2f9e44' : '#8a8a8a';
    roundRect(ctx, 640, 424, 220, 38, 9); ctx.fill();
    if (match) {
      ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 3;
      roundRect(ctx, 640, 424, 220, 38, 9); ctx.stroke();
    }
    text(ctx, match ? '✅ SAJIKAN! (Enter)' : 'SAJIKAN (Enter)', 750, 449, 'bold 17px "Trebuchet MS", Verdana, sans-serif', '#ffffff', 'center');
    this.hit.trash = { x: 876, y: 424, w: 112, h: 38 };
    ctx.fillStyle = '#c0392b';
    roundRect(ctx, 876, 424, 112, 38, 9); ctx.fill();
    text(ctx, '🗑 Buang (T)', 932, 449, 'bold 15px "Trebuchet MS", Verdana, sans-serif', '#ffffff', 'center');
  }

  drawMenu(ctx) {
    ctx.fillStyle = '#4a2c14';
    roundRect(ctx, 1020, 76, 244, 394, 12); ctx.fill();
    text(ctx, '📖 MENU HARI INI', 1036, 106, 'bold 18px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    const menu = RECIPES;
    menu.forEach((recipe, i) => {
      const y = 120 + i * 54;
      const locked = recipe.level > this.level;
      ctx.fillStyle = locked ? '#5b4636' : '#fff8e7';
      roundRect(ctx, 1032, y, 220, 48, 8); ctx.fill();
      text(ctx, locked ? `🔒 ${recipe.name}` : recipe.name, 1042, y + 19, 'bold 15px "Trebuchet MS", Verdana, sans-serif', locked ? '#cbb693' : '#2b1d12');
      text(ctx, `Rp${recipe.price} · Lv${recipe.level}`, 1042, y + 38, '13px Verdana, sans-serif', locked ? '#a08b6d' : '#6b4a2f');
      // Mini ingredient icons on the right edge.
      recipe.needs.slice(0, 4).forEach((id, j) => drawIngredient(ctx, id, 1168 + j * 20, y + 24, 18));
    });
    text(ctx, 'Buka resep baru tiap 4 pesanan tersaji.', 1142, 462, 'italic 13px "Trebuchet MS", Verdana, sans-serif', '#f3e2c7', 'center');
  }

  drawCounter(ctx) {
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(0, 486, W, 234);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, 486, W, 14);
    text(ctx, 'MEJA BAHAN — klik bahan (atau tekan 1-0)  |  POTONG = potong dulu  |  MASAK = masak dulu', 20, 528, 'bold 18px "Trebuchet MS", Verdana, sans-serif', '#ffd94d');
    this.hit.slots = [];
    const slotW = 122;
    const gap = 6;
    INGREDIENTS.forEach((ing, i) => {
      const x = 10 + i * (slotW + gap);
      const y = 540;
      const rect = { x, y, w: slotW, h: 160 };
      this.hit.slots.push({ id: ing.id, rect });
      ctx.fillStyle = '#fff8e7';
      roundRect(ctx, x, y, slotW, 160, 10); ctx.fill();
      ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 3; ctx.stroke();
      drawIngredient(ctx, ing.id, x + slotW / 2, y + 58, 74);
      text(ctx, ing.name, x + slotW / 2, y + 118, 'bold 17px "Trebuchet MS", Verdana, sans-serif', '#2b1d12', 'center');
      const badge = ing.prep === 'chop' ? '🔪 POTONG' : ing.prep === 'cook' ? '🔥 MASAK' : '✓ SIAP';
      ctx.fillStyle = ing.prep === 'none' ? '#2f9e44' : '#e4572e';
      roundRect(ctx, x + 16, y + 126, slotW - 32, 22, 6); ctx.fill();
      text(ctx, badge, x + slotW / 2, y + 142, 'bold 12px Verdana, sans-serif', '#ffffff', 'center');
      // Key hint.
      ctx.fillStyle = '#4a2c14';
      ctx.beginPath(); ctx.arc(x + slotW - 16, y + 16, 12, 0, Math.PI * 2); ctx.fill();
      text(ctx, ing.key, x + slotW - 16, y + 21, 'bold 13px Verdana, sans-serif', '#ffffff', 'center');
    });
  }

  drawToast(ctx) {
    if (performance.now() > this.toastUntil || !this.toastMsg) return;
    ctx.font = 'bold 19px "Trebuchet MS", Verdana, sans-serif';
    const w = ctx.measureText(this.toastMsg).width + 36;
    ctx.fillStyle = 'rgba(43, 29, 18, 0.92)';
    roundRect(ctx, (W - w) / 2, 476, w, 40, 10); ctx.fill();
    text(ctx, this.toastMsg, W / 2, 503, 'bold 19px "Trebuchet MS", Verdana, sans-serif', '#ffd94d', 'center');
  }

  drawTitle(ctx) {
    ctx.fillStyle = 'rgba(43, 29, 18, 0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 290, 110, 700, 480, 18); ctx.fill();
    ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 5; ctx.stroke();
    text(ctx, '🍳 DAPUR KILAT', 640, 200, 'bold 64px "Trebuchet MS", Verdana, sans-serif', '#e4572e', 'center');
    text(ctx, 'Warung Rush — game memasak serba cepat', 640, 242, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#4a2c14', 'center');
    const lines = [
      '1. Pesanan muncul di ORDER BOARD — tiap pesanan punya batas waktu.',
      '2. Klik bahan di MEJA BAHAN (atau tekan 1-0).',
      '3. Bahan 🔪 dipotong di TALENAN, bahan 🔥 dimasak di KOMPOR.',
      '4. Susun di PIRING sampai cocok, lalu tekan SAJIKAN (Enter).',
      '5. Pesanan hangus = kehilangan 1 hati. Shift 3 menit — sajikan sebanyak mungkin!',
    ];
    lines.forEach((line, i) => text(ctx, line, 640, 300 + i * 34, '18px "Trebuchet MS", Verdana, sans-serif', '#2b1d12', 'center'));
    this.hit.start = { x: 490, y: 500, w: 300, h: 56 };
    ctx.fillStyle = '#2f9e44';
    roundRect(ctx, 490, 500, 300, 56, 12); ctx.fill();
    text(ctx, '▶ MULAI MASAK (Enter)', 640, 536, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffffff', 'center');
    text(ctx, 'P jeda • M suara (mati dulu) • T buang piring • Backspace ambil 1 bahan', 640, 578, '14px Verdana, sans-serif', '#6b4a2f', 'center');
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(43, 29, 18, 0.7)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, '⏸ JEDA', 640, 330, 'bold 64px "Trebuchet MS", Verdana, sans-serif', '#ffd94d', 'center');
    text(ctx, 'Tekan P atau klik II untuk lanjut masak', 640, 380, '20px "Trebuchet MS", Verdana, sans-serif', '#ffffff', 'center');
  }

  drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(43, 29, 18, 0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 340, 150, 600, 400, 18); ctx.fill();
    ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 5; ctx.stroke();
    const title = this.overReason === 'hearts' ? '💔 DAPUR TUTUP!' : '⏰ SHIFT SELESAI!';
    const sub = this.overReason === 'hearts' ? 'Tiga pesanan hangus — pelanggan kabur semua.' : 'Waktu shift habis — dapur bersih-bersih.';
    text(ctx, title, 640, 230, 'bold 52px "Trebuchet MS", Verdana, sans-serif', '#e4572e', 'center');
    text(ctx, sub, 640, 272, '19px "Trebuchet MS", Verdana, sans-serif', '#4a2c14', 'center');
    text(ctx, `Skor akhir: ${this.score}`, 640, 340, 'bold 30px "Trebuchet MS", Verdana, sans-serif', '#2b1d12', 'center');
    text(ctx, `Pesanan tersaji: ${this.served}   •   Level: ${this.level}   •   Combo terbaik: x${Math.max(this.combo, 1)}`, 640, 384, '19px "Trebuchet MS", Verdana, sans-serif', '#2b1d12', 'center');
    this.hit.again = { x: 490, y: 430, w: 300, h: 56 };
    ctx.fillStyle = '#2f9e44';
    roundRect(ctx, 490, 430, 300, 56, 12); ctx.fill();
    text(ctx, '↻ MAIN LAGI (R)', 640, 466, 'bold 22px "Trebuchet MS", Verdana, sans-serif', '#ffffff', 'center');
  }
}
