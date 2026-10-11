import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCharacter,
  getCharacterByUid,
  updateCharacter,
  escolherSubclasse,
  resetarSubclasse,
  equiparHabilidade,
  executarCombate,
} from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

/** 2.1.5 (servidor) — Equipar a habilidade da classe ou a da subclasse em cada espaço. */

describe('Equipar habilidade da classe ou da subclasse (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    vi.restoreAllMocks();
  });

  async function setup(uid: string, tier: number) {
    await createCharacter(uid, {
      nome: 'Mago_' + uid,
      racaId: 'humano',
      classeId: 'feiticeiro',
      pontos: { vigor: 0, sorte: 0, forca: 0, vitalidade: 0, arcano: 5, inteligencia: 5, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 30, ouro: 200_000, fragmentosAlma: 300, diamantes: 300 });
    await escolherSubclasse(uid, 'arquimago');
    await updateCharacter(uid, { subclasseTiers: { arquimago: tier } });
    return (await getCharacterByUid(uid))!;
  }

  it('(a) tier 2: equipa o ataque básico da subclasse e volta para o da classe', async () => {
    await setup('eq_a', 2);
    const c1 = await equiparHabilidade('eq_a', 'ataqueBasico', 'arquimago_bola_de_fogo');
    expect(c1.habilidadesEquipadas?.ataqueBasico).toBe('arquimago_bola_de_fogo');
    // fica gravada
    expect((await getCharacterByUid('eq_a'))?.habilidadesEquipadas?.ataqueBasico).toBe('arquimago_bola_de_fogo');

    const c2 = await equiparHabilidade('eq_a', 'ataqueBasico', 'feiticeiro_faisca_arcana');
    expect(c2.habilidadesEquipadas?.ataqueBasico).toBe('feiticeiro_faisca_arcana');
  });

  it('(b) o espaço só libera com o tier: especial no 3, ultimate no 4', async () => {
    await setup('eq_b', 2);
    await expect(equiparHabilidade('eq_b', 'habilidadeEspecial', 'arquimago_tempestade_de_raios')).rejects.toThrow('Habilidade ainda não liberada');
    await updateCharacter('eq_b', { subclasseTiers: { arquimago: 3 } });
    const c = await equiparHabilidade('eq_b', 'habilidadeEspecial', 'arquimago_tempestade_de_raios');
    expect(c.habilidadesEquipadas?.habilidadeEspecial).toBe('arquimago_tempestade_de_raios');
    await expect(equiparHabilidade('eq_b', 'ultimate', 'arquimago_meteoro')).rejects.toThrow('Habilidade ainda não liberada');
    await updateCharacter('eq_b', { subclasseTiers: { arquimago: 4 } });
    expect((await equiparHabilidade('eq_b', 'ultimate', 'arquimago_meteoro')).habilidadesEquipadas?.ultimate).toBe('arquimago_meteoro');
  });

  it('(c) habilidade de outra subclasse, no espaço errado, de outra classe ou inexistente: erro e nada muda', async () => {
    const antes = await setup('eq_c', 4);
    // subclasse da classe, mas não é a ativa
    await expect(equiparHabilidade('eq_c', 'ataqueBasico', 'sabio_arcano_lanca_de_gelo')).rejects.toThrow('Habilidade ainda não liberada');
    // espaço errado
    await expect(equiparHabilidade('eq_c', 'ataqueBasico', 'arquimago_meteoro')).rejects.toThrow('Habilidade inválida');
    // outra classe e inexistente
    await expect(equiparHabilidade('eq_c', 'ataqueBasico', 'berserker_golpe_desenfreado')).rejects.toThrow('Habilidade inválida');
    await expect(equiparHabilidade('eq_c', 'ataqueBasico', 'nao_existe')).rejects.toThrow('Habilidade inválida');
    await expect(equiparHabilidade('eq_c', 'ataqueBasico', 42)).rejects.toThrow('Habilidade inválida');
    // espaço inválido
    await expect(equiparHabilidade('eq_c', 'passiva', 'arquimago_bola_de_fogo')).rejects.toThrow('Espaço de habilidade inválido');
    await expect(equiparHabilidade('eq_c', undefined, 'arquimago_bola_de_fogo')).rejects.toThrow('Espaço de habilidade inválido');

    expect((await getCharacterByUid('eq_c'))?.habilidadesEquipadas).toEqual(antes.habilidadesEquipadas);
  });

  it('(d) resetar a subclasse devolve as habilidades dela para as da classe', async () => {
    await setup('eq_d', 4);
    await equiparHabilidade('eq_d', 'ataqueBasico', 'arquimago_bola_de_fogo');
    await equiparHabilidade('eq_d', 'ultimate', 'arquimago_meteoro');

    const c = await resetarSubclasse('eq_d');
    expect(c.habilidadesEquipadas).toEqual({
      ataqueBasico: 'feiticeiro_faisca_arcana',
      habilidadeEspecial: 'feiticeiro_explosao_arcana',
      ultimate: 'feiticeiro_cataclismo_arcano',
    });
    // sem subclasse, a habilidade de kit não pode mais ser equipada
    await expect(equiparHabilidade('eq_d', 'ataqueBasico', 'arquimago_bola_de_fogo')).rejects.toThrow('Habilidade ainda não liberada');
  });

  it('(e) em combate a habilidade equipada da subclasse é a usada', async () => {
    await setup('eq_e', 2);
    await equiparHabilidade('eq_e', 'ataqueBasico', 'arquimago_bola_de_fogo');
    const r = await executarCombate('eq_e', 'rato-da-peste', { seed: 7 });
    const usadas = r.resultado.logTurnos.flatMap((t) => t.ataques).filter((a) => a.atacante !== 'Rato da Peste').map((a) => a.habilidadeAcionada);
    expect(usadas).toContain('Bola de Fogo');
  });

  it('(f) 0.5-C2: se o commit falhar, nada muda', async () => {
    const antes = await setup('eq_f', 2);
    setTestPersistenceFailHook((operacao) => {
      if (operacao === 'equiparHabilidade') throw new Error('Falha simulada ao equipar');
    });
    await expect(equiparHabilidade('eq_f', 'ataqueBasico', 'arquimago_bola_de_fogo')).rejects.toThrow('Falha simulada ao equipar');
    setTestPersistenceFailHook(null);
    expect((await getCharacterByUid('eq_f'))?.habilidadesEquipadas).toEqual(antes.habilidadesEquipadas);
  });
});
