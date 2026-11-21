import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARENA_UI, DEGRAUS_DOS_RANQUES, INSIGNIA_DO_RANQUE, POSICAO } from '../arenaUi';
import { RANQUES } from '@/rules/arenaRanqueada';

const publico = join(__dirname, '..', '..', '..', 'public');

function todasAsPecas(): string[] {
  const urls: string[] = [];
  const juntar = (v: unknown) => {
    if (typeof v === 'string') urls.push(v);
    else if (typeof v === 'function') return;
    else if (v && typeof v === 'object') Object.values(v).forEach(juntar);
  };
  juntar(ARENA_UI);
  for (const aceso of [true, false]) for (const n of [1, 2, 3] as const) urls.push(ARENA_UI.tab(n, aceso));
  for (const aceso of [true, false]) urls.push(ARENA_UI.cabecalho(aceso));
  for (const n of [1, 2, 3, 5] as const) urls.push(ARENA_UI.tituloDoCampeao(n));
  for (let i = 0; i < RANQUES.length; i++) for (const t of ['p', 'g'] as const) urls.push(INSIGNIA_DO_RANQUE(i, t));
  return urls;
}

describe('arte das telas da Arena', () => {
  it('toda peça existe, com até 350 KB, e não sobra arquivo na pasta', () => {
    const urls = new Set(todasAsPecas());
    for (const url of urls) {
      expect(existsSync(join(publico, url)), url).toBe(true);
      expect(statSync(join(publico, url)).size, url).toBeLessThanOrEqual(350 * 1024);
    }
    for (const f of readdirSync(join(publico, 'images/arena/tela'))) expect(urls.has(`/images/arena/tela/${f}`), f).toBe(true);
  });

  it('as 10 insígnias de ranque (pequena e grande) e os 10 degraus do mapa', () => {
    expect(RANQUES).toHaveLength(10);
    expect(DEGRAUS_DOS_RANQUES).toHaveLength(10);
    for (const d of DEGRAUS_DOS_RANQUES) {
      expect(d.x).toBeGreaterThan(20);
      expect(d.x).toBeLessThan(340);
      expect(d.y).toBeGreaterThan(50);
      expect(d.y).toBeLessThan(200);
    }
    expect(INSIGNIA_DO_RANQUE(0, 'p')).toBe('/images/arena/tela/rank01-p.webp');
    expect(INSIGNIA_DO_RANQUE(9, 'g')).toBe('/images/arena/tela/rank10-g.webp');
  });

  it('os cartões, abas e painéis cabem na grade de 360 x 540', () => {
    const rects = [POSICAO.voltar, POSICAO.livro, POSICAO.titulo, POSICAO.painelJogador, POSICAO.ranquePainel, POSICAO.trocar, POSICAO.contagem, POSICAO.voce, ...Object.values(POSICAO.modos)];
    for (const r of rects) {
      expect(r.x + r.l).toBeLessThanOrEqual(360);
      expect(r.y + r.a).toBeLessThanOrEqual(540);
    }
    for (const c of [POSICAO.cartao, POSICAO.rcartao]) {
      expect(c.ys).toHaveLength(5);
      expect(c.x + c.l).toBeLessThanOrEqual(360);
      expect(c.ys[4] + c.a).toBeLessThanOrEqual(540);
      for (let i = 1; i < 5; i++) expect(c.ys[i] - c.ys[i - 1]).toBeGreaterThanOrEqual(c.a - 10);
    }
    expect(POSICAO.abas.xs[2] + POSICAO.abas.l).toBeLessThanOrEqual(360);
  });
});
