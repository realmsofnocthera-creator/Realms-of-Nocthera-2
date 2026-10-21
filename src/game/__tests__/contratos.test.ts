import { describe, it, expect } from 'vitest';
import { contarVitorias, contratoPronto, contratosDoDocumento, gerarContratos, progressoDoContrato, XP_DE_GUILDA_DOS_CONTRATOS } from '@/game/contratos';
import { DADOS_CACADA_MAP } from '@/rules/cacada';
import { MATERIAIS_MAP } from '@/rules/materiais';

describe('Quadro de contratos (7.3)', () => {
  it('3 contratos por dia: derrotar, entregar e vencer; o mesmo jogador no mesmo dia recebe os mesmos', () => {
    const a = gerarContratos('u1', '2026-10-21', 6, []);
    expect(a.lista.map((c) => c.tipo)).toEqual(['derrotar', 'entregar', 'vencer']);
    expect(gerarContratos('u1', '2026-10-21', 6, [])).toEqual(a);
    expect(a.lista.map((c) => c.recompensa.xpGuilda)).toEqual([...XP_DE_GUILDA_DOS_CONTRATOS]);
    expect(XP_DE_GUILDA_DOS_CONTRATOS.reduce((s, x) => s + x, 0)).toBe(100);
    const dias = new Set(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'].map((d) => JSON.stringify(gerarContratos('u1', d, 6, []).lista.map((c) => [c.alvo, c.quantidade]))));
    expect(dias.size).toBeGreaterThan(1);
  });

  it('só usa monstros (sem os monstros-chave) das estrelas que o jogador alcança', () => {
    for (let i = 0; i < 30; i++) {
      const [derrotar, entregar] = gerarContratos(`u${i}`, '2026-10-21', 6, []).lista;
      const m = DADOS_CACADA_MAP[derrotar.alvo];
      expect([1, 2]).toContain(m.estrela);
      expect(m.chave).toBeFalsy();
      expect(MATERIAIS_MAP[entregar.alvo].raridade).toBe('comum');
      expect(MATERIAIS_MAP[entregar.alvo].estrelaOrigem).toBeLessThanOrEqual(2);
    }
  });

  it('nível 1 (sem estrela da Caçada): três contratos de vencer lutas', () => {
    expect(gerarContratos('u1', '2026-10-21', 1, []).lista.map((c) => c.tipo)).toEqual(['vencer', 'vencer', 'vencer']);
  });

  it('vitórias contam no derrotar (inclusive subespécie) e no vencer, só no mesmo dia', () => {
    const c = gerarContratos('u1', '2026-10-21', 6, []);
    const alvo = c.lista[0].alvo;
    const depois = contarVitorias(c, [alvo, 'outro-monstro'], '2026-10-21')!;
    expect(depois.lista[0].progresso).toBe(1);
    expect(depois.lista[2].progresso).toBe(2);
    expect(contarVitorias(c, [alvo], '2026-10-22')).toBeNull();
    expect(contarVitorias(undefined, [alvo], '2026-10-21')).toBeNull();
    const variante = Object.values(DADOS_CACADA_MAP).find((m) => m.varianteDe === alvo);
    if (variante) expect(contarVitorias(c, [variante.id], '2026-10-21')!.lista[0].progresso).toBe(1);
    let cheio = c;
    for (let i = 0; i < 20; i++) cheio = contarVitorias(cheio, [alvo], '2026-10-21') ?? cheio;
    expect(cheio.lista[0].progresso).toBe(cheio.lista[0].quantidade);
    expect(contratoPronto(cheio.lista[0], {})).toBe(true);
  });

  it('entregar confere a mochila', () => {
    const entregar = gerarContratos('u1', '2026-10-21', 6, []).lista[1];
    expect(progressoDoContrato(entregar, { [entregar.alvo]: 2 })).toBe(2);
    expect(contratoPronto(entregar, { [entregar.alvo]: entregar.quantidade - 1 })).toBe(false);
    expect(contratoPronto(entregar, { [entregar.alvo]: 99 })).toBe(true);
    expect(progressoDoContrato(entregar, { [entregar.alvo]: 99 })).toBe(entregar.quantidade);
  });

  it('lê do banco com tolerância', () => {
    const c = gerarContratos('u1', '2026-10-21', 6, []);
    expect(contratosDoDocumento(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(contratosDoDocumento({ dia: 'x', lista: [{ id: 'c1' }] })).toBeUndefined();
    expect(contratosDoDocumento(null)).toBeUndefined();
  });
});
