import { describe, it, expect } from 'vitest';
import {
  BATALHA_SANGRENTA,
  CHEFES_ESPECIAIS,
  DIFICULDADES_BATALHA,
  DIFICULDADES_BATALHA_MAP,
  NIVEL_BATALHA_SANGRENTA,
  conferirEntradaBatalha,
  dificuldadeLiberada,
  diaDeBrasilia,
  gastarTentativa,
  montarOndas,
  recompensaDaBatalha,
  sementeDaOnda,
  tentativasRestantes,
} from '@/game/batalhaSangrenta';
import { DADOS_CACADA_MAP } from '@/rules/cacada';
import { SUBCLASSES } from '@/rules/subclasses';

/** Regras puras da Provação de Batalha Sangrenta (cinco dificuldades, decididas em 13/10/2026). */
describe('Batalha Sangrenta: regras', () => {
  const HOJE = new Date('2026-10-13T15:00:00Z');

  it('as cinco dificuldades: estrela, chefes e faixa de fragmentos', () => {
    expect(DIFICULDADES_BATALHA.map((d) => [d.nome, d.estrela, d.chefes, d.fragmentos.min, d.fragmentos.max])).toEqual([
      ['Fácil', 5, 1, 1, 3],
      ['Médio', 6, 1, 2, 5],
      ['Difícil', 7, 1, 3, 6],
      ['Muito difícil', 8, 1, 6, 8],
      ['Inferno', 9, 2, 7, 12],
    ]);
    expect(DIFICULDADES_BATALHA_MAP.inferno.fragmentosSubclasse).toEqual({ chancePercentual: 20, min: 1, max: 2 });
    expect(DIFICULDADES_BATALHA.filter((d) => d.fragmentosSubclasse).map((d) => d.id)).toEqual(['inferno']);
  });

  it('o dia vale em Brasília (UTC−3)', () => {
    expect(diaDeBrasilia(new Date('2026-10-13T02:59:00Z'))).toBe('2026-10-12');
    expect(diaDeBrasilia(new Date('2026-10-13T03:00:00Z'))).toBe('2026-10-13');
  });

  it('3 tentativas por dia no total, e o contador zera quando o dia muda', () => {
    let estado = undefined as ReturnType<typeof gastarTentativa> | undefined;
    expect(tentativasRestantes(estado, HOJE)).toBe(3);
    estado = gastarTentativa(estado, HOJE);
    estado = gastarTentativa(estado, HOJE);
    expect(tentativasRestantes(estado, HOJE)).toBe(1);
    estado = gastarTentativa(estado, HOJE);
    expect(conferirEntradaBatalha('facil', 25, estado, [], HOJE)).toEqual({ ok: false, motivo: 'semTentativas' });
    const dia2 = new Date('2026-10-14T15:00:00Z');
    expect(tentativasRestantes(estado, dia2)).toBe(3);
    expect(gastarTentativa(estado, dia2)).toEqual({ dia: '2026-10-14', tentativas: 1 });
  });

  it('pede o nível da vitrine (20) e uma dificuldade válida', () => {
    expect(NIVEL_BATALHA_SANGRENTA).toBe(20);
    expect(conferirEntradaBatalha('facil', 19, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'nivelInsuficiente' });
    expect(conferirEntradaBatalha('facil', 20, undefined, [], HOJE)).toMatchObject({ ok: true });
    expect(conferirEntradaBatalha('impossivel', 30, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeInvalida' });
    expect(conferirEntradaBatalha(undefined, 30, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeInvalida' });
  });

  it('cada dificuldade abre ao vencer a anterior; a Fácil está sempre aberta', () => {
    expect(dificuldadeLiberada('facil', [])).toBe(true);
    expect(dificuldadeLiberada('medio', [])).toBe(false);
    expect(dificuldadeLiberada('medio', ['facil'])).toBe(true);
    expect(dificuldadeLiberada('inferno', ['facil', 'medio', 'dificil'])).toBe(false);
    expect(dificuldadeLiberada('inferno', ['muitoDificil'])).toBe(true);
    expect(conferirEntradaBatalha('dificil', 30, undefined, ['facil'], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeBloqueada' });
  });

  it('ondas: 4 monstros comuns da estrela e o chefe Especial por último', () => {
    for (const d of DIFICULDADES_BATALHA.filter((x) => x.id !== 'inferno')) {
      const ondas = montarOndas(d, 12345);
      expect(ondas).toHaveLength(BATALHA_SANGRENTA.ondasComuns + 1);
      expect(ondas.map((o) => o.chefe)).toEqual([false, false, false, false, true]);
      for (const o of ondas) expect(DADOS_CACADA_MAP[o.monstroId].estrela).toBe(d.estrela);
      expect(ondas[4].monstroId).toBe(CHEFES_ESPECIAIS[d.id][0]);
      expect(ondas.slice(0, 4).every((o) => !DADOS_CACADA_MAP[o.monstroId].chave)).toBe(true);
      expect(new Set(ondas.slice(0, 4).map((o) => o.monstroId)).size).toBe(4); // sem repetir
    }
  });

  it('Inferno: 9★ com 2 chefes Especiais diferentes por último', () => {
    const ondas = montarOndas(DIFICULDADES_BATALHA_MAP.inferno, 7);
    expect(ondas).toHaveLength(6);
    expect(ondas.map((o) => o.chefe)).toEqual([false, false, false, false, true, true]);
    expect(ondas.every((o) => DADOS_CACADA_MAP[o.monstroId].estrela === 9)).toBe(true);
    expect(ondas[4].monstroId).not.toBe(ondas[5].monstroId);
    expect(CHEFES_ESPECIAIS.inferno).toContain(ondas[4].monstroId);
  });

  it('é determinística pela semente e muda com ela', () => {
    const d = DIFICULDADES_BATALHA_MAP.medio;
    expect(montarOndas(d, 99)).toEqual(montarOndas(d, 99));
    const varias = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => montarOndas(d, s).map((o) => o.monstroId).join()));
    expect(varias.size).toBeGreaterThan(1);
  });

  it('vitória: fragmentos de alma dentro da faixa de cada dificuldade', () => {
    for (const d of DIFICULDADES_BATALHA) {
      const vistos = new Set<number>();
      for (let semente = 1; semente <= 400; semente++) {
        const r = recompensaDaBatalha(d, true, semente);
        expect(r.fragmentosAlma).toBeGreaterThanOrEqual(d.fragmentos.min);
        expect(r.fragmentosAlma).toBeLessThanOrEqual(d.fragmentos.max);
        expect(r.ouro).toBe(150);
        expect(r.diamantes).toBe(0);
        vistos.add(r.fragmentosAlma);
      }
      expect(vistos.size).toBe(d.fragmentos.max - d.fragmentos.min + 1); // o sorteio alcança a faixa toda
    }
  });

  it('só o Inferno sorteia fragmentos de subclasse: cerca de 20% das vitórias, de 1 a 2, de qualquer uma das 12', () => {
    for (const d of DIFICULDADES_BATALHA.filter((x) => x.id !== 'inferno')) {
      for (let s = 1; s <= 200; s++) expect(recompensaDaBatalha(d, true, s).fragmentosSubclasse).toBeNull();
    }
    const inferno = DIFICULDADES_BATALHA_MAP.inferno;
    let caiu = 0;
    const subclasses = new Set<string>();
    const quantidades = new Set<number>();
    const total = 2000;
    for (let s = 1; s <= total; s++) {
      const f = recompensaDaBatalha(inferno, true, s * 7919).fragmentosSubclasse;
      if (f) {
        caiu++;
        subclasses.add(f.subclasseId);
        quantidades.add(f.quantidade);
        expect(SUBCLASSES.some((sc) => sc.id === f.subclasseId)).toBe(true);
      }
    }
    expect(caiu / total).toBeGreaterThan(0.15);
    expect(caiu / total).toBeLessThan(0.25);
    expect([...quantidades].sort()).toEqual([1, 2]);
    expect(subclasses.size).toBe(SUBCLASSES.length);
  });

  it('toda vitória dá 150 de ouro e a primeira vitória na dificuldade dá mais 10 Diamantes', () => {
    for (const d of DIFICULDADES_BATALHA) {
      expect(recompensaDaBatalha(d, true, 5, true)).toMatchObject({ ouro: 150, diamantes: 10 });
      expect(recompensaDaBatalha(d, true, 5, false)).toMatchObject({ ouro: 150, diamantes: 0 });
    }
  });

  it('derrota: só 50 de ouro, sem fragmentos nem Diamantes (mesmo na primeira vez)', () => {
    for (const d of DIFICULDADES_BATALHA) {
      expect(recompensaDaBatalha(d, false, 5)).toEqual({ fragmentosAlma: 0, fragmentosSubclasse: null, ouro: 50, diamantes: 0 });
      expect(recompensaDaBatalha(d, false, 5, true)).toEqual({ fragmentosAlma: 0, fragmentosSubclasse: null, ouro: 50, diamantes: 0 });
    }
  });

  it('cada onda tem a sua semente', () => {
    const sementes = [0, 1, 2, 3, 4, 5].map((i) => sementeDaOnda(555, i));
    expect(new Set(sementes).size).toBe(6);
    expect(sementes.every((s) => s >= 0)).toBe(true);
  });
});
