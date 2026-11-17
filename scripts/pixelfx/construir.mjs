import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const REPO = process.env.PIXELFX_DIR ?? '../pixelfx'; // o clone de https://github.com/patch-gg/pixelfx
const SAIDA = process.env.PIXELFX_BRUTO ?? '/tmp/pixelfx-bruto';
rmSync(SAIDA, { recursive: true, force: true }); mkdirSync(SAIDA, { recursive: true });
const PAL = {
  fogo: ['#3a0d08', '#8a1f17', '#d6371c', '#ff7a1f', '#ffb53d', '#ffe27a', '#ffffff'],
  gelo: ['#0b1f3a', '#1c4f8c', '#3b8bd6', '#7cc8f5', '#bfeaff', '#e8fbff', '#ffffff'],
  relampago: ['#2a2208', '#7a6410', '#d4b020', '#ffe040', '#fff27a', '#fffbd0', '#ffffff'],
  terra: ['#2a1a0a', '#5c3a18', '#8b5a2b', '#b88a44', '#7fa84a', '#d8c27a', '#fff1c0'],
  vento: ['#0a2a2a', '#17625c', '#2fa08a', '#6fd8b0', '#b8f5d8', '#e6fff2', '#ffffff'],
  sagrado: ['#4a3a10', '#a8862a', '#e8c85a', '#ffe99a', '#fff6cf', '#ffffff', '#ffffff'],
  sombrio: ['#120820', '#2e1250', '#5a2a9a', '#8a4fd6', '#b98af0', '#e0c8ff', '#ffffff'],
  escarlate: ['#2a0506', '#6e0f14', '#b3171f', '#e02a2a', '#ff6a5a', '#ffb0a0', '#ffffff'],
};
// nome de saída, id do pixelfx, fps, paleta (opcional)
const TRABALHOS = [
  ['golpe-corte', 'melee/sword-slash', 15], ['golpe-garra', 'melee/claw-swipe', 15], ['golpe-perfuracao', 'melee/thrust', 15],
  ['golpe-contusao', 'impacts/blunt-hit', 15], ['golpe-simples', 'impacts/hit-spark', 15], ['golpe-critico', 'impacts/crit-hit', 15],
  ['bloqueio', 'impacts/shield-block', 15], ['golpe-relampago', 'lightning/zap-hit', 15],
  ...['fogo', 'gelo', 'terra', 'vento', 'sagrado', 'sombrio'].map((e) => [`magia-${e}`, 'arcane/mana-burst', 15, e]),
  ['dot-sangramento', 'status/bleeding', 12], ['dot-queimadura', 'fire/spirit-flame', 12, 'fogo'], ['dot-veneno', 'nature/toxic-puddle', 12],
  ['dot-podridao', 'nature/toxic-puddle', 12, 'escarlate'], ['dot-congelamento', 'ice/ice-crystal', 12], ['dot-sono', 'status/sleep', 12],
  ['dot-loucura', 'status/confused', 12], ['dot-maldicao', 'shadow/shadow-flames', 12], ['dot-paralisia', 'lightning/spark-arc', 12],
  ['cura', 'holy/heal-aoe', 15], ['morte', 'spawn/poof', 15],
];
for (const [nome, id, fps, pal] of TRABALHOS) {
  const dir = `${SAIDA}/${nome}`;
  const args = ['tools/render.mjs', id, '--sheet', '--no-actor', '--fps', String(fps), '--out', dir];
  if (pal) args.push('--opts', JSON.stringify({ palette: PAL[pal] }));
  try { execFileSync('node', args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }); console.log('ok', nome); }
  catch (e) { console.log('FALHOU', nome, String(e.stderr || e).slice(0, 200)); }
}
