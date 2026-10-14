import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, executarGuerreiro, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** Provação do Guerreiro no servidor: liberação, 1 tentativa por dia por chefe, emblemas, mecânicas e idempotência. */
describe('Provação do Guerreiro (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  const MUITO_FORTE = { vigor: 30000, sorte: 0, forca: 30000, vitalidade: 20000, arcano: 0, inteligencia: 0, agilidade: 500 };
  const FRACO = { vigor: 1, sorte: 0, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
  /** Aguenta muito e quase não bate: a luta dura até o limite de rodadas e as mecânicas aparecem várias vezes. */
  const TANQUE = { vigor: 30000, sorte: 0, forca: 1, vitalidade: 30000, arcano: 0, inteligencia: 0, agilidade: 1 };
  const HOJE = new Date('2026-10-14T15:00:00Z');
  const AMANHA = new Date('2026-10-15T15:00:00Z');

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Guerreiro_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 12, atributos: MUITO_FORTE, ...extra });
    return (await getCharacterByUid(uid))!;
  }

  const nomesDasAcoes = (r: Awaited<ReturnType<typeof executarGuerreiro>>) =>
    new Set(r.resultado.logTurnos.flatMap((t) => t.ataques.map((a) => a.habilidadeAcionada).filter((n): n is string => !!n)));

  it('bloqueia nível 11, dificuldade inválida, dificuldade fechada e chefe ainda indisponível', async () => {
    await setup('g1', { nivel: 11 });
    await expect(executarGuerreiro('g1', 1, { seed: 1, agora: HOJE })).rejects.toThrow('Nível insuficiente');
    await updateCharacter('g1', { nivel: 30 });
    await expect(executarGuerreiro('g1', 11, { seed: 1, agora: HOJE })).rejects.toThrow('inválida');
    await expect(executarGuerreiro('g1', 3, { seed: 1, agora: HOJE })).rejects.toThrow('Vença o chefe da dificuldade anterior');
    await updateCharacter('g1', { guerreiroVencidas: [1, 2, 3, 4, 5] });
    await expect(executarGuerreiro('g1', 6, { seed: 1, agora: HOJE })).rejects.toThrow('ainda não está disponível');
    const c = (await getCharacterByUid('g1'))!;
    expect(c.guerreiroTentativas).toBeUndefined();
    expect(c.emblemas).toBeUndefined();
  });

  it('vitória na dificuldade 1: 4 emblemas Comuns, abre a 2 e gasta a tentativa do dia', async () => {
    await setup('g2');
    const r = await executarGuerreiro('g2', 1, { seed: 7, combateId: 'guerreiro-0001', agora: HOJE });
    expect(r.resultado.vencedor).toBe('personagem');
    expect(r.guerreiro).toMatchObject({ dificuldade: 1, nome: 'Astaroth, o Louco', venceu: true, primeiraVitoria: true });
    expect(r.guerreiro.emblemas).toMatchObject({ comum: 4, raro: 0, muitoRaro: 0, epico: 0, lendario: 0, mitico: 0 });
    const c = (await getCharacterByUid('g2'))!;
    expect(c.emblemas).toEqual({ comum: 4 });
    expect(c.guerreiroVencidas).toEqual([1]);
    expect(c.guerreiroTentativas).toEqual({ '1': '2026-10-14' });
    // não dá XP nem ouro
    expect(c.ouro).toBe(0);
    expect(r.resultado.xpGanho).toBe(0);
  });

  it('1 tentativa por dia por chefe: o mesmo chefe só volta no dia seguinte, e o outro chefe tem a tentativa dele', async () => {
    await setup('g3');
    await executarGuerreiro('g3', 1, { seed: 1, combateId: 'guerreiro-0010', agora: HOJE });
    await expect(executarGuerreiro('g3', 1, { seed: 2, combateId: 'guerreiro-0011', agora: HOJE })).rejects.toThrow('Você já enfrentou este chefe hoje');
    const outro = await executarGuerreiro('g3', 2, { seed: 3, combateId: 'guerreiro-0012', agora: HOJE });
    expect(outro.guerreiro.dificuldade).toBe(2);
    const volta = await executarGuerreiro('g3', 1, { seed: 4, combateId: 'guerreiro-0013', agora: AMANHA });
    expect(volta.guerreiro.primeiraVitoria).toBe(false);
    const c = (await getCharacterByUid('g3'))!;
    expect(c.guerreiroVencidas).toEqual([1, 2]);
    expect(Object.values(c.emblemas ?? {}).reduce((s, v) => s + v, 0)).toBe(12); // 3 vitórias x 4 emblemas
  });

  it('derrota: gasta a tentativa, não dá emblema nem abre a próxima e não custa ouro', async () => {
    await setup('g4', { atributos: FRACO, ouro: 1000 });
    const r = await executarGuerreiro('g4', 1, { seed: 1, combateId: 'guerreiro-0020', agora: HOJE });
    expect(r.resultado.vencedor).toBe('monstro');
    expect(r.guerreiro).toMatchObject({ venceu: false, primeiraVitoria: false });
    expect(Object.values(r.guerreiro.emblemas).every((v) => v === 0)).toBe(true);
    const c = (await getCharacterByUid('g4'))!;
    expect(c.emblemas).toEqual({});
    expect(c.guerreiroVencidas ?? []).toEqual([]);
    expect(c.guerreiroTentativas).toEqual({ '1': '2026-10-14' });
    expect(c.ouro).toBe(1000);
    await expect(executarGuerreiro('g4', 2, { seed: 1, agora: HOJE })).rejects.toThrow('Vença o chefe da dificuldade anterior');
  });

  it('emblemas na dificuldade 5 vêm só de Raro e Muito raro', async () => {
    await setup('g5', { guerreiroVencidas: [1, 2, 3, 4] });
    const r = await executarGuerreiro('g5', 5, { seed: 11, combateId: 'guerreiro-0030', agora: HOJE });
    expect(r.guerreiro.venceu).toBe(true);
    expect(r.guerreiro.emblemas.comum).toBe(0);
    expect(r.guerreiro.emblemas.raro + r.guerreiro.emblemas.muitoRaro).toBe(4);
  });

  it('idempotente: reenviar o mesmo combateId devolve o resultado gravado, sem dar emblemas duas vezes', async () => {
    await setup('g6');
    const a = await executarGuerreiro('g6', 1, { seed: 4, combateId: 'guerreiro-0040', agora: HOJE });
    const b = await executarGuerreiro('g6', 1, { seed: 99, combateId: 'guerreiro-0040', agora: HOJE });
    expect(b.repetido).toBe(true);
    expect(b.guerreiro).toEqual(a.guerreiro);
    expect((await getCharacterByUid('g6'))!.emblemas).toEqual({ comum: 4 });
  });

  it('as mecânicas aparecem na luta: Astaroth sorteia, Zephyron converge, Thundrak investe e Veredar julga', async () => {
    const mecanicas: [number, string[]][] = [
      [1, ['Golpe Devastador', 'Explosão Elemental', 'Recuperação Caótica']],
      [2, ['Convergência: Fogo e Relâmpago', 'Convergência: Gelo e Sombrio', 'Convergência: Terra e Vento', 'Convergência: Sagrado e Sombrio']],
      [3, ['Investida Imparável']],
      [5, ['Sentença: Excesso de Ataque', 'Sentença: Excesso de Defesa', 'Sentença: Equilíbrio']],
    ];
    for (const [dificuldade, esperadas] of mecanicas) {
      const uid = `gm${dificuldade}`;
      await setup(uid, { atributos: TANQUE, guerreiroVencidas: [1, 2, 3, 4] });
      const r = await executarGuerreiro(uid, dificuldade, { seed: 5, combateId: `guerreiro-m${dificuldade}`, agora: HOJE });
      const vistas = [...nomesDasAcoes(r)];
      expect(vistas.some((n) => esperadas.includes(n)), `${dificuldade}: ${vistas.join(', ')}`).toBe(true);
    }
  });

  it('Gorvath: o frenesi aparece no registro da luta quando o personagem causa dano', async () => {
    await setup('gm4', { atributos: { ...MUITO_FORTE, forca: 600, vigor: 30000, vitalidade: 30000 }, guerreiroVencidas: [1, 2, 3] });
    const r = await executarGuerreiro('gm4', 4, { seed: 3, combateId: 'guerreiro-m4', agora: HOJE });
    const mensagensMecanica = r.resultado.logTurnos.flatMap((t) => t.eventosMecanica ?? []);
    expect(mensagensMecanica.some((m) => m.includes('frenesi') || m.includes('vulnerável'))).toBe(true);
  });
});
