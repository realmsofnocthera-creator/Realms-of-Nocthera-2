import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarBatalhaSangrenta, executarCacada, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import { DIFICULDADES_BATALHA_MAP, recompensaDaBatalha } from '@/game/batalhaSangrenta';

/** Provação de Batalha Sangrenta no servidor: dificuldades, ondas, fragmentos, tentativas por dia e idempotência. */
describe('Batalha Sangrenta (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  const MUITO_FORTE = { vigor: 30000, sorte: 0, forca: 30000, vitalidade: 20000, arcano: 0, inteligencia: 0, agilidade: 500 };
  const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
  const HOJE = new Date('2026-10-13T15:00:00Z');
  const TODAS_MENOS_INFERNO = ['facil', 'medio', 'dificil', 'muitoDificil'];

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Sangrento_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 20, atributos: MUITO_FORTE, ...extra });
    return (await getCharacterByUid(uid))!;
  }

  it('bloqueia nível baixo e dificuldade inválida ou fechada, sem gastar tentativa nem gravar nada', async () => {
    await setup('b1', { nivel: 19 });
    await expect(executarBatalhaSangrenta('b1', 'facil', { seed: 1, agora: HOJE })).rejects.toThrow('Nível insuficiente');
    await updateCharacter('b1', { nivel: 30 });
    await expect(executarBatalhaSangrenta('b1', 'impossivel', { seed: 1, agora: HOJE })).rejects.toThrow('Dificuldade da Batalha Sangrenta inválida');
    await expect(executarBatalhaSangrenta('b1', 'medio', { seed: 1, agora: HOJE })).rejects.toThrow('Vença a dificuldade anterior');
    const c = (await getCharacterByUid('b1'))!;
    expect(c.batalhaSangrenta).toBeUndefined();
    expect(c.fragmentosAlma).toBe(0);
  });

  it('Fácil, vitória: 4 comuns da 5★ e o chefe, HP que passa de uma luta para a outra e 1 a 3 fragmentos de alma', async () => {
    await setup('b2');
    const r = await executarBatalhaSangrenta('b2', 'facil', { seed: 11, combateId: 'batalha-teste-0001', agora: HOJE });
    expect(r.dificuldade).toBe('facil');
    expect(r.estrela).toBe(5);
    expect(r.ondas).toHaveLength(5);
    expect(r.ondas.map((o) => o.chefe)).toEqual([false, false, false, false, true]);
    expect(r.ondas.every((o) => o.vencedor === 'personagem')).toBe(true);
    for (let i = 1; i < r.ondas.length; i++) expect(r.ondas[i].hpInicial).toBe(r.ondas[i - 1].hpFinal);
    expect(r.chefeVencido).toBe(true);
    expect(r.fragmentosAlma).toBeGreaterThanOrEqual(1);
    expect(r.fragmentosAlma).toBeLessThanOrEqual(3);
    expect(r.fragmentosAlma).toBe(recompensaDaBatalha(DIFICULDADES_BATALHA_MAP.facil, true, 11).fragmentosAlma);
    expect(r.fragmentosSubclasse).toBeNull();
    expect(r.ouro).toBe(0);
    expect(r.character.fragmentosAlma).toBe(r.fragmentosAlma);
    expect(r.tentativasRestantes).toBe(2);
    expect(r.character.batalhaSangrenta).toEqual({ dia: '2026-10-13', tentativas: 1 });
    expect(r.character.batalhaSangrentaVencidas).toEqual(['facil']);
    expect(r.ondas[0].resultado?.logTurnos.length).toBeGreaterThan(0);
    const tx = await getTransactionsByUid('b2');
    expect(tx.some((t) => t.moeda === 'fragmentosAlma' && t.quantidade === r.fragmentosAlma && t.motivo.startsWith('Batalha Sangrenta'))).toBe(true);
  });

  it('vencer uma dificuldade abre a seguinte', async () => {
    await setup('b3');
    await expect(executarBatalhaSangrenta('b3', 'medio', { seed: 1, agora: HOJE })).rejects.toThrow('Vença a dificuldade anterior');
    await executarBatalhaSangrenta('b3', 'facil', { seed: 2, agora: HOJE });
    const r = await executarBatalhaSangrenta('b3', 'medio', { seed: 3, agora: HOJE });
    expect(r.estrela).toBe(6);
    expect(r.fragmentosAlma).toBeGreaterThanOrEqual(2);
    expect(r.fragmentosAlma).toBeLessThanOrEqual(5);
    expect(r.character.batalhaSangrentaVencidas).toEqual(['facil', 'medio']);
  });

  it('não dá XP nem drops', async () => {
    const antes = await setup('b4', { ouro: 500 });
    const r = await executarBatalhaSangrenta('b4', 'facil', { seed: 5, agora: HOJE });
    expect(r.character.xpAtual).toBe(antes.xpAtual);
    expect(r.character.ouro).toBe(500);
    expect(r.character.inventario).toEqual({});
  });

  it('derrota: só 50 de ouro, sem fragmentos, a tentativa é gasta e a dificuldade não conta como vencida', async () => {
    await setup('b5', { atributos: FRACO, ouro: 100 });
    const r = await executarBatalhaSangrenta('b5', 'facil', { seed: 3, agora: HOJE });
    expect(r.ondas).toHaveLength(1);
    expect(r.ondas[0].vencedor).toBe('monstro');
    expect(r.ondasVencidas).toBe(0);
    expect(r.chefeVencido).toBe(false);
    expect(r.fragmentosAlma).toBe(0);
    expect(r.ouro).toBe(50);
    expect(r.character.ouro).toBe(150);
    expect(r.character.fragmentosAlma).toBe(0);
    expect(r.tentativasRestantes).toBe(2);
    expect(r.character.batalhaSangrentaVencidas ?? []).toEqual([]);
    expect(r.mensagens[0]).toContain('Você caiu na onda 1');
    const tx = await getTransactionsByUid('b5');
    expect(tx.some((t) => t.moeda === 'ouro' && t.quantidade === 50 && t.tipo === 'ganho')).toBe(true);
  });

  it('3 tentativas por dia no total; a 4ª é recusada e, no dia seguinte (Brasília), o contador zera', async () => {
    await setup('b6');
    for (let i = 0; i < 3; i++) await executarBatalhaSangrenta('b6', 'facil', { seed: 20 + i, agora: HOJE });
    await expect(executarBatalhaSangrenta('b6', 'facil', { seed: 99, agora: HOJE })).rejects.toThrow('tentativas de hoje');
    const amanha = new Date('2026-10-14T15:00:00Z');
    const r = await executarBatalhaSangrenta('b6', 'facil', { seed: 100, agora: amanha });
    expect(r.tentativasRestantes).toBe(2);
    expect(r.character.batalhaSangrenta).toEqual({ dia: '2026-10-14', tentativas: 1 });
  });

  it('mesmo combateId não gasta outra tentativa nem paga de novo (idempotente)', async () => {
    await setup('b7');
    const a = await executarBatalhaSangrenta('b7', 'facil', { seed: 7, combateId: 'batalha-teste-0002', agora: HOJE });
    const b = await executarBatalhaSangrenta('b7', 'facil', { seed: 99, combateId: 'batalha-teste-0002', agora: HOJE });
    expect(b.repetido).toBe(true);
    expect(b.fragmentosAlma).toBe(a.fragmentosAlma);
    expect(b.ondas.map((o) => o.monstroId)).toEqual(a.ondas.map((o) => o.monstroId));
    expect(b.ondas[0].resultado).toBeUndefined(); // o log só vem na resposta original
    expect(b.character.fragmentosAlma).toBe(a.fragmentosAlma);
    expect(b.character.batalhaSangrenta?.tentativas).toBe(1);
  });

  it('Inferno: 9★ com 2 chefes, 7 a 12 fragmentos e, com a sorte dos 20%, fragmentos de uma subclasse sorteada', async () => {
    await setup('b8', { batalhaSangrentaVencidas: TODAS_MENOS_INFERNO });
    let sementeComSubclasse = 0;
    let sementeSem = 0;
    for (let s = 1; s < 500 && (!sementeComSubclasse || !sementeSem); s++) {
      const f = recompensaDaBatalha(DIFICULDADES_BATALHA_MAP.inferno, true, s).fragmentosSubclasse;
      if (f && !sementeComSubclasse) sementeComSubclasse = s;
      if (!f && !sementeSem) sementeSem = s;
    }
    const com = await executarBatalhaSangrenta('b8', 'inferno', { seed: sementeComSubclasse, agora: HOJE });
    expect(com.estrela).toBe(9);
    expect(com.ondas).toHaveLength(6);
    expect(com.ondas.filter((o) => o.chefe)).toHaveLength(2);
    expect(com.chefeVencido).toBe(true);
    expect(com.fragmentosAlma).toBeGreaterThanOrEqual(7);
    expect(com.fragmentosAlma).toBeLessThanOrEqual(12);
    expect(com.fragmentosSubclasse).not.toBeNull();
    const { subclasseId, quantidade } = com.fragmentosSubclasse!;
    expect(quantidade).toBeGreaterThanOrEqual(1);
    expect(quantidade).toBeLessThanOrEqual(2);
    expect(com.character.fragmentosSubclasse?.[subclasseId]).toBe(quantidade);
    const tx = await getTransactionsByUid('b8');
    expect(tx.some((t) => t.moeda === 'fragmentosSubclasse' && t.quantidade === quantidade)).toBe(true);
    const sem = await executarBatalhaSangrenta('b8', 'inferno', { seed: sementeSem, agora: HOJE });
    expect(sem.fragmentosSubclasse).toBeNull();
  });

  it('o combateId de outra provação não pode ser reaproveitado aqui', async () => {
    await setup('b9');
    await executarCacada('b9', 'rato-da-floresta', { seed: 1, combateId: 'combate-misturado-001' });
    await expect(executarBatalhaSangrenta('b9', 'facil', { seed: 2, combateId: 'combate-misturado-001', agora: HOJE })).rejects.toThrow('fora da Batalha Sangrenta');
  });

  it('personagem inexistente', async () => {
    await expect(executarBatalhaSangrenta('ninguem', 'facil', { seed: 1, agora: HOJE })).rejects.toThrow('Personagem não encontrado');
  });
});
