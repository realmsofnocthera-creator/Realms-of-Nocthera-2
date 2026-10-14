import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarTorre, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { getTransactionsByUid, resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** Torre Celestial no servidor: andar a andar, sem voltar, sem penalidade na derrota, recompensas e idempotência. */
describe('Torre Celestial (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  const MUITO_FORTE = { vigor: 30000, sorte: 0, forca: 30000, vitalidade: 20000, arcano: 0, inteligencia: 0, agilidade: 500 };
  const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Torre_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 5, atributos: MUITO_FORTE, ...extra });
    return (await getCharacterByUid(uid))!;
  }

  it('bloqueia nível 4 sem gravar nada', async () => {
    await setup('t1', { nivel: 4 });
    await expect(executarTorre('t1', { seed: 1 })).rejects.toThrow('Nível insuficiente');
    expect((await getCharacterByUid('t1'))!.torreAndar).toBeUndefined();
  });

  it('vitória no andar 1: avança, dá 27 de XP e 3 de essência de habilidade', async () => {
    const antes = await setup('t2');
    const r = await executarTorre('t2', { seed: 7, combateId: 'torre-0001' });
    expect(r.resultado.vencedor).toBe('personagem');
    expect(r.torre).toMatchObject({ andar: 1, chefe: false, venceu: true, essenciaHabilidade: 3, diamantes: 0, fragmentosAscensao: 0, proximoAndar: 2 });
    expect(r.torre.xpGanho).toBeGreaterThanOrEqual(27);
    const c = (await getCharacterByUid('t2'))!;
    expect(c.torreAndar).toBe(1);
    expect(c.essenciaHabilidade).toBe((antes.essenciaHabilidade ?? 0) + 3);
    expect(c.ouro).toBe(antes.ouro); // a Torre não dá ouro
  });

  it('só sobe um andar de cada vez e nunca volta (o andar atual é sempre o seguinte)', async () => {
    await setup('t3');
    const a = await executarTorre('t3', { seed: 1, combateId: 'torre-0010' });
    const b = await executarTorre('t3', { seed: 2, combateId: 'torre-0011' });
    const c = await executarTorre('t3', { seed: 3, combateId: 'torre-0012' });
    expect([a.torre.andar, b.torre.andar, c.torre.andar]).toEqual([1, 2, 3]);
    expect((await getCharacterByUid('t3'))!.torreAndar).toBe(3);
  });

  it('o andar 10 é o chefe Rikk, único', async () => {
    await setup('t4', { torreAndar: 9 });
    const r = await executarTorre('t4', { seed: 5, combateId: 'torre-0020' });
    expect(r.torre).toMatchObject({ andar: 10, chefe: true, nome: 'Rikk, o Rato Carniceiro', venceu: true });
  });

  it('derrota: só perde a luta (sem perder ouro, sem avançar) e pode tentar de novo na hora', async () => {
    await setup('t5', { atributos: FRACO, torreAndar: 150, ouro: 1000 });
    const r = await executarTorre('t5', { seed: 1, combateId: 'torre-0030' });
    expect(r.resultado.vencedor).toBe('monstro');
    expect(r.torre).toMatchObject({ andar: 151, venceu: false, xpGanho: 0, essenciaHabilidade: 0, proximoAndar: 151 });
    const c = (await getCharacterByUid('t5'))!;
    expect(c.torreAndar).toBe(150);
    expect(c.ouro).toBe(1000);
    // pode tentar o mesmo andar de novo, sem limite
    const de_novo = await executarTorre('t5', { seed: 2, combateId: 'torre-0031' });
    expect(de_novo.torre.andar).toBe(151);
  });

  it('o XP da Torre para no nível 15', async () => {
    await setup('t6', { nivel: 15, torreAndar: 5 });
    const antes = (await getCharacterByUid('t6'))!;
    const r = await executarTorre('t6', { seed: 3, combateId: 'torre-0040' });
    expect(r.torre.xpGanho).toBe(0);
    const c = (await getCharacterByUid('t6'))!;
    expect(c.xpAtual).toBe(antes.xpAtual);
    expect(c.essenciaHabilidade).toBe((antes.essenciaHabilidade ?? 0) + 20); // andar 6: piso de 3,4 × 6
  });

  it('a partir do andar 200: 5 Diamantes, sem essência; nos andares de chefe, 1 fragmento de ascensão', async () => {
    const antes = await setup('t7', { torreAndar: 199 });
    const r = await executarTorre('t7', { seed: 9, combateId: 'torre-0050' });
    expect(r.torre).toMatchObject({ andar: 200, chefe: true, nome: 'Nerezza, a Dama do Véu Negro', venceu: true, essenciaHabilidade: 0, diamantes: 5, fragmentosAscensao: 1 });
    const c = (await getCharacterByUid('t7'))!;
    expect(c.diamantes).toBe((antes.diamantes ?? 0) + 5);
    expect(c.fragmentosAscensao).toBe((antes.fragmentosAscensao ?? 0) + 1);
    const r2 = await executarTorre('t7', { seed: 10, combateId: 'torre-0051' });
    expect(r2.torre).toMatchObject({ andar: 201, chefe: false, diamantes: 5, fragmentosAscensao: 0 });
    const motivos = (await getTransactionsByUid('t7')).map((t) => t.motivo);
    expect(motivos.some((m) => m.includes('Torre Celestial (andar 200)'))).toBe(true);
  });

  it('depois do andar 300 a Torre está completa', async () => {
    await setup('t8', { torreAndar: 300 });
    await expect(executarTorre('t8', { seed: 1 })).rejects.toThrow('Você já completou a Torre Celestial');
  });

  it('idempotente: reenviar o mesmo combateId devolve o resultado gravado, sem pagar duas vezes', async () => {
    await setup('t9', { torreAndar: 199 });
    const a = await executarTorre('t9', { seed: 4, combateId: 'torre-0060' });
    const depois = (await getCharacterByUid('t9'))!;
    const b = await executarTorre('t9', { seed: 99, combateId: 'torre-0060' });
    expect(b.repetido).toBe(true);
    expect(b.torre).toEqual(a.torre);
    const c = (await getCharacterByUid('t9'))!;
    expect(c.diamantes).toBe(depois.diamantes);
    expect(c.torreAndar).toBe(200);
  });
});
