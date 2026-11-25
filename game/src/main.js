// main.js — bootstrap for Dapur Kilat. One clear job: wire the canvas, the loop
// and the input to the Game, and stage fixed scenes for screenshots (?shot=).

import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;

function toCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 720,
  };
}

canvas.addEventListener('click', (event) => {
  const at = toCanvasCoords(event);
  game.handleClick(at.x, at.y);
});

window.addEventListener('keydown', (event) => {
  if (['Backspace', 'Enter', ' '].includes(event.key)) event.preventDefault();
  game.handleKey(event.key);
});

// Fixed scenes so screenshots show the game at its best, every time.
//   ?shot=start  title screen over the kitchen
//   ?shot=play   mid-shift: 2 orders, a dish mid-assembly, stove + board busy
//   ?shot=rush   late shift: 3 orders, 1 heart left, 44 seconds on the clock
//   ?shot=end    game-over screen with a final score
function applyShot(shot) {
  if (!shot || shot === 'start') return;
  game.shotMode = true;
  if (shot === 'play') {
    game.startGame();
    game.score = 320;
    game.served = 3;
    game.combo = 2;
    game.level = 1;
    game.shiftTime = 151;
    game.orders = [
      { uid: 101, recipeId: 'burger', timeLeft: 28, totalTime: 45 },
      { uid: 102, recipeId: 'mie', timeLeft: 18, totalTime: 40 },
    ];
    game.plate = ['bun', 'patty'];
    game.stove = [{ ing: 'patty', t: 1.5, total: 2.5 }];
    game.board = { ing: 'lettuce', t: 0.6, total: 1.2 };
  } else if (shot === 'rush') {
    game.startGame();
    game.score = 860;
    game.served = 9;
    game.combo = 4;
    game.level = 3;
    game.shiftTime = 44;
    game.hearts = 1;
    game.orders = [
      { uid: 201, recipeId: 'burgerdouble', timeLeft: 6, totalTime: 30 },
      { uid: 202, recipeId: 'miekuah', timeLeft: 22, totalTime: 32 },
      { uid: 203, recipeId: 'nasitelur', timeLeft: 14, totalTime: 35 },
    ];
    game.plate = ['noodle', 'broth', 'egg'];
    game.stove = [
      { ing: 'egg', t: 2.0, total: 2.5 },
      { ing: 'noodle', t: 0.8, total: 2.5 },
    ];
    game.board = { ing: 'tomato', t: 0.9, total: 1.2 };
  } else if (shot === 'end') {
    game.startGame();
    game.score = 1240;
    game.served = 11;
    game.combo = 3;
    game.level = 3;
    game.shiftTime = 0;
    game.endShift('shift');
  }
}

const params = new URLSearchParams(window.location.search);
applyShot(params.get('shot'));

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
