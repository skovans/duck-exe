import { LEVELS } from './levels';

export interface UIActions {
  start(level: number): void;
  retry(): void;
  next(): void;
  resume(): void;
  pause(): void;
  menu(): void;
  sound(): void;
}
export type ScreenState = 'menu' | 'playing' | 'paused' | 'level-clear' | 'lost' | 'won';

export class GameUI {
  private overlay = document.getElementById('overlay')!;
  private hud = document.getElementById('hud')!;
  private toastElement = document.getElementById('toast')!;
  private toastTimer = 0;
  private livesElement = document.getElementById('hud-lives')!;
  private scoreElement = document.getElementById('hud-score')!;
  private levelElement = document.getElementById('hud-level')!;
  state: ScreenState = 'menu';
  private actions: UIActions;

  constructor(actions: UIActions) {
    this.actions = actions;
    this.overlay.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('button[data-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.action;
      if (action === 'start') this.actions.start(Number(button.dataset.level ?? 0));
      if (action === 'retry') this.actions.retry();
      if (action === 'next') this.actions.next();
      if (action === 'resume') this.actions.resume();
      if (action === 'menu') this.actions.menu();
    });
    document.getElementById('pause-button')!.addEventListener('click', () => this.actions.pause());
    document.getElementById('sound-button')!.addEventListener('click', () => this.actions.sound());
  }

  private show(markup: string, center = false): void {
    this.overlay.innerHTML = markup;
    this.overlay.className = `overlay ${center ? 'center-mode' : 'menu-mode'}`;
    this.hud.hidden = !center;
  }

  showMenu(unlocked: number, best: number): void {
    this.state = 'menu';
    const levels = LEVELS.map((spec, i) => `<button type="button" data-action="start" data-level="${i}" ${i > unlocked ? 'disabled' : ''}>
      ${i > unlocked ? '◈ LOCKED' : `0${i + 1} ${spec.name}`}</button>`).join('');
    this.show(`<div class="overlay-body">
      <span class="pill-tag">✦ YOUR NEW FAVOURITE SIDE QUEST ✦</span>
      <h1 class="big-title">DUCK<span class="period">.</span><span class="suffix">EXE</span></h1>
      <div class="main-subtitle">NO MORE SCROLLING_</div>
      <p class="menu-description">A tiny duck. A ridiculous amount of corn. Three levels of dodging birds, bad vibes and the algorithm.</p>
      <button class="primary-button" type="button" data-action="start" data-level="0"><span>▶</span> START QUACKING <span>↗</span></button>
      <div class="menu-meta"><span><em>♥</em> 3 LIVES</span><span><em>✳</em> 3 LEVELS</span><span>★ BEST ${best.toLocaleString('en-US')}</span></div>
      <div class="level-buttons" aria-label="Unlocked levels">${levels}</div>
    </div>`);
  }

  playing(): void {
    this.state = 'playing';
    this.overlay.className = 'overlay hidden';
    this.overlay.innerHTML = '';
    this.hud.hidden = false;
  }

  updateHUD(lives: number, score: number, level: number): void {
    this.livesElement.textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
    this.scoreElement.textContent = String(score).padStart(4, '0');
    this.levelElement.textContent = `${String(level + 1).padStart(2, '0')} / 03`;
  }

  showPause(level: number): void {
    this.state = 'paused';
    this.show(`<div class="center-card">
      <div class="result-eyebrow">// SYSTEM ON HOLD</div>
      <h2 class="result-title">PAUSE.EXE</h2>
      <p class="result-message">Even main characters need a snack break.<br>Level ${level + 1} will be right here.</p>
      <div class="result-actions"><button class="primary-button" data-action="resume">▶ RESUME</button><button class="secondary-button" data-action="menu">⌂ MENU</button></div>
    </div>`, true);
  }

  showLevelClear(level: number, score: number, lives: number): void {
    this.state = 'level-clear';
    this.show(`<div class="center-card">
      <div class="result-eyebrow">✦ LEVEL ${level + 1} COMPLETE ✦</div>
      <h2 class="result-title">${LEVELS[level].success}</h2>
      <p class="result-message">That was extremely quack of you.<br>But the internet is not done with us yet.</p>
      ${this.stats(score, lives)}
      <div class="result-actions"><button class="primary-button" data-action="next">NEXT LEVEL ↗</button><button class="secondary-button" data-action="menu">⌂ MENU</button></div>
    </div>`, true);
  }

  showGameOver(score: number, phone = false): void {
    this.state = 'lost';
    this.show(`<div class="center-card">
      <div class="result-eyebrow">// GAME OVER // </div>
      <h2 class="result-title pink">${phone ? 'YOU GOT DOOMSCROLLED' : 'SKILL ISSUE?'}</h2>
      <p class="result-message">${phone ? 'One little video turned into forever. The algorithm wins this round.' : 'The duck was brave. The obstacles were mean. Try again!'}</p>
      ${this.stats(score, 0, phone)}
      <div class="result-actions"><button class="primary-button" data-action="retry">↻ ONE MORE TRY?</button><button class="secondary-button" data-action="menu">⌂ MENU</button></div>
    </div>`, true);
  }

  showVictory(score: number, lives: number, best: number): void {
    this.state = 'won';
    this.show(`<div class="center-card">
      <div class="result-eyebrow">✦ YOU ARE THE MAIN CHARACTER ✦</div>
      <h2 class="result-title">YOU ESCAPED<br>THE ALGORITHM!</h2>
      <p class="result-message">Go touch some grass. You earned it. 🦆</p>
      ${this.stats(score, lives)}
      <div class="result-stats"><span>★ PERSONAL BEST: <strong>${best}</strong></span></div>
      <div class="result-actions"><button class="primary-button" data-action="retry">↻ PLAY AGAIN</button><button class="secondary-button" data-action="menu">⌂ MENU</button></div>
    </div>`, true);
  }

  private stats(score: number, lives: number, phone = false): string {
    return `<div class="result-stats"><span>✳ CORN: <strong>${score}</strong></span><span>♥ LIVES: <strong>${phone ? 'TRAPPED' : lives}</strong></span></div>`;
  }

  setSoundMuted(muted: boolean): void {
    const button = document.getElementById('sound-button')!;
    button.textContent = muted ? '♫̸' : '♫';
    button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound');
    button.setAttribute('aria-pressed', String(muted));
  }

  toast(text: string, ms = 1600): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastElement.textContent = text;
    this.toastElement.classList.add('visible');
    this.toastTimer = window.setTimeout(() => this.toastElement.classList.remove('visible'), ms);
  }
  clearToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastElement.classList.remove('visible');
  }
}
