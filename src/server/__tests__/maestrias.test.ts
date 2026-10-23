import { describe, it, expect, beforeEach } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import {
  combatenteDoPersonagem,
  createCharacter,
  executarCombate,
  fabricarArma,
  getCharacterByUid,
  updateCharacter,
  type CharacterDocument,
} from '@/server/characterService';
import { agirNaExpedicao } from '@/server/expedicao';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { HORA_MS } from '@/rules/expedicao';
import { xpAteONivel } from '@/rules/maestrias';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { MONSTERS_MAP, MonsterDefinition } from '@/rules/monsters';
import { resetCharacterStore, setTestPersistenceFailHook } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const MATERIAIS_FERRO = { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 };
const T0 = new Date('2026-10-22T12:00:00.000Z');
const noNivel = (id: string, nivel: number) => ({ [id]: { xp: xpAteONivel(nivel) } });

async function setup(uid: string, extra: Partial<CharacterDocument> = {}) {
  await createCharacter(uid, { nome: 'Mestre_' + uid, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  await updateCharacter(uid, { ouro: 10000, inventario: { ...MATERIAIS_FERRO }, ...extra });
}

describe('Maestrias: servidor', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    setTestPersistenceFailHook(null);
    limparCacheDeSistemas();
  });

  it('Forja: fabricar dá 15 XP por estrela; o desconto tira ouro (por nível) e devolve materiais (por marco)', async () => {
    await setup('m1');
    await fabricarArma('m1', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
    const c = (await getCharacterByUid('m1'))!;
    expect(c.maestrias?.forja?.xp).toBe(15);
    expect(c.ouro).toBe(10000 - 100);

    await setup('m2', { maestrias: noNivel('forja', 100) });
    await updateCharacter('m2', { inventario: { 'pelo-de-rato': 60, 'mundo-osso-bruto': 20, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 } });
    await fabricarArma('m2', { baseId: 'ferro-de-cacada', categoria: 'lanca' }, { aleatorio: () => 0.5 });
    const d = (await getCharacterByUid('m2'))!;
    // nível 100: -20% do ouro (100 → 80) e -10% dos materiais (6 → devolve 0; arredonda para baixo)
    expect(d.ouro).toBe(10000 - 80);
    expect(d.inventario).toEqual({ 'pelo-de-rato': 54, 'mundo-osso-bruto': 18 });
  });

  it('vitória com a arma equipada dá XP na trilha da categoria; os bônus entram no combatente', async () => {
    await setup('m3', { atributos: { vigor: 200, sorte: 0, forca: 300, vitalidade: 50, arcano: 0, inteligencia: 0, agilidade: 50 } });
    const { arma } = await fabricarArma('m3', { baseId: 'ferro-de-cacada', categoria: 'katana' }, { aleatorio: () => 0.5 });
    await updateCharacter('m3', { equipamento: { armaId: arma.id, armadura: {} } });
    const semMaestria = combatenteDoPersonagem((await getCharacterByUid('m3'))!);

    const r = await executarCombate('m3', 'rato-da-peste', { seed: 7 });
    expect(r.resultado.vencedor).toBe('personagem');
    expect((await getCharacterByUid('m3'))!.maestrias?.['arma:katana']?.xp).toBe(10);

    await updateCharacter('m3', { maestrias: { ...noNivel('arma:katana', 20), ...noNivel('chefes', 10) } });
    const comMaestria = combatenteDoPersonagem((await getCharacterByUid('m3'))!);
    expect(comMaestria.equipamento!.bonusDanoFisicoPercentual - semMaestria.equipamento!.bonusDanoFisicoPercentual).toBeCloseTo(4);
    expect(comMaestria.equipamento!.bonusChanceCriticoPontos - semMaestria.equipamento!.bonusChanceCriticoPontos).toBe(2);
    expect(comMaestria.equipamento!.contraChefes).toEqual({ danoPercentual: 2, reducaoPercentual: 1 });
  });

  it('Expedição: tempo menor, comuns extras, vagas a mais e 5 XP por hora coletada', async () => {
    await setup('m4', { nivel: 15, inventario: {}, maestrias: noNivel('expedicao', 50) });
    const r = await agirNaExpedicao('m4', 'enviar', { horas: 2 }, T0);
    expect(r.estado.vagas).toBe(4);
    // nível 50: -10% de 2 h = 108 min
    expect(Date.parse(r.estado.expedicoes[0].fim) - T0.getTime()).toBe(108 * 60_000);
    for (let i = 0; i < 3; i++) await agirNaExpedicao('m4', 'enviar', { horas: 2 }, T0);
    await expect(agirNaExpedicao('m4', 'enviar', { horas: 2 }, T0)).rejects.toThrow(/4 vagas/);
    await agirNaExpedicao('m4', 'coletar', { vaga: 0 }, new Date(T0.getTime() + 2 * HORA_MS), 5);
    const c = (await getCharacterByUid('m4'))!;
    const comuns = Object.entries(c.inventario ?? {}).filter(([id]) => MATERIAIS_MUNDO_MAP[id]?.raridade === 'comum').reduce((s, [, q]) => s + q, 0);
    expect(comuns).toBe(2 + 5);
    expect(c.maestrias?.expedicao?.xp).toBe(xpAteONivel(50) + 10);
  });
});

// ---- motor de combate: a maestria de Chefes só vale contra chefe ----
const ALVO: MonsterDefinition = {
  ...MONSTERS_MAP['rato-da-peste'],
  id: 'alvo-de-teste',
  nome: 'Alvo de Teste',
  hp: 5000,
  efeitosAplicados: undefined,
  modificadoresElementais: undefined,
  atributos: { vigor: 1, sorte: 0, forca: 400, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
};
const SEM_BONUS: EquipamentoCombate = { bonusDanoFisicoPercentual: 0, bonusDanoMagicoPercentual: 0, bonusChanceCriticoPontos: 0, bonusChanceEfeitosPontos: 0, statusArma: [], elementosArma: [] };
const heroi = (equipamento: EquipamentoCombate): Combatente => ({
  nome: 'Herói',
  racaId: 'humano',
  classeId: 'barbaro',
  nivel: 10,
  hp: 5000,
  hpMax: 5000,
  sobreescudo: 0,
  mitigacao: 40,
  atributos: { vigor: 20, sorte: 0, forca: 60, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
  equipamento,
});
const golpe = (p: Combatente, alvo: MonsterDefinition, quem: 'heroi' | 'monstro') =>
  resolverCombate(p, alvo, 11, { rngStatus: () => 99.9 }).logTurnos[0].ataques.find((a) => (quem === 'heroi' ? a.atacante === 'Herói' : a.atacante !== 'Herói'))!.danoEfetivo;

describe('Maestria de Chefes no combate', () => {
  const chefe: MonsterDefinition = { ...ALVO, chefe: true };
  const comMaestria = { ...SEM_BONUS, contraChefes: { danoPercentual: 20, reducaoPercentual: 10 } };

  it('mais dano e menos dano recebido contra chefe', () => {
    expect(golpe(heroi(comMaestria), chefe, 'heroi')).toBeGreaterThan(golpe(heroi(SEM_BONUS), chefe, 'heroi'));
    expect(golpe(heroi(comMaestria), chefe, 'monstro')).toBeLessThan(golpe(heroi(SEM_BONUS), chefe, 'monstro'));
  });

  it('não vale contra monstro comum', () => {
    expect(golpe(heroi(comMaestria), ALVO, 'heroi')).toBe(golpe(heroi(SEM_BONUS), ALVO, 'heroi'));
    expect(golpe(heroi(comMaestria), ALVO, 'monstro')).toBe(golpe(heroi(SEM_BONUS), ALVO, 'monstro'));
  });
});
