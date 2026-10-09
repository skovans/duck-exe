import { LEVELS, validateLevels } from '../src/game/levels.ts';
const problems = validateLevels();
if (problems.length) {
  console.error('Level geometry problems:\n' + problems.join('\n'));
  process.exitCode = 1;
} else {
  for (const level of LEVELS) {
    console.log(`✓ LEVEL ${level.id}: ${level.name}; ${level.ground.length} ground sections; ${level.kernels.length} golden kernels; ${level.checkpoints.length} checkpoints`);
  }
  console.log('✓ All checkpoints and portal destinations are safe. All gaps are jumpable.');
}
