import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCharacter,
  desequiparArmaDoPersonagem,
  desequiparEspacoDoPersonagem,
  equiparArmaDoPersonagem,
  equiparArmaduraDoPersonagem,
  executarCacada,
  getCharacterByUid,
  updateCharacter,
} from '@/server/characterService';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import { danoFixoDaArma } from '@/rules/armas';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { fixoDaPeca } from '@/rules/armaduras';
import { calcularHpMax } from '@/game';

/** Equipar e desequipar na ficha: o equipamento entra nos atributos, no HP, na defesa e no combate. */
describe('Equipamento (servidor)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
  });

  const ARMA: ArmaPersonagem = { id: 'w1', baseId: 'lamina-da-geada', categoria: 'espadaGrande', atributo: 'sorte', pontos: 12, reforjas: 0, criadaEm: '' };
  const OUTRA: ArmaPersonagem = { id: 'w2', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'vigor', pontos: 3, reforjas: 0, criadaEm: '' };
  const ELMO: ArmaduraPersonagem = { id: 'p1', pecaId: 'lobo-cinzento-elmo', atributo: 'arcano', pontos: 3, reforjas: 0, xp: 0, criadaEm: '' };
  const PEITORAL: ArmaduraPersonagem = { id: 'p2', pecaId: 'lobo-cinzento-peitoral', atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '' };

  const FORTE = { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };

  async function setup(uid: string, extra: Record<string, unknown> = {}) {
    await createCharacter(uid, {
      nome: 'Equipado_' + uid,
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter(uid, { nivel: 2, atributos: FORTE, armas: [ARMA, OUTRA], armaduras: [ELMO, PEITORAL], ...extra });
    return (await getCharacterByUid(uid))!;
  }

  it('começa sem nada equipado e sem bônus', async () => {
    const c = await setup('e1');
    expect(c.equipamento).toEqual({ armaId: null, armadura: {} });
    expect(c.bonusEquipamento && Object.values(c.bonusEquipamento).every((v) => v === 0)).toBe(true);
    expect(c.mitigacaoEquipamento).toBe(0);
  });

  it('equipar a arma soma dano fixo na Força e o sorteado no atributo; a Agilidade cai 10% (Espada grande)', async () => {
    const antes = await setup('e2');
    const r = await equiparArmaDoPersonagem('e2', 'w1');
    const base = ARMAS_BASE_MAP['lamina-da-geada'];
    const dano = danoFixoDaArma(base.estrela, base.posicao, false);
    expect(r.character.equipamento?.armaId).toBe('w1');
    expect(r.character.bonusEquipamento).toMatchObject({ forca: dano, sorte: 12 });
    expect(r.character.bonusEquipamento!.agilidade).toBeLessThan(0);
    // Os atributos gravados não mudam: o equipamento é aplicado na hora
    expect(r.character.atributos).toEqual(antes.atributos);
    expect((await getCharacterByUid('e2'))!.equipamento?.armaId).toBe('w1');
  });

  it('as peças somam HP (Vida) e mitigação (Defesa) e o sorteado em cada atributo', async () => {
    const antes = await setup('e3');
    await equiparArmaduraDoPersonagem('e3', 'p1');
    const r = await equiparArmaduraDoPersonagem('e3', 'p2');
    expect(r.character.equipamento?.armadura).toEqual({ elmo: 'p1', peitoral: 'p2' });
    // HP: o Vigor com o sorteado do equipamento (400 + 2) mais a Vida do elmo
    expect(r.character.hpMax).toBe(calcularHpMax(FORTE.vigor + 2, { classeId: 'cavaleiro', nivel: 2, ascensaoHabilidade: 0 }) + fixoDaPeca(1, 'elmo'));
    expect(r.character.hpMax).toBeGreaterThan(antes.hpMax);
    expect(r.character.mitigacaoEquipamento).toBe(fixoDaPeca(1, 'peitoral'));
    expect(r.character.bonusEquipamento).toMatchObject({ arcano: 3, vigor: 2 });
  });

  it('trocar a arma devolve a anterior; desequipar volta ao estado sem bônus', async () => {
    await setup('e4');
    await equiparArmaDoPersonagem('e4', 'w1');
    const troca = await equiparArmaDoPersonagem('e4', 'w2');
    expect(troca.character.equipamento?.armaId).toBe('w2');
    const livre = await desequiparArmaDoPersonagem('e4');
    expect(livre.character.equipamento?.armaId).toBeNull();
    expect(Object.values(livre.character.bonusEquipamento!).every((v) => v === 0)).toBe(true);
    await equiparArmaduraDoPersonagem('e4', 'p1');
    const sem = await desequiparEspacoDoPersonagem('e4', 'elmo');
    expect(sem.character.equipamento?.armadura).toEqual({});
  });

  it('recusa item que o personagem não tem e espaço inválido, sem gravar nada', async () => {
    await setup('e5');
    await expect(equiparArmaDoPersonagem('e5', 'nao-existe')).rejects.toThrow('Item não encontrado');
    await expect(equiparArmaduraDoPersonagem('e5', 'w1')).rejects.toThrow('Item não encontrado');
    await expect(desequiparEspacoDoPersonagem('e5', 'cabeca')).rejects.toThrow('Espaço de armadura inválido');
    expect((await getCharacterByUid('e5'))!.equipamento).toEqual({ armaId: null, armadura: {} });
  });

  it('a arma equipada entra no combate da Caçada: mais dano no mesmo combate (mesma semente)', async () => {
    await setup('e6');
    const semArma = await executarCacada('e6', 'lobo-cinzento', { seed: 7, combateId: 'equipamento-0001' });
    await equiparArmaDoPersonagem('e6', 'w1');
    const comArma = await executarCacada('e6', 'lobo-cinzento', { seed: 7, combateId: 'equipamento-0002' });
    const golpe = (r: typeof semArma) => r.resultado.logTurnos[0].ataques.find((a) => a.atacante.startsWith('Equipado'))!;
    expect(golpe(comArma).danoBruto).toBeGreaterThan(golpe(semArma).danoBruto);
  });
});
