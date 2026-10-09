import Phaser from 'phaser';
import type { Theme } from './levels';

const INK = '#332a50';
const WHITE = '#fff9ee';
const CREAM = '#fff2dc';
const ORANGE = '#ff9e43';
const VIOLET = '#a35bfa';

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function texture(scene: Phaser.Scene, key: string, w: number, h: number, fn: Painter, scale = 2): void {
  const raw = document.createElement('canvas');
  raw.width = w; raw.height = h;
  const c = raw.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  fn(c, w, h);
  const big = document.createElement('canvas');
  big.width = w * scale; big.height = h * scale;
  const b = big.getContext('2d')!;
  b.imageSmoothingEnabled = false;
  b.drawImage(raw, 0, 0, big.width, big.height);
  scene.textures.addCanvas(key, big);
}
const rect = (c: CanvasRenderingContext2D, col: string, x: number, y: number, w: number, h: number): void => {
  c.fillStyle = col; c.fillRect(x, y, w, h);
};
const point = (c: CanvasRenderingContext2D, col: string, x: number, y: number): void => rect(c, col, x, y, 1, 1);
function oval(c: CanvasRenderingContext2D, col: string, cx: number, cy: number, rx: number, ry: number): void {
  c.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy / (ry * ry))));
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function duck(c: CanvasRenderingContext2D, mode: string, f: number): void {
  const running = mode === 'run';
  const jump = mode === 'jump' || mode === 'bounce';
  const fall = mode === 'fall';
  const phone = mode === 'phone';
  const win = mode === 'victory';
  const hurt = mode === 'hurt';
  const bounce = Math.sin(f * 1.55) > 0;
  const bob = running ? (f % 2) : win ? (f % 2) : 0;
  const footA = running ? (bounce ? -3 : 2) : win ? -2 : 0;
  const footB = running ? (bounce ? 3 : -2) : 0;
  const blink = mode === 'idle' && f === 3;
  const cY = phone ? 3 : bob;
  // The tail and feet are deliberately oversized for character readability.
  rect(c, INK, 5, 22 + cY, 8, 9); rect(c, WHITE, 4, 21 + cY, 8, 8);
  rect(c, INK, 9 + footA, 34 + cY, 8, 5); rect(c, ORANGE, 10 + footA, 34 + cY, 8, 4);
  rect(c, '#e97643', 10 + footA, 37 + cY, 9, 2);
  rect(c, INK, 20 + footB, 34 + cY, 7, 5); rect(c, ORANGE, 20 + footB, 34 + cY, 8, 4);
  rect(c, '#e97643', 19 + footB, 37 + cY, 9, 2);
  // Body and jersey.
  oval(c, INK, 16, 27 + cY, 12, 11);
  oval(c, WHITE, 16, 26 + cY, 11, 10);
  rect(c, '#8b52db', 8, 27 + cY, 17, 6); rect(c, VIOLET, 7, 24 + cY, 19, 8);
  rect(c, '#cc9aff', 9, 24 + cY, 12, 2);
  rect(c, '#2fc3bb', 10, 32 + cY, 16, 3); rect(c, '#2888b4', 12, 34 + cY, 6, 2);
  rect(c, INK, 17, 32 + cY, 2, 4);
  // Wing movement.
  if (jump || fall || win) {
    rect(c, INK, 3, 17 + cY, 9, 5); rect(c, WHITE, 4, 17 + cY, 9, 4);
    rect(c, INK, 24, 19 + cY, 5, 8); rect(c, WHITE, 24, 19 + cY, 4, 8);
  } else {
    oval(c, INK, 8, 26 + cY + (running && bounce ? -2 : 0), 5, 6);
    oval(c, WHITE, 8, 25 + cY + (running && bounce ? -2 : 0), 4, 5);
    rect(c, CREAM, 7, 29 + cY, 3, 2);
  }
  // Big head with strong dark pixel outline.
  oval(c, INK, 18, 13 + cY, 13, 12);
  oval(c, WHITE, 18, 12 + cY, 12, 11);
  rect(c, WHITE, 8, 20 + cY, 17, 4);
  rect(c, INK, 11, cY, 4, 5); rect(c, WHITE, 12, cY, 3, 5);
  rect(c, INK, 17, 1 + cY, 4, 4); rect(c, WHITE, 17, 1 + cY, 3, 4);
  rect(c, '#e6eaff', 9, 7 + cY, 5, 2);
  if (blink || hurt) {
    rect(c, INK, 22, 11 + cY, 5, 2);
  } else if (phone) {
    rect(c, INK, 23, 15 + cY, 3, 3);
  } else {
    rect(c, INK, 22, 10 + cY, 5, 7);
    rect(c, WHITE, 24, 11 + cY, 2, 2);
  }
  rect(c, '#ffc2d2', 16, 17 + cY, 5, 2);
  // Beak and lower lip point to the right.
  rect(c, INK, 25, 18 + cY, 7, 5); rect(c, ORANGE, 25, 18 + cY, 7, 4);
  rect(c, '#ffbc65', 28, 19 + cY, 4, 2);
  rect(c, '#dc7042', 27, 22 + cY, 4, 2);
  if (mode === 'bounce') { rect(c, '#ffffff', 22, 8 + cY, 4, 2); }
  if (phone) {
    rect(c, INK, 20, 26, 8, 12); rect(c, '#6eeaff', 21, 27, 6, 9);
    rect(c, '#ff90cd', 22, 28, 4, 3); rect(c, WHITE, 23, 33, 2, 1);
    rect(c, WHITE, 16, 31, 6, 3);
  }
  if (win) {
    rect(c, INK, 20, 11 + cY, 9, 5);
    rect(c, '#171634', 21, 12 + cY, 8, 4);
    rect(c, '#ffffff', 21, 12 + cY, 3, 1);
  }
}

function drawKernel(c: CanvasRenderingContext2D, bad: boolean, frame: number): void {
  if (bad) {
    oval(c, '#1cb9ff', 7, 8, 6 + (frame % 2), 7);
    oval(c, '#344ac7', 7, 8, 5, 6);
    oval(c, '#161126', 7, 8, 4, 5);
    rect(c, '#6beaff', 5, 4, 2, 2); rect(c, '#08071a', 8, 10, 2, 2);
  } else {
    oval(c, '#ae621e', 6, 8, 5, 7);
    oval(c, frame === 0 ? '#ffd355' : '#ffdf72', 6, 7, 4, 6);
    rect(c, '#fff4b6', 4, 3, 2, 3); rect(c, '#f9a934', 8, 10, 2, 2);
    rect(c, '#fff9cf', 3, 6, 1, 2);
  }
}

function spring(c: CanvasRenderingContext2D, frame: number): void {
  const squash = frame === 1 ? 5 : 0;
  // Foliage and curved cob, drawn horizontally like a trampoline.
  rect(c, INK, 5, 20, 42, 5);
  oval(c, '#287a53', 13, 18, 12, 6);
  oval(c, '#39aa70', 37, 18, 13, 6);
  for (let j = 0; j < 3; j++) rect(c, '#73d796', 10 + j * 14, 16, 8, 4);
  oval(c, INK, 26, 11 + squash / 2, 24, 11 - squash / 2);
  oval(c, '#ef9b35', 26, 10 + squash / 2, 23, 10 - squash / 2);
  oval(c, '#ffce4d', 26, 9 + squash / 2, 21, 9 - squash / 2);
  for (let y = 3 + squash; y < 16; y += 4) for (let x = 8; x < 45; x += 6) {
    rect(c, ((x + y) % 3 === 0) ? '#ffe987' : '#f5b642', x, y, 4, 3);
  }
  rect(c, '#fff6bc', 13, 2 + squash, 21, 2);
}

function gull(c: CanvasRenderingContext2D, f: number): void {
  const up = f === 0;
  // Silly oversized seagull; deliberately animated wing silhouettes.
  oval(c, INK, 16, 10, 11, 6); oval(c, WHITE, 16, 9, 10, 5);
  if (up) {
    rect(c, INK, 3, 1, 9, 7); rect(c, '#d4e1ed', 4, 2, 8, 5);
    rect(c, INK, 20, 0, 9, 7); rect(c, '#d4e1ed', 21, 1, 7, 5);
  } else {
    rect(c, INK, 2, 11, 11, 6); rect(c, '#d4e1ed', 3, 11, 9, 4);
    rect(c, INK, 20, 11, 11, 6); rect(c, '#d4e1ed', 21, 11, 9, 4);
  }
  rect(c, INK, 20, 4, 4, 4); rect(c, '#ffffff', 20, 4, 3, 2);
  rect(c, '#fabc62', 25, 9, 6, 3);
  rect(c, INK, 12, 15, 2, 3); rect(c, INK, 19, 15, 2, 3);
  rect(c, '#ffb452', 12, 17, 4, 1); rect(c, '#ffb452', 19, 17, 4, 1);
}

function post(c: CanvasRenderingContext2D): void {
  rect(c, INK, 1, 24, 19, 5); rect(c, '#484269', 3, 23, 15, 4);
  rect(c, INK, 3, 0, 15, 25);
  rect(c, '#a97bf3', 4, 1, 13, 22); rect(c, '#e8b0fa', 6, 1, 3, 22);
  rect(c, '#ffb777', 4, 6, 13, 5); rect(c, '#ffcfaa', 5, 7, 11, 2);
  rect(c, '#ffb777', 4, 18, 13, 3);
  rect(c, INK, 7, 12, 3, 2); rect(c, INK, 12, 12, 3, 2);
  rect(c, INK, 9, 16, 4, 1);
  rect(c, '#fff0d0', 7, 3, 7, 2);
}

function portal(c: CanvasRenderingContext2D, f: number): void {
  const pulse = f === 1;
  for (let y = 2; y < 44; y++) {
    const r = Math.sqrt(Math.max(0, 1 - ((y - 22) / 21) ** 2));
    const maxx = Math.round(r * 12);
    for (let x = 13 - maxx; x <= 13 + maxx; x++) {
      const edge = x - (13 - maxx) < 3 || (13 + maxx) - x < 3;
      if (edge) point(c, pulse ? '#87f9e7' : '#fc8ceb', x, y);
      else point(c, ((x + y) % 6 < 3) ? '#4339a8' : '#312873', x, y);
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = (i * 7 + 3) % 23 + 2;
    const y = (i * 11 + (pulse ? 4 : 0)) % 33 + 6;
    rect(c, i % 2 ? '#8cfcf8' : '#fff2a8', x, y, 2, 2);
  }
  rect(c, '#fff9ff', 13, 0, 2, 3);
}

function phone(c: CanvasRenderingContext2D, f: number): void {
  rect(c, '#e7b2ff', 1, 0, 15, 27);
  rect(c, INK, 2, 0, 13, 27);
  rect(c, '#8d5fe8', 3, 2, 11, 22);
  rect(c, f % 2 ? '#fe7bad' : '#81f1ed', 4, 3, 9, 7);
  rect(c, '#ffdb65', 5, 4, 3, 3);
  rect(c, '#ffeff9', 4, 12, 9, 2);
  rect(c, '#e6b8ff', 4, 17, 8, 2);
  rect(c, '#faf8ff', 8, 25, 3, 1);
  rect(c, '#fff9cd', 0, 7, 2, 3);
}

function flag(c: CanvasRenderingContext2D): void {
  rect(c, INK, 5, 3, 4, 62); rect(c, '#e9f0ff', 6, 3, 2, 62);
  rect(c, '#c782f6', 9, 5, 26, 22); rect(c, '#f7b3d7', 10, 6, 23, 18);
  rect(c, '#6c48c8', 9, 24, 18, 3);
  oval(c, '#eab045', 21, 15, 6, 8); oval(c, '#ffe072', 21, 15, 5, 7);
  rect(c, '#fff5cb', 19, 12, 2, 3);
  rect(c, INK, 2, 64, 10, 2);
}

function grassBonus(c: CanvasRenderingContext2D): void {
  rect(c, '#3a735c', 3, 15, 27, 6); rect(c, '#69d49c', 1, 13, 30, 4);
  rect(c, '#55bd7a', 4, 7, 5, 9); rect(c, '#67e89e', 11, 4, 4, 12);
  rect(c, '#3eb886', 19, 7, 4, 9); rect(c, '#ff8bb4', 17, 3, 5, 5);
  rect(c, '#fff9cc', 19, 5, 2, 2); rect(c, '#fffad0', 5, 11, 3, 3);
}
function heart(c: CanvasRenderingContext2D): void {
  rect(c, '#ffa0ba', 4, 4, 6, 5); rect(c, '#ffa0ba', 13, 4, 6, 5);
  rect(c, '#ff6597', 3, 7, 17, 7); rect(c, '#ff6597', 6, 14, 11, 4);
  rect(c, '#ff6597', 9, 18, 5, 3); rect(c, '#ffe0ee', 6, 6, 3, 3);
}
function supportCorn(c: CanvasRenderingContext2D): void {
  oval(c, INK, 12, 12, 9, 11); oval(c, '#ffce4b', 12, 11, 8, 10);
  rect(c, '#66ca86', 3, 16, 6, 8); rect(c, '#51b97e', 15, 18, 7, 6);
  rect(c, '#ffe996', 7, 3, 3, 3); rect(c, '#ffe996', 13, 6, 3, 3);
  rect(c, INK, 9, 10, 2, 2); rect(c, INK, 15, 10, 2, 2);
  rect(c, '#a45635', 11, 15, 4, 1);
}

function makeSky(scene: Phaser.Scene, theme: Theme): void {
  texture(scene, `sky_${theme}`, 480, 270, (c, w, h) => {
    const palettes = {
      field: ['#a9dbef', '#b4e3eb', '#c8ebe5', '#dbf0d9', '#f9edcb'],
      coast: ['#aeb4f5', '#b9b5f4', '#dfb8e4', '#fbd0d4', '#ffe2bb'],
      neon: ['#171839', '#29214f', '#3c265e', '#60316f', '#953b89'],
    };
    for (let y = 0; y < h; y += 2) {
      const i = Math.min(4, Math.floor((y / h) * 5));
      rect(c, palettes[theme][i], 0, y, w, 2);
    }
    if (theme !== 'neon') {
      oval(c, theme === 'field' ? '#ffe5a4' : '#ffbeaa', 388, 62, 30, 30);
      oval(c, theme === 'field' ? '#fff4d6' : '#ffd9c6', 388, 59, 25, 25);
    } else {
      oval(c, '#a946aa', 373, 86, 39, 39);
      oval(c, '#fe92b0', 373, 83, 35, 35);
      for (let y = 77; y < 125; y += 7) rect(c, '#803582', 336, y, 77, Math.floor((y - 70) / 8));
    }
    const r = seeded(theme === 'field' ? 391 : theme === 'coast' ? 214 : 931);
    if (theme === 'neon') {
      for (let i = 0; i < 120; i++) {
        const x = Math.floor(r() * w), y = Math.floor(r() * 145);
        rect(c, r() > .72 ? '#f9d1ec' : '#8272bf', x, y, r() > .93 ? 2 : 1, 1);
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(r() * w), y = 18 + Math.floor(r() * 80);
        const col = theme === 'field' ? '#f8fcf0' : '#fff2eb';
        oval(c, col, x + 14, y + 8, 14, 8);
        oval(c, col, x + 27, y + 10, 17, 7);
        oval(c, col, x + 19, y + 4, 10, 9);
      }
    }
  });

  texture(scene, `back_${theme}`, 480, 270, (c, w) => {
    const r = seeded(theme === 'field' ? 33 : theme === 'coast' ? 49 : 515);
    if (theme === 'field') {
      c.fillStyle = '#b0d99d';
      c.beginPath(); c.moveTo(0, 207);
      for (let x = 0; x <= w; x += 12) c.lineTo(x, 175 - Math.sin(x / 54) * 19 - Math.sin(x / 107) * 15);
      c.lineTo(w, 270); c.lineTo(0, 270); c.fill();
      c.fillStyle = '#8bcb8c';
      c.beginPath(); c.moveTo(0, 233);
      for (let x = 0; x <= w; x += 10) c.lineTo(x, 206 - Math.cos(x / 49) * 23);
      c.lineTo(w, 270); c.lineTo(0, 270); c.fill();
      for (let x = 10; x < 480; x += 27) {
        rect(c, '#569c70', x, 195 + Math.sin(x) * 10, 2, 33);
        rect(c, '#e9ba5d', x - 4, 191 + Math.sin(x) * 10, 8, 17);
        rect(c, '#6ab67a', x - 7, 204 + Math.sin(x) * 10, 7, 4);
      }
    } else if (theme === 'coast') {
      rect(c, '#ffb1bc', 0, 173, w, 24);
      rect(c, '#80c4e0', 0, 194, w, 76);
      for (let i = 0; i < 38; i++) {
        const x = Math.floor(r() * 480), y = 204 + Math.floor(r() * 64);
        rect(c, i % 3 ? '#a6deef' : '#dff5ef', x, y, 7 + Math.floor(r() * 15), 1);
      }
      for (let i = 0; i < 14; i++) {
        const x = i * 38 + Math.floor(r() * 10);
        const height = 27 + Math.floor(r() * 25);
        rect(c, '#ab9bc4', x, 193 - height, 25, height);
        rect(c, '#efc8d4', x + 2, 194 - height, 21, 3);
        for (let y = 200 - height; y < 190; y += 9) rect(c, '#ffebdf', x + 7, y, 3, 4);
      }
    } else {
      for (let i = 0; i < 32; i++) {
        const x = i * 17;
        const tall = 45 + Math.floor(r() * 78);
        rect(c, i % 3 ? '#262347' : '#322550', x, 215 - tall, 16, tall + 60);
        rect(c, '#9352a4', x, 215 - tall, 16, 2);
        for (let y = 220 - tall; y < 215; y += 10) {
          if (r() > 0.3) rect(c, r() > .5 ? '#76eced' : '#ed79bf', x + 4, y, 3, 3);
        }
      }
      rect(c, '#3c2765', 0, 220, 480, 50);
      for (let x = 0; x < 480; x += 22) rect(c, '#7844a0', x, 236, 10, 2);
    }
  });
}

function makeGround(scene: Phaser.Scene, theme: Theme): void {
  texture(scene, `ground_${theme}`, 64, 64, (c, w, h) => {
    const rng = seeded(theme === 'field' ? 101 : theme === 'coast' ? 202 : 303);
    if (theme === 'field') {
      rect(c, '#5b9b71', 0, 0, w, h);
      rect(c, '#7cba78', 0, 0, w, 7); rect(c, '#a9d77c', 0, 0, w, 3);
      rect(c, '#95704b', 0, 10, w, h - 10);
      rect(c, '#a67c51', 0, 10, w, 6);
      for (let i = 0; i < 80; i++) {
        const x = Math.floor(rng() * 64), y = 12 + Math.floor(rng() * 52);
        rect(c, rng() > .5 ? '#c49456' : '#7d6748', x, y, 3 + Math.floor(rng() * 4), 2);
      }
      for (let x = 6; x < w; x += 13) rect(c, '#3b9569', x, 2, 5, 4);
    } else if (theme === 'coast') {
      rect(c, '#b593a6', 0, 0, w, h);
      rect(c, '#f9d8bd', 0, 0, w, 8); rect(c, '#ffe9cc', 0, 0, w, 3);
      rect(c, '#e4b6a8', 0, 8, w, 58);
      for (let y = 14; y < 64; y += 15) {
        rect(c, '#c694a1', 0, y, 64, 2);
        for (let x = y % 30 ? 19 : 0; x < w; x += 32) rect(c, '#c694a1', x, y + 1, 2, 14);
      }
      rect(c, '#f4c5b4', 0, 10, 64, 2);
    } else {
      rect(c, '#221d47', 0, 0, w, h);
      rect(c, '#bd6dd0', 0, 0, w, 5); rect(c, '#71e8eb', 0, 0, w, 2);
      rect(c, '#32275e', 0, 7, w, 57);
      for (let x = 0; x < w; x += 16) rect(c, '#4e397c', x, 7, 2, h - 7);
      for (let y = 18; y < h; y += 15) rect(c, '#4e397c', 0, y, w, 2);
      for (let i = 0; i < 15; i++) {
        const x = Math.floor(rng() * 64), y = 12 + Math.floor(rng() * 50);
        rect(c, rng() > .5 ? '#ff80d5' : '#6df1e9', x, y, 3, 1);
      }
    }
  });
  texture(scene, `platform_${theme}`, 64, 15, (c, w, h) => {
    const tile = theme === 'field' ? '#a87851' : theme === 'coast' ? '#d59caf' : '#453168';
    const upper = theme === 'field' ? '#8dd384' : theme === 'coast' ? '#ffe2b9' : '#73e8ed';
    rect(c, INK, 0, 3, w, h - 3);
    rect(c, tile, 0, 5, w, h - 6);
    rect(c, upper, 0, 0, w, 5);
    rect(c, theme === 'neon' ? '#f287e4' : '#fff0c6', 0, 1, w, 1);
    for (let x = 7; x < w; x += 19) rect(c, '#554664', x, 9, 2, 2);
  });
}

export function generateArt(scene: Phaser.Scene): void {
  const modes = ['idle', 'run', 'jump', 'fall', 'hurt', 'bounce', 'phone', 'victory'];
  for (const mode of modes) {
    const frames = mode === 'run' ? 6 : mode === 'idle' ? 4 : mode === 'victory' ? 4 : 1;
    for (let f = 0; f < frames; f++) {
      texture(scene, `duck_${mode}_${f}`, 34, 40, c => duck(c, mode, f));
    }
  }
  for (let f = 0; f < 2; f++) {
    texture(scene, `gold_${f}`, 13, 17, c => drawKernel(c, false, f));
    texture(scene, `bad_${f}`, 15, 17, c => drawKernel(c, true, f));
    texture(scene, `spring_${f}`, 52, 26, c => spring(c, f));
    texture(scene, `gull_${f}`, 32, 19, c => gull(c, f));
    texture(scene, `portal_${f}`, 28, 46, c => portal(c, f));
    texture(scene, `phone_${f}`, 18, 28, c => phone(c, f));
  }
  texture(scene, 'bollard', 22, 30, c => post(c));
  texture(scene, 'flag', 38, 67, c => flag(c));
  texture(scene, 'grass', 32, 23, c => grassBonus(c));
  texture(scene, 'heart', 24, 24, c => heart(c));
  texture(scene, 'supportcorn', 24, 26, c => supportCorn(c));
  texture(scene, 'focus', 24, 24, c => {
    oval(c, '#674ac1', 12, 12, 11, 11);
    oval(c, '#bb9cff', 12, 12, 9, 9);
    rect(c, '#fff6da', 7, 6, 10, 12);
    rect(c, '#aa6bd2', 9, 4, 6, 3);
    rect(c, '#55508b', 5, 10, 14, 3);
    rect(c, '#f3b1f3', 10, 17, 4, 2);
  });
  texture(scene, 'lore', 24, 24, c => {
    oval(c, '#f0a1f0', 12, 12, 11, 11);
    oval(c, '#a56fe8', 12, 12, 9, 9);
    rect(c, '#fff9b9', 11, 4, 2, 16); rect(c, '#fff9b9', 5, 11, 14, 2);
    rect(c, '#fff9b9', 7, 7, 10, 10); rect(c, '#9966d0', 9, 9, 6, 6);
  });
  texture(scene, 'checkpoint', 24, 42, c => {
    rect(c, '#443c67', 4, 3, 3, 39); rect(c, '#fef0d6', 5, 3, 1, 39);
    rect(c, '#6de0c0', 7, 5, 15, 13); rect(c, '#f8d3ef', 8, 7, 12, 9);
    rect(c, '#ffbc5d', 11, 9, 5, 5);
    rect(c, '#443c67', 2, 40, 11, 2);
  });
  texture(scene, 'flower', 15, 20, c => {
    rect(c, '#459e7a', 7, 8, 2, 12); rect(c, '#5bbb8d', 4, 13, 4, 2);
    rect(c, '#ff8caf', 4, 3, 9, 8); rect(c, '#ffe3ad', 6, 5, 5, 4);
  });
  for (const theme of ['field', 'coast', 'neon'] as Theme[]) {
    makeSky(scene, theme);
    makeGround(scene, theme);
  }
}
