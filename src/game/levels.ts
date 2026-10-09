export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const GROUND_Y = 448;

export type Theme = 'field' | 'coast' | 'neon';
export type BonusKind = 'grass' | 'heart' | 'focus' | 'lore';
export interface Platform { x: number; y: number; width: number }
export interface Pickup { x: number; y: number }
export interface Bonus extends Pickup { kind: BonusKind }
export interface Seagull extends Pickup { span: number; altitude: number; speed: number }
export interface Portal extends Pickup { destination: number; ttl: number }
export interface Sign { x: number; text: string }
export interface LevelSpec {
  id: number;
  name: string;
  title: string;
  subtitle: string;
  theme: Theme;
  length: number;
  ground: Array<[number, number]>;
  platforms: Platform[];
  springs: Pickup[];
  kernels: Pickup[];
  badKernels: Pickup[];
  bollards: Pickup[];
  gulls: Seagull[];
  bonuses: Bonus[];
  portals: Portal[];
  checkpoints: number[];
  signs: Sign[];
  phone?: Pickup;
  finish: number;
  success: string;
}

function goldLine(start: number, count: number, step = 46, y = GROUND_Y - 58): Pickup[] {
  return Array.from({ length: count }, (_, i) => ({ x: start + i * step, y }));
}
function goldArch(x: number, top: number, step = 41): Pickup[] {
  return Array.from({ length: 7 }, (_, i) => ({
    x: x + i * step,
    y: top + Math.abs(i - 3) * 12,
  }));
}
function kern(...lines: Pickup[][]): Pickup[] { return lines.flat(); }

export const LEVELS: LevelSpec[] = [
  {
    id: 1,
    name: 'CORNFIELD.EXE',
    title: 'JUST KEEP QUACKING',
    subtitle: 'Big jumps. Little legs. Infinite corn.',
    theme: 'field',
    length: 5000,
    ground: [[0, 5000]],
    platforms: [
      { x: 780, y: 322, width: 220 },
      { x: 1070, y: 276, width: 180 },
      { x: 1640, y: 305, width: 255 },
      { x: 2010, y: 354, width: 150 },
      { x: 2890, y: 298, width: 260 },
      { x: 3230, y: 350, width: 160 },
      { x: 3980, y: 310, width: 240 },
      { x: 4340, y: 266, width: 210 },
    ],
    springs: [{ x: 610, y: GROUND_Y - 21 }, { x: 1490, y: GROUND_Y - 21 }, { x: 2770, y: GROUND_Y - 21 }, { x: 3880, y: GROUND_Y - 21 }],
    kernels: kern(
      goldLine(220, 7), goldArch(645, 235), goldLine(790, 4, 47, 279),
      goldLine(1090, 3, 46, 230), goldLine(1220, 5), goldArch(1495, 232),
      goldLine(1650, 5, 44, 264), goldLine(2130, 8), goldLine(2390, 5, 46, 371),
      goldArch(2790, 231), goldLine(2900, 5, 48, 254), goldLine(3380, 7),
      goldArch(3860, 235), goldLine(4000, 5, 43, 266), goldLine(4370, 4, 47, 224),
      goldLine(4620, 5),
    ),
    badKernels: [{ x: 485, y: 414 }, { x: 1270, y: 414 }, { x: 2240, y: 414 }, { x: 2670, y: 414 }, { x: 3670, y: 414 }, { x: 4590, y: 414 }],
    bollards: [], gulls: [],
    bonuses: [{ x: 3420, y: 403, kind: 'heart' }],
    portals: [],
    checkpoints: [1770, 3490],
    signs: [{ x: 180, text: 'NO THOUGHTS, JUST QUACK' }, { x: 2130, text: "IT'S GIVING CORN" }, { x: 3720, text: 'PLOT ARMOR ACTIVATED' }],
    finish: 4810,
    success: 'MAIN CHARACTER ENERGY!',
  },
  {
    id: 2,
    name: 'SEAGULL CITY',
    title: 'POV: THE SEAGULLS WANT YOUR SNACKS',
    subtitle: 'Trust no bird. Especially the loud ones.',
    theme: 'coast',
    length: 5840,
    ground: [[0, 5840]],
    platforms: [
      { x: 680, y: 337, width: 185 }, { x: 1440, y: 302, width: 230 },
      { x: 2090, y: 334, width: 190 }, { x: 2820, y: 291, width: 240 },
      { x: 3510, y: 324, width: 190 }, { x: 4150, y: 279, width: 225 },
      { x: 4880, y: 315, width: 195 },
    ],
    springs: [{ x: 535, y: GROUND_Y - 21 }, { x: 1320, y: GROUND_Y - 21 }, { x: 2710, y: GROUND_Y - 21 }, { x: 4020, y: GROUND_Y - 21 }],
    kernels: kern(
      goldLine(190, 7), goldArch(540, 250), goldLine(700, 3, 47, 291),
      goldLine(930, 7), goldArch(1305, 230), goldLine(1450, 5, 43, 257),
      goldLine(1850, 7), goldLine(2100, 4, 43, 294), goldLine(2420, 5),
      goldArch(2715, 205), goldLine(2830, 5, 46, 245), goldLine(3150, 6),
      goldLine(3530, 4, 43, 280), goldArch(4020, 216),
      goldLine(4180, 4, 47, 235), goldLine(4540, 7),
      goldLine(4900, 4, 43, 266), goldLine(5250, 9),
    ),
    badKernels: [{ x: 480, y: 413 }, { x: 1180, y: 414 }, { x: 1930, y: 414 }, { x: 2560, y: 413 }, { x: 3390, y: 414 }, { x: 3910, y: 414 }, { x: 4660, y: 414 }, { x: 5390, y: 414 }],
    bollards: [{ x: 830, y: 420 }, { x: 1730, y: 420 }, { x: 2370, y: 420 }, { x: 3210, y: 420 }, { x: 3800, y: 420 }, { x: 4690, y: 420 }, { x: 5360, y: 420 }],
    gulls: [
      { x: 1040, y: 390, span: 90, altitude: 15, speed: 1.4 },
      { x: 1880, y: 373, span: 102, altitude: 21, speed: 1.3 },
      { x: 2610, y: 368, span: 75, altitude: 26, speed: 1.7 },
      { x: 3380, y: 382, span: 94, altitude: 20, speed: 1.2 },
      { x: 4430, y: 380, span: 95, altitude: 23, speed: 1.65 },
      { x: 5110, y: 370, span: 95, altitude: 16, speed: 1.5 },
    ],
    bonuses: [
      { x: 1960, y: 414, kind: 'grass' },
      { x: 2920, y: 245, kind: 'lore' },
      { x: 3700, y: 396, kind: 'focus' },
      { x: 5050, y: 396, kind: 'heart' },
    ],
    portals: [],
    checkpoints: [1990, 4020],
    signs: [{ x: 230, text: '404: MOTIVATION NOT FOUND' }, { x: 2720, text: 'SKILL ISSUE?' }, { x: 4590, text: 'BEWARE: SNACK THIEVES' }],
    finish: 5620,
    success: 'NOT AN NPC ANYMORE!',
  },
  {
    id: 3,
    name: 'THE INFINITE SCROLL',
    title: 'ESCAPE THE ALGORITHM',
    subtitle: 'One last scroll could cost everything.',
    theme: 'neon',
    length: 6900,
    ground: [[0, 1000], [1125, 1880], [2015, 2775], [2915, 3790], [3925, 4710], [4850, 5540], [5680, 6900]],
    platforms: [
      { x: 710, y: 328, width: 195 },
      { x: 1410, y: 315, width: 220 },
      { x: 1810, y: 344, width: 180 },
      { x: 2380, y: 292, width: 240 },
      { x: 3320, y: 320, width: 175 },
      { x: 3640, y: 280, width: 175 },
      { x: 4320, y: 310, width: 200 },
      { x: 5150, y: 288, width: 230 },
      { x: 5910, y: 339, width: 175 },
    ],
    springs: [{ x: 555, y: GROUND_Y - 21 }, { x: 1790, y: GROUND_Y - 21 }, { x: 2240, y: GROUND_Y - 21 }, { x: 3540, y: GROUND_Y - 21 }, { x: 4510, y: GROUND_Y - 21 }, { x: 5400, y: GROUND_Y - 21 }],
    kernels: kern(
      goldLine(170, 7), goldArch(565, 225), goldLine(740, 3, 44, 283),
      goldLine(1160, 7), goldLine(1410, 4, 44, 273), goldArch(1760, 238),
      goldLine(2070, 5), goldArch(2265, 215), goldLine(2400, 4, 46, 247),
      goldLine(2990, 7), goldLine(3320, 4, 44, 275), goldArch(3530, 207),
      goldLine(3980, 7), goldLine(4350, 4, 46, 265), goldArch(4500, 217),
      goldLine(4900, 5), goldLine(5170, 4, 45, 244), goldArch(5400, 210),
      goldLine(5740, 6), goldLine(5990, 4, 46, 292), goldLine(6590, 3),
    ),
    badKernels: [{ x: 430, y: 413 }, { x: 1325, y: 413 }, { x: 1730, y: 413 }, { x: 2150, y: 413 }, { x: 3060, y: 413 }, { x: 3470, y: 413 }, { x: 4200, y: 413 }, { x: 5040, y: 413 }, { x: 5840, y: 413 }, { x: 6325, y: 413 }],
    bollards: [{ x: 840, y: 420 }, { x: 1660, y: 420 }, { x: 2600, y: 420 }, { x: 3420, y: 420 }, { x: 4260, y: 420 }, { x: 5220, y: 420 }, { x: 6090, y: 420 }],
    gulls: [
      { x: 1230, y: 365, span: 75, altitude: 19, speed: 1.4 },
      { x: 2185, y: 379, span: 80, altitude: 18, speed: 1.7 },
      { x: 3150, y: 366, span: 95, altitude: 24, speed: 1.5 },
      { x: 4100, y: 381, span: 60, altitude: 20, speed: 1.65 },
      { x: 5000, y: 370, span: 80, altitude: 21, speed: 1.3 },
      { x: 5890, y: 375, span: 82, altitude: 21, speed: 1.8 },
    ],
    bonuses: [
      { x: 1475, y: 270, kind: 'lore' },
      { x: 3090, y: 393, kind: 'focus' },
      { x: 4420, y: 263, kind: 'heart' },
      { x: 5840, y: 403, kind: 'grass' },
    ],
    portals: [
      { x: 910, y: 387, destination: 1195, ttl: 6500 },
      { x: 2680, y: 387, destination: 3020, ttl: 6000 },
      { x: 4610, y: 387, destination: 4940, ttl: 6500 },
    ],
    checkpoints: [1540, 3250, 5760],
    signs: [
      { x: 210, text: 'ESCAPE THE FEED' },
      { x: 2240, text: 'PLOT ARMOR ACTIVATED' },
      { x: 4060, text: 'THE ALGORITHM IS WATCHING' },
      { x: 6100, text: 'JUST ONE MORE VIDEO?' },
    ],
    phone: { x: 6380, y: 415 },
    finish: 6740,
    success: 'YOU ESCAPED THE ALGORITHM!',
  },
];

/** Automated validation of map geometry, independent from Phaser. */
export function validateLevels(): string[] {
  const errors: string[] = [];
  for (const level of LEVELS) {
    if (level.finish >= level.length) errors.push(`Level ${level.id}: finish outside world`);
    for (const [a, b] of level.ground) if (a >= b) errors.push(`Level ${level.id}: invalid ground`);
    for (const position of level.checkpoints) {
      if (!level.ground.some(([a, b]) => position > a + 36 && position < b - 36)) {
        errors.push(`Level ${level.id}: checkpoint ${position} over pit`);
      }
    }
    for (const portal of level.portals) if (!level.ground.some(([a, b]) => portal.destination > a + 30 && portal.destination < b - 30)) {
      errors.push(`Level ${level.id}: portal destination ${portal.destination} is unsafe`);
    }
    for (let i = 1; i < level.ground.length; i++) {
      const gap = level.ground[i][0] - level.ground[i - 1][1];
      if (gap > 155) errors.push(`Level ${level.id}: gap ${gap} wider than normal jump`);
    }
  }
  return errors;
}
