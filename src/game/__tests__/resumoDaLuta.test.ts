import { describe, it, expect } from 'vitest';
import type { ResultadoCombate, ResultadoCombatePvp } from '@/game/combat';
import { detalheDaVitoria, resumoDoPvp } from '@/game/resumoDaLuta';
import { monstrosDerrotadosDoDocumento } from '@/rules/conquistas';

const luta = (partes: Partial<ResultadoCombate> & Pick<ResultadoCombate, 'logTurnos'>): ResultadoCombate => ({
  vencedor: 'personagem',
  mensagens: [],
  xpGanho: 0,
  ouroGanho: 0,
  ouroPerdido: 0,
  personagemFinal: { hp: 100, hpMax: 100, ouro: 0 },
  ...partes,
});
const ataque = (atacante: string, defensor: string, danoEfetivo: number, extra: object = {}) => ({ atacante, defensor, danoBruto: danoEfetivo, danoEfetivo, sobreescudoRestante: 0, hpRestante: 0, mensagem: '', ...extra });

describe('detalheDaVitoria (Conquistas de Monstros)', () => {
  it('soma o dano e os críticos do personagem e os status que ele aplicou no monstro', () => {
    const d = detalheDaVitoria(
      luta({
        logTurnos: [
          { numeroTurno: 1, ataques: [ataque('Ana', 'Lobo', 40, { golpesCriticos: 1 }), ataque('Lobo', 'Ana', 10)], eventosEfeitos: [{ tipo: 'aplicado', efeito: 'sangramento' as never, alvo: 'Lobo' }, { tipo: 'aplicado', efeito: 'escudo' as never }] },
          { numeroTurno: 2, ataques: [ataque('Ana', 'Lobo', 60, { golpesCriticos: 2 })], eventosEfeitos: [] },
        ],
        personagemFinal: { hp: 90, hpMax: 100, ouro: 0 },
      }),
      'Ana',
      { id: 'lobo-cinzento' },
    );
    expect(d.monstroId).toBe('lobo-cinzento');
    // o dano do monstro e o status que ficou no próprio personagem não contam
    expect(d.contadores).toEqual({ danoCausado: 100, golpesCriticos: 3, statusAplicados: 1 });
  });

  it('vida cheia: só quando nenhum golpe nem dano contínuo atingiu o personagem', () => {
    const limpa = detalheDaVitoria(luta({ logTurnos: [{ numeroTurno: 1, ataques: [ataque('Ana', 'Lobo', 50), ataque('Lobo', 'Ana', 0)], eventosEfeitos: [] }] }), 'Ana');
    expect(limpa.contadores.vitoriasVidaCheia).toBe(1);
    const golpe = detalheDaVitoria(luta({ logTurnos: [{ numeroTurno: 1, ataques: [ataque('Lobo', 'Ana', 3)], eventosEfeitos: [] }] }), 'Ana');
    expect(golpe.contadores.vitoriasVidaCheia).toBeUndefined();
    const veneno = detalheDaVitoria(luta({ logTurnos: [{ numeroTurno: 1, ataques: [], eventosEfeitos: [{ tipo: 'dano', efeito: 'veneno' as never, dano: 2 }] }] }), 'Ana');
    expect(veneno.contadores.vitoriasVidaCheia).toBeUndefined();
    // dano contínuo no monstro não é perder vida
    const noMonstro = detalheDaVitoria(luta({ logTurnos: [{ numeroTurno: 1, ataques: [], eventosEfeitos: [{ tipo: 'dano', efeito: 'veneno' as never, dano: 2, alvo: 'Lobo' }] }] }), 'Ana');
    expect(noMonstro.contadores.vitoriasVidaCheia).toBe(1);
  });

  it('no limite: terminar com menos de 10% da vida máxima', () => {
    const t = (hp: number) => detalheDaVitoria(luta({ logTurnos: [], personagemFinal: { hp, hpMax: 100, ouro: 0 } }), 'Ana').contadores.vitoriasNoLimite;
    expect([t(9), t(10), t(1)]).toEqual([1, undefined, 1]);
  });

  it('o elemento de ataque do monstro conta uma vez por elemento (dois elementos contam os dois)', () => {
    const um = detalheDaVitoria(luta({ logTurnos: [] }), 'Ana', { id: 'a', elementoAtaque: 'fogo' });
    expect(um.elementos).toEqual(['fogo']);
    expect(um.contadores.vitoriasFogo).toBe(1);
    const dois = detalheDaVitoria(luta({ logTurnos: [] }), 'Ana', { id: 'b', elementoAtaque: 'gelo', elementoAlternado: 'sombrio' });
    expect([dois.contadores.vitoriasGelo, dois.contadores.vitoriasSombrio, dois.contadores.vitoriasFogo]).toEqual([1, 1, undefined]);
    const igual = detalheDaVitoria(luta({ logTurnos: [] }), 'Ana', { id: 'c', elementoAtaque: 'terra', elementoAlternado: 'terra' });
    expect(igual.elementos).toEqual(['terra']);
    expect(detalheDaVitoria(luta({ logTurnos: [] }), 'Ana').elementos).toEqual([]);
  });
});

describe('monstrosDerrotadosDoDocumento', () => {
  it('lê só textos válidos, sem repetir, e ignora o resto', () => {
    expect(monstrosDerrotadosDoDocumento(['a', 'a', 'b', 7, '', null, 'x'.repeat(81)])).toEqual(['a', 'b']);
    expect(monstrosDerrotadosDoDocumento([])).toBeUndefined();
    expect(monstrosDerrotadosDoDocumento('a')).toBeUndefined();
  });
});

describe('resumoDoPvp (Conquistas de PvP)', () => {
  const pvp = (vencedor: 'a' | 'b' | 'ninguem', hp = 100, ataques: { atacante: string; danoEfetivo: number }[] = []) =>
    ({
      vencedor,
      motivoFim: 'derrota',
      logTurnos: [{ numeroTurno: 1, ataques: ataques.map((a) => ({ ...a, defensor: 'x', danoBruto: a.danoEfetivo, sobreescudoRestante: 0, hpRestante: 0, mensagem: '' })), eventosEfeitos: [] }],
      mensagens: [],
      finalA: { nome: 'Ana', hp, hpMax: 100 },
      finalB: { nome: 'Beto', hp: 0, hpMax: 100 },
    }) as unknown as ResultadoCombatePvp;

  it('conta a luta, o dano de quem atacou e a vitória, a sequência e a vocação', () => {
    const r = resumoDoPvp(pvp('a', 80, [{ atacante: 'Ana', danoEfetivo: 40 }, { atacante: 'Beto', danoEfetivo: 99 }, { atacante: 'Ana', danoEfetivo: 60 }]), { nivel: 10, sequenciaAtual: 2, maiorSequencia: 4 }, { nivel: 10, classeId: 'samurai' });
    expect(r.ganhos).toEqual({ lutasPvp: 1, danoPvp: 100, vitoriasPvp: 1 });
    expect([r.sequenciaAtual, r.maiorSequencia, r.vocacaoDerrotada]).toEqual([3, 4, 'samurai']);
    // a sequência passa a maior
    expect(resumoDoPvp(pvp('a'), { nivel: 10, sequenciaAtual: 4, maiorSequencia: 4 }, { nivel: 10 }).maiorSequencia).toBe(5);
  });

  it('derrota e empate zeram a sequência, não contam vitória nem vocação', () => {
    for (const v of ['b', 'ninguem'] as const) {
      const r = resumoDoPvp(pvp(v), { nivel: 10, sequenciaAtual: 3, maiorSequencia: 3 }, { nivel: 20, classeId: 'bandido' });
      expect(r.ganhos).toEqual({ lutasPvp: 1, danoPvp: 0 });
      expect([r.sequenciaAtual, r.maiorSequencia, r.vocacaoDerrotada]).toEqual([0, 3, undefined]);
    }
  });

  it('nível maior do adversário e virada (menos de 10% de vida) só contam na vitória', () => {
    const zebra = resumoDoPvp(pvp('a', 9), { nivel: 10 }, { nivel: 11 });
    expect(zebra.ganhos).toMatchObject({ vitoriasContraNivelMaior: 1, viradasPvp: 1 });
    const igual = resumoDoPvp(pvp('a', 10), { nivel: 10 }, { nivel: 10 });
    expect(igual.ganhos.vitoriasContraNivelMaior).toBeUndefined();
    expect(igual.ganhos.viradasPvp).toBeUndefined();
    expect(resumoDoPvp(pvp('b', 5), { nivel: 10 }, { nivel: 30 }).ganhos.vitoriasContraNivelMaior).toBeUndefined();
  });
});
