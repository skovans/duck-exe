import Phaser from 'phaser';
import './style.css';
import { generateArt } from './game/art';
import { ChipAudio } from './game/audio';
import { LEVELS, GROUND_Y, VIEW_HEIGHT, VIEW_WIDTH, validateLevels } from './game/levels';
import type { LevelSpec, Theme } from './game/levels';
import { GameUI } from './game/ui';

const audio = new ChipAudio();
const touch = { left: false, right: false, jump: false };
const SAVE_KEY = 'duckexe-save-v1';

type Save = { unlocked: number; best: number };
type Session = { score: number; lives: number; streak: number; startedAt: number };
function loadSave(): Save {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as Partial<Save>;
    return {
      unlocked: Math.max(0, Math.min(2, Math.floor(Number(parsed.unlocked) || 0))),
      best: Math.max(0, Math.floor(Number(parsed.best) || 0)),
    };
  } catch { return { unlocked: 0, best: 0 }; }
}
let saved: Save = loadSave();
let session: Session = { score: 0, lives: 3, streak: 0, startedAt: 0 };
function persistSave(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* storage can be disabled */ }
}
let game: Phaser.Game;
let currentLevel: LevelScene | null = null;

const ui = new GameUI({
  start: level => startGame(level),
  retry: () => startGame(0),
  next: () => { if (currentLevel) launchLevel(currentLevel.levelIndex + 1); },
  resume: () => resumeGame(),
  pause: () => togglePause(),
  menu: () => returnToMenu(),
  sound: () => ui.setSoundMuted(audio.toggle()),
});
ui.setSoundMuted(audio.muted);

function startGame(level: number): void {
  audio.unlock();
  session = { score: 0, lives: 3, streak: 0, startedAt: Date.now() };
  launchLevel(Math.max(0, Math.min(saved.unlocked, level)));
}
function launchLevel(level: number): void {
  if (level < 0 || level >= LEVELS.length) return;
  ui.clearToast();
  if (currentLevel) game.scene.stop('Level');
  game.scene.stop('Menu');
  currentLevel = null;
  audio.resetSong();
  game.scene.start('Level', { index: level });
}
function returnToMenu(): void {
  ui.clearToast();
  if (currentLevel) game.scene.stop('Level');
  currentLevel = null;
  game.scene.start('Menu');
}
function togglePause(): void {
  if (!currentLevel) return;
  if (ui.state === 'playing' && !currentLevel.cinematic) {
    currentLevel.scene.pause();
    ui.showPause(currentLevel.levelIndex);
  } else if (ui.state === 'paused') resumeGame();
}
function resumeGame(): void {
  if (!currentLevel || ui.state !== 'paused') return;
  currentLevel.scene.resume();
  ui.playing();
}

function setupBackground(scene: Phaser.Scene, theme: Theme, skyTexture = true): Phaser.GameObjects.TileSprite | null {
  if (skyTexture) {
    scene.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, `sky_${theme}`)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
  }
  return scene.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, `back_${theme}`)
    .setOrigin(0, 0).setScrollFactor(0).setDepth(-95);
}

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    generateArt(this);
    const errors = validateLevels();
    if (errors.length) console.warn('Level checks:', errors);
    this.scene.start('Menu');
  }
}

class MenuScene extends Phaser.Scene {
  private duck!: Phaser.GameObjects.Image;
  private bg!: Phaser.GameObjects.TileSprite;
  constructor() { super('Menu'); }
  create(): void {
    this.cameras.main.setBackgroundColor('#b6dfef');
    this.bg = setupBackground(this, 'field')!;
    this.add.tileSprite(0, GROUND_Y, VIEW_WIDTH, 120, 'ground_field').setOrigin(0, 0);
    for (const [x, y] of [[520, 440], [900, 439], [200, 440]] as Array<[number, number]>) {
      this.add.image(x, y, 'flower').setScale(.75).setDepth(2);
    }
    this.add.image(748, 437, 'spring_0').setScale(1.75).setDepth(2);
    this.add.image(854, 295, 'gold_0').setScale(1.8).setDepth(4);
    this.add.image(904, 250, 'gold_1').setScale(1.5).setDepth(4);
    this.add.image(938, 320, 'gold_0').setScale(1.25).setDepth(4);
    this.duck = this.add.image(750, 295, 'duck_idle_0').setScale(3.2).setDepth(5);
    this.add.text(738, 144, 'NO THOUGHTS\nJUST QUACK', {
      color: '#fffaf4', fontFamily: 'Courier New, monospace', fontSize: '20px', fontStyle: 'bold',
      stroke: '#605080', strokeThickness: 7, align: 'center',
    }).setOrigin(.5).setDepth(2).setRotation(-.07);
    ui.showMenu(saved.unlocked, saved.best);
    ui.clearToast();
  }
  update(time: number): void {
    this.duck.setTexture(`duck_idle_${Math.floor(time / 270) % 4}`);
    this.duck.y = 295 + Math.sin(time / 310) * 7;
    this.bg.tilePositionX = time * .006;
  }
}

interface GullBird extends Phaser.Physics.Arcade.Sprite {
  homeX?: number; homeY?: number; spanX?: number; spanY?: number; birdSpeed?: number; phase?: number;
}
interface TimedPortal extends Phaser.Physics.Arcade.Image {
  destination?: number; ttl?: number; deadline?: number; used?: boolean;
}

class LevelScene extends Phaser.Scene {
  levelIndex = 0;
  cinematic = false;
  private spec!: LevelSpec;
  private hero!: Phaser.Physics.Arcade.Sprite;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private springs!: Phaser.Physics.Arcade.StaticGroup;
  private gold!: Phaser.Physics.Arcade.StaticGroup;
  private bad!: Phaser.Physics.Arcade.StaticGroup;
  private bollards!: Phaser.Physics.Arcade.StaticGroup;
  private birds!: Phaser.Physics.Arcade.Group;
  private bonuses!: Phaser.Physics.Arcade.StaticGroup;
  private portals!: Phaser.Physics.Arcade.Group;
  private phone!: Phaser.Physics.Arcade.Image | null;
  private finishFlag!: Phaser.Physics.Arcade.Image;
  private farBack!: Phaser.GameObjects.TileSprite;
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right' | 'jump' | 'jump2', Phaser.Input.Keyboard.Key>;
  private invulnerableUntil = 0;
  private birdProtectionUntil = 0;
  private focusUntil = 0;
  private rizzUntil = 0;
  private bounceUntil = 0;
  private lastBounceAt = 0;
  private lastGroundAt = 0;
  private jumpQueuedAt = -100000;
  private wasJumpDown = false;
  private lastArtFrame = -1;
  private lastKernelFrame = -1;
  private checkpointX = 120;
  private reachedCheckpoints = new Set<number>();
  private isEnding = false;
  private lastGullAt = 0;
  private elapsed = 0;

  constructor() { super('Level'); }
  init(data: { index: number }): void {
    this.levelIndex = data.index;
    this.spec = LEVELS[this.levelIndex];
    this.cinematic = false;
    this.invulnerableUntil = 0; this.birdProtectionUntil = 0;
    this.focusUntil = 0; this.rizzUntil = 0; this.bounceUntil = 0;
    this.lastBounceAt = 0; this.lastGroundAt = 0; this.jumpQueuedAt = -100000;
    this.wasJumpDown = false; this.lastArtFrame = -1; this.lastKernelFrame = -1;
    this.checkpointX = 120; this.reachedCheckpoints = new Set<number>();
    this.isEnding = false; this.lastGullAt = 0; this.elapsed = 0;
  }

  create(): void {
    currentLevel = this;
    this.physics.world.setBounds(0, -250, this.spec.length, 1150);
    this.cameras.main.setBounds(0, 0, this.spec.length, VIEW_HEIGHT);
    this.cameras.main.setBackgroundColor('#282047');
    this.farBack = setupBackground(this, this.spec.theme)!;
    this.createLandscape();
    this.solids = this.physics.add.staticGroup();
    this.springs = this.physics.add.staticGroup();
    this.gold = this.physics.add.staticGroup();
    this.bad = this.physics.add.staticGroup();
    this.bollards = this.physics.add.staticGroup();
    this.birds = this.physics.add.group({ runChildUpdate: false });
    this.bonuses = this.physics.add.staticGroup();
    this.portals = this.physics.add.group({ runChildUpdate: false });
    this.phone = null;
    this.createWorld();
    this.hero = this.physics.add.sprite(120, GROUND_Y - 39, 'duck_idle_0');
    this.hero.setDepth(20).setBounce(0).setCollideWorldBounds(false)
      .setDragX(1800).setMaxVelocity(310, 980).setGravityY(0);
    this.hero.body!.setSize(33, 58).setOffset(17, 20);
    this.hero.setData('facing', 1);
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.overlap(this.hero, this.springs, (_player, item) => this.onSpring(item as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.hero, this.gold, (_player, item) => this.onGold(item as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.hero, this.bad, (_player, item) => this.onBad(item as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.hero, this.bollards, () => this.loseLife('bollard'));
    this.physics.add.overlap(this.hero, this.birds, (_player, item) => this.onBird(item as GullBird));
    this.physics.add.overlap(this.hero, this.bonuses, (_player, item) => this.onBonus(item as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.hero, this.portals, (_player, item) => this.onPortal(item as TimedPortal));
    if (this.phone) this.physics.add.overlap(this.hero, this.phone, () => this.onPhone());
    this.physics.add.overlap(this.hero, this.finishFlag, () => this.finishLevel());
    this.cursor = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({ left: 'A', right: 'D', jump: 'W', jump2: 'SPACE' }) as typeof this.keys;
    this.cameras.main.startFollow(this.hero, true, .12, .10, -170, 0);
    this.cameras.main.setDeadzone(110, 70);
    this.cameras.main.fadeIn(300, 29, 23, 54);
    ui.playing();
    ui.updateHUD(session.lives, session.score, this.levelIndex);
    ui.toast(`LEVEL ${this.spec.id} — ${this.spec.title}`, 2400);
    audio.resetSong();
  }

  private createLandscape(): void {
    const colors = this.spec.theme === 'field'
      ? { flower: '#f8d48a', shadow: '#86c9a0', label: '#385774' }
      : this.spec.theme === 'coast'
      ? { flower: '#ffb4c4', shadow: '#8ebed2', label: '#5b5680' }
      : { flower: '#9c86fd', shadow: '#a869c9', label: '#d0a6e8' };
    for (let x = 210; x < this.spec.length - 100; x += 180) {
      const safe = this.spec.ground.some(([start, end]) => x > start + 35 && x < end - 35);
      if (!safe) continue;
      if (this.spec.theme === 'field') {
        const flower = this.add.image(x + 10, GROUND_Y - 10, 'flower');
        flower.setScale(.7 + (x % 3) * .11).setDepth(-4).setAlpha(.94);
      } else if (this.spec.theme === 'coast') {
        if (Math.floor(x / 180) % 3 === 0) {
          const graphics = this.add.graphics().setDepth(-5);
          graphics.fillStyle(0xe8c5d1).fillRect(x - 9, GROUND_Y - 39, 43, 6);
          graphics.fillStyle(0x6b5a85).fillRect(x - 5, GROUND_Y - 34, 5, 30);
          graphics.fillRect(x + 27, GROUND_Y - 34, 5, 30);
          graphics.fillStyle(0xfff0d2).fillRect(x - 9, GROUND_Y - 29, 42, 4);
        }
      } else {
        const graphics = this.add.graphics().setDepth(-5);
        graphics.fillStyle(0x704a9a).fillRect(x, GROUND_Y - 56, 4, 54);
        graphics.fillStyle(0x88f5ed).fillRect(x - 5, GROUND_Y - 60, 14, 5);
        graphics.fillStyle(0xeb88db).fillRect(x + 16, GROUND_Y - 32, 4, 5);
      }
    }
    for (const sign of this.spec.signs) {
      const signPlate = this.add.graphics().setDepth(-3);
      signPlate.fillStyle(0x31264b, .93).fillRoundedRect(sign.x, 334, 252, 39, 4);
      signPlate.lineStyle(3, this.spec.theme === 'neon' ? 0x86e8ed : 0xffd5a6, 1)
        .strokeRoundedRect(sign.x, 334, 252, 39, 4);
      signPlate.fillStyle(0x6a5680).fillRect(sign.x + 11, 374, 6, 73);
      signPlate.fillRect(sign.x + 236, 374, 6, 73);
      this.add.text(sign.x + 126, 353, sign.text, {
        fontFamily: 'Courier New, monospace', fontSize: '12px',
        color: '#fff6e9', fontStyle: 'bold', align: 'center',
      }).setOrigin(.5).setDepth(-2);
    }
    for (const x of this.spec.checkpoints) {
      this.add.text(x, 338, 'CHECKPOINT', {
        fontFamily: 'Courier New, monospace', fontSize: '12px', color: colors.label,
        stroke: this.spec.theme === 'neon' ? '#21143f' : '#fff8ef', strokeThickness: 3,
      }).setOrigin(.5).setDepth(5);
    }
    if (this.spec.theme === 'neon') {
      for (let i = 1; i < this.spec.ground.length; i++) {
        const [left] = this.spec.ground[i];
        const [, right] = this.spec.ground[i - 1];
        const gfx = this.add.graphics().setDepth(-1);
        gfx.fillStyle(0xef7bc4, .28).fillRect(right, GROUND_Y, left - right, 110);
        gfx.fillStyle(0x90eaf6, .7).fillRect(right + 2, GROUND_Y + 9, 5, 94);
        gfx.fillRect(left - 7, GROUND_Y + 9, 5, 94);
        gfx.fillStyle(0x382452, .8).fillRect(right + 7, GROUND_Y + 20, left - right - 14, 7);
      }
      this.add.text(6110, GROUND_Y - 145, 'WARNING!\nTHE FEED NEVER ENDS', {
        color: '#fff5d9', fontSize: '19px', fontStyle: 'bold',
        fontFamily: 'Courier New, monospace', stroke: '#302045', strokeThickness: 6,
        align: 'center',
      }).setOrigin(.5).setDepth(3);
    }
    // Keeps referenced palette elements intentional without extra resources.
    void colors.flower; void colors.shadow;
  }

  private createWorld(): void {
    const theme = this.spec.theme;
    for (const [start, end] of this.spec.ground) {
      const width = end - start;
      for (let tileX = start; tileX < end; tileX += 510) {
        this.add.tileSprite(tileX, GROUND_Y, Math.min(510, end - tileX), 190, `ground_${theme}`)
          .setOrigin(0, 0).setDepth(3);
      }
      const collision = this.physics.add.staticImage(start + width / 2, GROUND_Y + 95, `ground_${theme}`)
        .setDisplaySize(width, 190).setVisible(false);
      collision.refreshBody();
      this.solids.add(collision);
    }
    for (const p of this.spec.platforms) {
      this.add.tileSprite(p.x, p.y, p.width, 30, `platform_${theme}`).setDepth(5);
      const collision = this.physics.add.staticImage(p.x, p.y, `platform_${theme}`)
        .setDisplaySize(p.width, 26).setVisible(false);
      collision.refreshBody();
      this.solids.add(collision);
    }
    for (const { x, y } of this.spec.springs) {
      const obj = this.springs.create(x, y, 'spring_0') as Phaser.Physics.Arcade.Image;
      obj.setDepth(7); obj.refreshBody();
    }
    for (const { x, y } of this.spec.kernels) {
      const obj = this.gold.create(x, y, 'gold_0') as Phaser.Physics.Arcade.Image;
      obj.setDepth(8); obj.refreshBody();
    }
    for (const { x, y } of this.spec.badKernels) {
      const obj = this.bad.create(x, y, 'bad_0') as Phaser.Physics.Arcade.Image;
      obj.setDepth(8); obj.refreshBody();
    }
    for (const { x, y } of this.spec.bollards) {
      const obj = this.bollards.create(x, y, 'bollard') as Phaser.Physics.Arcade.Image;
      obj.setDepth(8); obj.refreshBody();
      const plate = this.add.text(x, y - 43, ['NPC', '404', 'NOPE'][Math.floor(x / 100) % 3], {
        fontFamily: 'Courier New', fontSize: '10px', color: '#44315f', fontStyle: 'bold',
      }).setOrigin(.5).setDepth(9);
      void plate;
    }
    this.spec.gulls.forEach((bird, i) => {
      const obj = this.physics.add.sprite(bird.x, bird.y, 'gull_0') as GullBird;
      obj.body!.setAllowGravity(false);
      obj.setImmovable(true).setDepth(9);
      obj.homeX = bird.x; obj.homeY = bird.y;
      obj.spanX = bird.span; obj.spanY = bird.altitude;
      obj.birdSpeed = bird.speed; obj.phase = i * 1.31;
      this.birds.add(obj);
    });
    for (const b of this.spec.bonuses) {
      const name = b.kind === 'heart' ? 'supportcorn' : b.kind;
      const obj = this.bonuses.create(b.x, b.y, name) as Phaser.Physics.Arcade.Image;
      obj.setData('kind', b.kind).setDepth(9);
      obj.refreshBody();
    }
    this.spec.portals.forEach(portal => {
      const obj = this.physics.add.image(portal.x, portal.y, 'portal_0') as TimedPortal;
      obj.setImmovable(true).setDepth(9);
      obj.body!.setAllowGravity(false);
      obj.destination = portal.destination;
      obj.ttl = portal.ttl;
      obj.used = false;
      obj.deadline = 0;
      this.portals.add(obj);
      this.add.text(portal.x, portal.y - 66, 'SPEEDRUN', {
        fontFamily: 'Courier New', fontSize: '11px', color: '#a9fdf2',
        stroke: '#271a4b', strokeThickness: 4, fontStyle: 'bold',
      }).setOrigin(.5).setDepth(10);
    });
    for (const x of this.spec.checkpoints) {
      const image = this.add.image(x, GROUND_Y - 41, 'checkpoint').setDepth(7);
      image.setData('checkpointX', x);
    }
    if (this.spec.phone) {
      this.phone = this.physics.add.staticImage(this.spec.phone.x, this.spec.phone.y, 'phone_0');
      this.phone.setDepth(11); this.phone.refreshBody();
      this.add.text(this.spec.phone.x, 338, 'JUST ONE MORE VIDEO?', {
        fontFamily: 'Courier New', fontSize: '16px', color: '#fff3d9', fontStyle: 'bold',
        stroke: '#aa418d', strokeThickness: 6,
      }).setOrigin(.5).setDepth(11);
    }
    this.finishFlag = this.physics.add.staticImage(this.spec.finish, GROUND_Y - 66, 'flag');
    this.finishFlag.setDepth(8).refreshBody();
  }

  private onGold(obj: Phaser.Physics.Arcade.Image): void {
    if (this.isEnding || !obj.active) return;
    const { x, y } = obj;
    obj.destroy();
    session.score += 10;
    session.streak += 1;
    audio.fx('coin');
    this.floatText(x, y - 16, '+10', '#fff1ac');
    this.sparkles(x, y, '#ffe8a2', 4);
    if (session.streak === 10) {
      this.rizzUntil = this.time.now + 2100;
      ui.toast('UNLIMITED RIZZ ✦', 1800);
      this.floatText(this.hero.x, this.hero.y - 78, 'MAIN CHARACTER ENERGY', '#ffe18a');
    }
    this.refreshHUD();
  }

  private onBad(obj: Phaser.Physics.Arcade.Image): void {
    if (!obj.active || this.isEnding) return;
    if (this.time.now < this.focusUntil) {
      this.floatText(obj.x, obj.y, 'FOCUS MODE!', '#b3f7e8');
      obj.destroy(); return;
    }
    const { x, y } = obj;
    obj.destroy();
    session.score = Math.max(0, session.score - 20);
    session.streak = 0;
    audio.fx('bad');
    this.floatText(x, y - 27, '-20 BAD VIBES', '#90d5ff');
    this.cameras.main.shake(80, .0013);
    this.refreshHUD();
  }

  private onSpring(obj: Phaser.Physics.Arcade.Image): void {
    if (this.isEnding || this.time.now - this.lastBounceAt < 200) return;
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    const springBody = obj.body as Phaser.Physics.Arcade.StaticBody;
    if (body.velocity.y < 30 || body.bottom > springBody.top + 27) return;
    this.lastBounceAt = this.time.now;
    this.bounceUntil = this.time.now + 220;
    this.hero.setVelocityY(-810);
    this.hero.y -= Math.max(0, body.bottom - springBody.top) + 2;
    obj.setTexture('spring_1');
    this.time.delayedCall(145, () => { if (obj.active) obj.setTexture('spring_0'); });
    audio.fx('bounce');
    this.floatText(obj.x, obj.y - 67, 'BOING!', '#ffda88');
    this.sparkles(obj.x, obj.y - 22, '#fff7be', 9);
  }

  private onBird(obj: GullBird): void {
    if (this.isEnding || !obj.active || this.time.now - this.lastGullAt < 520) return;
    if (this.time.now < this.focusUntil) {
      obj.disableBody(true, true);
      this.floatText(obj.x, obj.y, 'NOT TODAY!', '#9affdd');
      return;
    }
    if (this.time.now < this.birdProtectionUntil) return;
    this.lastGullAt = this.time.now;
    this.birdProtectionUntil = this.time.now + 1200;
    session.score = Math.max(0, session.score - 15);
    session.streak = 0;
    audio.fx('gull');
    this.floatText(obj.x, obj.y - 32, 'MINE! -15', '#ffd2b7');
    this.sparkles(obj.x, obj.y, '#e9eafa', 6);
    obj.disableBody(true, true);
    this.refreshHUD();
  }

  private onBonus(obj: Phaser.Physics.Arcade.Image): void {
    if (this.isEnding || !obj.active) return;
    const kind = obj.getData('kind') as string;
    const { x, y } = obj;
    obj.destroy();
    audio.fx('bonus');
    if (kind === 'grass' || kind === 'heart') {
      session.lives = Math.min(3, session.lives + 1);
      this.floatText(x, y - 25, kind === 'grass' ? 'TOUCH GRASS +1 LIFE' : 'EMOTIONAL SUPPORT CORN', '#a5ffcb');
      this.sparkles(x, y, '#a3f8c9', 10);
    } else if (kind === 'focus') {
      this.focusUntil = this.time.now + 5000;
      ui.toast('DO NOT DISTURB: 5 SECONDS', 1900);
      this.floatText(x, y - 32, 'FOCUS MODE!', '#99ffe5');
    } else {
      session.score += 50;
      this.floatText(x, y - 20, 'YOU FOUND THE LORE +50', '#f7ccff');
      ui.toast('SIDE QUEST UNLOCKED!', 1900);
      this.sparkles(x, y, '#f5c5ff', 12);
    }
    this.refreshHUD();
  }

  private onPortal(obj: TimedPortal): void {
    if (this.isEnding || !obj.active || obj.used || !obj.deadline || this.time.now > obj.deadline) return;
    const dest = obj.destination!;
    const startX = obj.x;
    obj.used = true;
    obj.disableBody(true, true);
    this.hero.body!.reset(dest, GROUND_Y - 46);
    this.hero.setVelocityX(230).setVelocityY(-100);
    this.invulnerableUntil = this.time.now + 500;
    session.score += 25;
    session.streak = 0;
    this.cameras.main.flash(160, 140, 249, 230, false);
    audio.fx('portal');
    this.floatText(startX, obj.y - 68, 'SPEEDRUN HACK!', '#a6ffff');
    this.floatText(dest, GROUND_Y - 110, '+25 WARP!', '#a6ffff');
    this.sparkles(dest, GROUND_Y - 80, '#a9fafa', 16);
    ui.toast('SPEEDRUN HACK! +25', 1300);
    this.refreshHUD();
  }

  private onPhone(): void {
    if (this.isEnding || this.cinematic) return;
    this.cinematic = true;
    session.streak = 0;
    audio.fx('phone');
    this.hero.setVelocity(0, 0).setAccelerationX(0).setTexture('duck_phone_0');
    this.hero.x = this.spec.phone!.x - 32;
    this.hero.y = GROUND_Y - 37;
    this.hero.body!.enable = false;
    ui.toast('...JUST ONE MORE VIDEO?', 1700);
    this.cameras.main.zoomTo(1.24, 820, 'Sine.easeInOut');
    this.time.addEvent({
      delay: 235, repeat: 5,
      callback: () => {
        this.floatText(this.hero.x + Phaser.Math.Between(-20, 35), GROUND_Y - Phaser.Math.Between(85, 155),
          ['♥', 'LOL', '+1', '♡'][Phaser.Math.Between(0, 3)], '#ff9cd8');
      },
    });
    this.time.delayedCall(1660, () => {
      if (this.isEnding) return;
      this.isEnding = true;
      this.scene.pause();
      ui.showGameOver(session.score, true);
      this.updateBest();
    });
  }

  private loseLife(reason: 'pit' | 'bollard'): void {
    if (this.isEnding || this.cinematic) return;
    if (reason !== 'pit' && this.time.now < this.invulnerableUntil) return;
    session.lives = Math.max(0, session.lives - 1);
    session.streak = 0;
    audio.fx('hit');
    this.cameras.main.flash(180, 249, 108, 160, false);
    this.refreshHUD();
    if (session.lives <= 0) {
      this.isEnding = true;
      audio.fx('lose');
      this.updateBest();
      this.hero.setVelocity(0, 0);
      this.scene.pause();
      ui.showGameOver(session.score);
      return;
    }
    this.invulnerableUntil = this.time.now + 2000;
    this.birdProtectionUntil = this.time.now + 1500;
    this.hero.clearTint();
    this.hero.body!.reset(this.checkpointX, GROUND_Y - 38);
    this.hero.setVelocity(0, 0);
    this.hero.setTexture('duck_hurt_0');
    this.cameras.main.fadeIn(260, 255, 170, 192);
    ui.toast('OUCH! -1 LIFE ♥', 950);
  }

  private finishLevel(): void {
    if (this.isEnding || this.cinematic || this.hero.y > GROUND_Y) return;
    this.isEnding = true;
    this.hero.setVelocity(0, 0).setAccelerationX(0);
    this.hero.setTexture('duck_victory_0');
    this.hero.body!.enable = false;
    this.updateBest();
    if (this.levelIndex < 2) {
      saved.unlocked = Math.max(saved.unlocked, this.levelIndex + 1);
      persistSave();
    }
    audio.fx('win');
    this.sparkles(this.hero.x, this.hero.y - 55, '#ffe09f', 25);
    this.time.delayedCall(700, () => {
      this.scene.pause();
      if (this.levelIndex === 2) ui.showVictory(session.score, session.lives, saved.best);
      else ui.showLevelClear(this.levelIndex, session.score, session.lives);
    });
  }

  private updateBest(): void {
    if (session.score > saved.best) { saved.best = session.score; persistSave(); }
  }
  private refreshHUD(): void { ui.updateHUD(session.lives, session.score, this.levelIndex); }

  private floatText(x: number, y: number, message: string, color: string): void {
    const text = this.add.text(x, y, message, {
      fontFamily: 'Courier New, monospace', fontSize: '16px', color, fontStyle: 'bold',
      stroke: '#30274c', strokeThickness: 5, align: 'center',
    }).setOrigin(.5).setDepth(50);
    this.tweens.add({ targets: text, y: y - 52, alpha: 0, duration: 850, ease: 'Quad.easeOut', onComplete: () => text.destroy() });
  }

  private sparkles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(3, 8);
      const sparkle = this.add.rectangle(x, y, size, size, Phaser.Display.Color.HexStringToColor(color).color)
        .setDepth(45);
      const angle = (i / count) * Math.PI * 2;
      const distance = Phaser.Math.Between(28, 78);
      this.tweens.add({
        targets: sparkle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - 20,
        alpha: 0, angle: Phaser.Math.Between(-180, 180), duration: Phaser.Math.Between(390, 720),
        ease: 'Sine.easeOut', onComplete: () => sparkle.destroy(),
      });
    }
  }

  private renderDuck(now: number): void {
    if (this.cinematic) return;
    const vy = this.hero.body!.velocity.y;
    const moving = Math.abs(this.hero.body!.velocity.x) > 26;
    const onFloor = this.hero.body!.blocked.down || this.hero.body!.touching.down;
    let name = 'duck_idle_0';
    if (now < this.invulnerableUntil && now > this.invulnerableUntil - 300) name = 'duck_hurt_0';
    else if (now < this.bounceUntil) name = 'duck_bounce_0';
    else if (!onFloor && vy < -45) name = 'duck_jump_0';
    else if (!onFloor && vy > 45) name = 'duck_fall_0';
    else if (moving) name = `duck_run_${Math.floor(now / 95) % 6}`;
    else name = `duck_idle_${Math.floor(now / 235) % 4}`;
    if (this.hero.texture.key !== name) this.hero.setTexture(name);
    if (now < this.invulnerableUntil) this.hero.setAlpha(Math.floor(now / 90) % 2 ? .43 : 1);
    else this.hero.setAlpha(1);
    if (now < this.focusUntil) this.hero.setTint(0xb4fff1);
    else if (now < this.rizzUntil) this.hero.setTint(0xffefbd);
    else this.hero.clearTint();
    if (Math.abs(this.hero.body!.velocity.x) > 2) {
      const facing = this.hero.body!.velocity.x >= 0 ? 1 : -1;
      // Sprite art faces right; Phaser flipX mirrors it for left movement.
      this.hero.setFlipX(facing < 0);
    }
  }

  private animateObjects(now: number): void {
    const frame = Math.floor(now / 260) % 2;
    if (frame === this.lastArtFrame) return;
    this.lastArtFrame = frame;
    const cameras = this.cameras.main;
    const near = (x: number): boolean => Math.abs(x - (cameras.scrollX + VIEW_WIDTH / 2)) < VIEW_WIDTH * 1.15;
    this.gold.getChildren().forEach((item: Phaser.GameObjects.GameObject) => {
      const obj = item as Phaser.Physics.Arcade.Image;
      if (obj.active && near(obj.x)) obj.setTexture(`gold_${frame}`);
    });
    this.bad.getChildren().forEach((item: Phaser.GameObjects.GameObject) => {
      const obj = item as Phaser.Physics.Arcade.Image;
      if (obj.active && near(obj.x)) obj.setTexture(`bad_${frame}`);
    });
    this.portals.getChildren().forEach((item: Phaser.GameObjects.GameObject) => {
      const obj = item as TimedPortal;
      if (obj.active && near(obj.x)) obj.setTexture(`portal_${frame}`);
    });
    if (this.phone?.active) this.phone.setTexture(`phone_${frame}`);
  }

  private animateBirds(now: number): void {
    const sec = now / 1000;
    this.birds.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const obj = child as GullBird;
      if (!obj.active) return;
      const wave = sec * (obj.birdSpeed || 1.5) + (obj.phase || 0);
      const targetX = (obj.homeX || 0) + Math.sin(wave) * (obj.spanX || 0);
      const targetY = (obj.homeY || 0) + Math.sin(wave * 1.28) * (obj.spanY || 0);
      obj.setPosition(targetX, targetY);
      obj.body!.updateFromGameObject();
      obj.setTexture(`gull_${Math.floor(now / 200) % 2}`);
      obj.setFlipX(Math.cos(wave) > 0);
    });
  }

  private activatePortals(now: number): void {
    this.portals.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const obj = child as TimedPortal;
      if (!obj.active || obj.used) return;
      if (!obj.deadline && this.hero.x >= obj.x - 420 && this.hero.x <= obj.x + 100) {
        obj.deadline = now + (obj.ttl || 6000);
      }
      if (obj.deadline && now > obj.deadline) {
        this.floatText(obj.x, obj.y - 50, 'PORTAL EXPIRED', '#ffb2df');
        obj.disableBody(true, true);
      } else if (obj.deadline && obj.deadline - now < 1700) {
        obj.setAlpha(Math.floor(now / 120) % 2 ? .5 : 1);
      }
    });
  }

  update(time: number, delta: number): void {
    if (!this.hero || this.isEnding) return;
    this.elapsed += delta;
    this.farBack.tilePositionX = this.cameras.main.scrollX * (this.levelIndex === 2 ? .20 : .15);
    audio.musicTick(delta, this.levelIndex);
    this.animateObjects(time);
    this.animateBirds(time);
    this.activatePortals(time);
    if (this.cinematic) return;

    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    const down = body.blocked.down || body.touching.down;
    if (down) this.lastGroundAt = time;
    const left = this.cursor.left?.isDown || this.keys.left.isDown || touch.left;
    const right = this.cursor.right?.isDown || this.keys.right.isDown || touch.right;
    if (left === right) this.hero.setAccelerationX(0);
    else this.hero.setAccelerationX(right ? 1950 : -1950);

    const jumpHeld = this.cursor.up?.isDown || this.keys.jump.isDown || this.keys.jump2.isDown || touch.jump;
    if (jumpHeld && !this.wasJumpDown) this.jumpQueuedAt = time;
    if (time - this.jumpQueuedAt < 140 && time - this.lastGroundAt < 120) {
      this.hero.setVelocityY(-565);
      this.jumpQueuedAt = -100000;
      this.lastGroundAt = -100000;
      audio.fx('jump');
      this.sparkles(this.hero.x, body.bottom - 2, '#ffffff', 3);
    }
    if (!jumpHeld && this.wasJumpDown && body.velocity.y < -180) {
      this.hero.setVelocityY(body.velocity.y * .57);
    }
    this.wasJumpDown = jumpHeld;
    if (this.hero.x < 38) { this.hero.x = 38; this.hero.setVelocityX(Math.max(0, body.velocity.x)); }
    if (this.hero.x > this.spec.length - 28) { this.hero.x = this.spec.length - 28; this.hero.setVelocityX(0); }
    if (this.hero.y > VIEW_HEIGHT + 130) { this.loseLife('pit'); return; }
    for (const x of this.spec.checkpoints) {
      if (this.hero.x > x && !this.reachedCheckpoints.has(x)) {
        this.reachedCheckpoints.add(x);
        this.checkpointX = x + 18;
        audio.fx('checkpoint');
        this.floatText(x, GROUND_Y - 128, 'CHECKPOINT!', '#aef8d0');
      }
    }
    if (time < this.rizzUntil && Math.random() < .22) {
      const effect = this.add.rectangle(this.hero.x + Phaser.Math.Between(-28, 28), this.hero.y + Phaser.Math.Between(-30, 25), 5, 5, 0xffd873).setDepth(26);
      this.tweens.add({ targets: effect, alpha: 0, y: effect.y - 22, duration: 320, onComplete: () => effect.destroy() });
    }
    if (time < this.focusUntil && Math.random() < .09) {
      const bubble = this.add.circle(this.hero.x, this.hero.y - 5, 44, 0x8bffe2, .04).setStrokeStyle(2, 0x99ffe5, .35).setDepth(24);
      this.tweens.add({ targets: bubble, alpha: 0, scale: 1.13, duration: 240, onComplete: () => bubble.destroy() });
    }
    this.renderDuck(time);
    this.lastKernelFrame = Math.floor(time / 250);
    void this.lastKernelFrame;
  }
}

// Browser controls, including multi-touch; no network requests or remote services.
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-control]')) {
  const name = button.dataset.control as keyof typeof touch;
  const release = (): void => { touch[name] = false; button.classList.remove('pressed'); };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touch[name] = true;
    button.classList.add('pressed');
    audio.unlock();
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Escape' || event.code === 'KeyP') togglePause();
  if (event.code === 'KeyR' && ui.state === 'lost') startGame(0);
});
window.addEventListener('blur', () => {
  touch.left = false; touch.right = false; touch.jump = false;
  if (ui.state === 'playing') togglePause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ui.state === 'playing') togglePause();
});

// Print geometry problems during development, never silently ship a broken stage.
const mapErrors = validateLevels();
if (mapErrors.length) console.error('Invalid handcrafted level geometry:', mapErrors);

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-host',
  backgroundColor: '#b3e7ec',
  pixelArt: true,
  roundPixels: true,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 1450 }, debug: false },
  },
  render: { antialias: false, pixelArt: true, roundPixels: true },
  scene: [BootScene, MenuScene, LevelScene],
});

// Avoid an unused variable warning without dropping the explicit game instance.
void game;
