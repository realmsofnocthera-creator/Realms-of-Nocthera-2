import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestoJson from '../guardioesManifesto.json';
import { ARENAS_DO_TESTE } from '../arenasDoTeste';
import * as ui from '../testeEquipeUi';
import { ANIMACAO_DO_MONSTRO } from '@/lib/cacadaArte';
import { CATEGORIAS_DO_TESTE, CHEFES_DO_TESTE } from '@/rules/testeEquipe';

type Folha = { quadros: number; largura: number; altura: number; ms: number[] };
const manifesto = manifestoJson as unknown as Record<string, { idle: Folha; ataque: Folha & { impacto: number }; golpe: Folha }>;
const publico = join(__dirname, '..', '..', '..', 'public');

/** Largura e altura de um WebP (VP8L lossless ou VP8X/VP8 lossy). */
function medirWebp(arquivo: string): { w: number; h: number } {
  const b = readFileSync(arquivo);
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (tipo === 'VP8L') {
    const v = b.readUInt32LE(21);
    return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

describe('guardiões do Teste de Equipe animados', () => {
  it('os 3 guardiões têm idle, ataque e golpe, com o tamanho certo e até 350 KB', () => {
    expect(Object.keys(manifesto).sort()).toEqual(CATEGORIAS_DO_TESTE.map((c) => CHEFES_DO_TESTE[c].id).sort());
    for (const [id, m] of Object.entries(manifesto)) {
      for (const nome of ['idle', 'ataque', 'golpe'] as const) {
        const f = m[nome];
        const arq = join(publico, 'images/teste-equipe/guardioes', `${id}-${nome}.webp`);
        expect(statSync(arq).size, `${id} ${nome}`).toBeLessThanOrEqual(350 * 1024);
        expect(f.ms.length, `${id} ${nome} ms`).toBe(f.quadros);
        const { w, h } = medirWebp(arq);
        expect(w, `${id} ${nome} largura`).toBe(f.quadros * f.largura);
        expect(h, `${id} ${nome} altura`).toBe(f.altura);
      }
      expect(m.ataque.impacto, id).toBeGreaterThan(0);
      expect(m.ataque.impacto, id).toBeLessThan(m.ataque.ms.reduce((a, b) => a + b, 0));
      expect(ANIMACAO_DO_MONSTRO[id], id).toBeDefined();
    }
  });
});

describe('arenas e peças do Teste de Equipe', () => {
  it('cada teste tem arena com vídeo (AV1 e H.264) e capa, sem arquivo sobrando', () => {
    for (const c of CATEGORIAS_DO_TESTE) {
      const a = ARENAS_DO_TESTE[c];
      for (const f of [a.imagem, a.videoAv1, a.videoH264]) expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, a.imagem)).size).toBeLessThanOrEqual(350 * 1024);
    }
    const usados = new Set(Object.values(ARENAS_DO_TESTE).flatMap((a) => [a.imagem, a.videoAv1, a.videoH264].map((f) => f.split('/').pop())));
    for (const dir of ['videos/teste-equipe', 'images/teste-equipe/arenas']) for (const f of readdirSync(join(publico, dir))) expect(usados.has(f), f).toBe(true);
  });

  it('as peças da tela existem, com até 350 KB, e cabem na grade de 360 x 540', () => {
    const arquivos = new Set<string>([
      ...Object.values(ui.TESTE_UI),
      ...CATEGORIAS_DO_TESTE.flatMap((c) => [ui.PILAR(c, true), ui.PILAR(c, false), ui.DORSO(c)]),
      ...[1, 2, 3, 4, 5, 6].flatMap((n) => [ui.SELO_DA_DIFICULDADE(n), ui.MOLDURA_DA_CARTA(n)]),
    ]);
    for (const f of arquivos) {
      expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    }
    for (const f of readdirSync(join(publico, 'images/teste-equipe/tela'))) expect(arquivos.has(`/images/teste-equipe/tela/${f}`), f).toBe(true);
    for (const [nome, p] of Object.entries({ voltar: ui.POSICAO.voltar, livro: ui.POSICAO.livro, titulo: ui.POSICAO.titulo, info: ui.POSICAO.info, mais: ui.POSICAO.mais, painel: ui.POSICAO.painel, botaoIniciar: ui.POSICAO.botaoIniciar, botaoFormar: ui.POSICAO.botaoFormar })) {
      expect(p.x + p.l, nome).toBeLessThanOrEqual(360);
      expect(p.y + p.a, nome).toBeLessThanOrEqual(540);
    }
    for (const c of CATEGORIAS_DO_TESTE) expect(ui.POSICAO.pilares[c].x + ui.POSICAO.pilares[c].l).toBeLessThanOrEqual(360);
    expect(ui.topoDaDificuldade(6)).toBeLessThan(ui.topoDaDificuldade(1));
    expect(ui.topoDaDificuldade(1) + ui.POSICAO.linhasDasDificuldades.a).toBeLessThanOrEqual(ui.POSICAO.painel.y + ui.POSICAO.painel.a);
  });
});
