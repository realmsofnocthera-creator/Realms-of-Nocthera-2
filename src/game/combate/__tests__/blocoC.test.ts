import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate, turnoDeCombate } from '@/game/combat';
import { tentarAplicarEfeito, formatarEventoEfeito } from '@/game/statusEffects';
import { aplicarEfeitoControle, estaImuneAoStatus, imunidadesDeChefe } from '@/game/combate/efeitosControle';
import {
  acordarDaParalisia,
  agilidadeComExaustao,
  consumirIncapacitacao,
  incapacitacaoAtiva,
  avancarDebuffs,
} from '@/game/combate/efeitosDebuffs';
import { EFEITOS_STATUS, STATUS_QUE_CHEFES_RESISTEM } from '@/rules/statusEffects';
import { MonsterDefinition } from '@/rules/monsters';

/** Bloco C (1.6.2/1.6.3) — Congelamento, Sono, Loucura, Maldição e Paralisia, com os números do Yuri. */

const atributos = { vigor: 100, sorte: 0, forca: 20, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 10 };
const combatente = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Alvo', hp: 1000, hpMax: 1000, sobreescudo: 0, atributos: { ...atributos }, mitigacao: 0, ...extra,
});

describe('Bloco C — dados (decisão do Yuri, 09/10/2026)', () => {
  it('chances de ativação', () => {
    const chance = (id: keyof typeof EFEITOS_STATUS) => EFEITOS_STATUS[id].chanceAtivacao;
    expect(chance('sangramento')).toBe(3);
    expect(chance('veneno')).toBe(8);
    expect(chance('podridaoEscarlate')).toBe(5);
    expect(chance('congelamento')).toBe(5);
    expect(chance('sono')).toBe(3);
    expect(chance('loucura')).toBe(5);
    expect(chance('maldicao')).toBe(1);
    expect(chance('paralisia')).toBe(3);
  });

  it('efeitos de cada status', () => {
    expect(EFEITOS_STATUS.congelamento).toMatchObject({ percentualHpMax: 15, lentidao: { percentual: 30, rodadas: 3 }, encerradoPorElemento: 'fogo' });
    expect(EFEITOS_STATUS.sono).toMatchObject({ incapacitaAcoes: 2, percentualHpMax: 0 });
    expect(EFEITOS_STATUS.loucura).toMatchObject({ percentualHpMax: 10, incapacitaAcoes: 1 });
    expect(EFEITOS_STATUS.maldicao).toMatchObject({ tipo: 'instantaneo', percentualHpMax: 60 });
    expect(EFEITOS_STATUS.paralisia).toMatchObject({ incapacitaAteSerAtingido: true, lentidaoAoAcordar: { percentual: 20, rodadas: 2 } });
  });

  it('a chance respeita a fronteira do sorteio', () => {
    for (const id of ['congelamento', 'sono', 'loucura', 'paralisia', 'maldicao'] as const) {
      const c = EFEITOS_STATUS[id].chanceAtivacao;
      expect(tentarAplicarEfeito(new Map(), id, c - 0.01).resultado).not.toBe('nao_ativou');
      expect(tentarAplicarEfeito(new Map(), id, c).resultado).toBe('nao_ativou');
    }
    expect(tentarAplicarEfeito(new Map(), 'sono', 0).resultado).toBe('controle');
    expect(tentarAplicarEfeito(new Map(), 'maldicao', 0).resultado).toBe('instantaneo');
  });
});

describe('Bloco C — controle no alvo', () => {
  it('Sono: perde 2 ações e depois volta a agir', () => {
    const alvo = combatente();
    aplicarEfeitoControle(alvo, 'sono');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBe('sono');
    alvo.debuffs = consumirIncapacitacao(alvo.debuffs, 'sono');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBe('sono');
    alvo.debuffs = consumirIncapacitacao(alvo.debuffs, 'sono');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBeUndefined();
  });

  it('Loucura: perde 1 ação', () => {
    const alvo = combatente();
    aplicarEfeitoControle(alvo, 'loucura');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBe('loucura');
    alvo.debuffs = consumirIncapacitacao(alvo.debuffs, 'loucura');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBeUndefined();
  });

  it('Sono e Loucura não expiram sozinhos pelo tempo (só por ações perdidas)', () => {
    const alvo = combatente();
    aplicarEfeitoControle(alvo, 'sono');
    expect(avancarDebuffs(alvo.debuffs).debuffs.length).toBe(1);
  });

  it('Congelamento: lentidão de 30% de Agilidade por 3 rodadas', () => {
    const alvo = combatente();
    aplicarEfeitoControle(alvo, 'congelamento');
    expect(agilidadeComExaustao(10, alvo.debuffs)).toBe(7);
    let debuffs = alvo.debuffs;
    for (let i = 0; i < 3; i++) debuffs = avancarDebuffs(debuffs).debuffs;
    expect(agilidadeComExaustao(10, debuffs)).toBe(10);
  });

  it('Paralisia: não age até ser atingido; ao acordar perde 20% de Agilidade por 2 rodadas', () => {
    const alvo = combatente();
    aplicarEfeitoControle(alvo, 'paralisia');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBe('paralisia');
    // perder ação não gasta a paralisia
    alvo.debuffs = consumirIncapacitacao(alvo.debuffs, 'paralisia');
    expect(incapacitacaoAtiva(alvo.debuffs)).toBe('paralisia');
    const r = acordarDaParalisia(alvo.debuffs, EFEITOS_STATUS.paralisia.lentidaoAoAcordar!);
    expect(r.acordou).toBe(true);
    expect(incapacitacaoAtiva(r.debuffs)).toBeUndefined();
    expect(agilidadeComExaustao(10, r.debuffs)).toBe(8);
    let debuffs = r.debuffs;
    for (let i = 0; i < 2; i++) debuffs = avancarDebuffs(debuffs).debuffs;
    expect(agilidadeComExaustao(10, debuffs)).toBe(10);
  });
});

describe('Bloco C — no turno de combate', () => {
  it('quem está dormindo perde a ação e a mensagem diz isso', () => {
    const dorminhoco = combatente({ nome: 'Dorminhoco' });
    aplicarEfeitoControle(dorminhoco, 'sono');
    const r = turnoDeCombate(dorminhoco, combatente({ nome: 'Outro' }), 1);
    expect(r.turnoLog.ataques[0].incapacitado).toBe('sono');
    expect(r.turnoLog.ataques[0].mensagem).toContain('dormindo');
    expect(r.turnoLog.ataques[0].danoEfetivo).toBe(0);
  });

  it('o golpe que atinge um paralisado o acorda e deixa mais lento', () => {
    const paralisado = combatente({ nome: 'Paralisado' });
    aplicarEfeitoControle(paralisado, 'paralisia');
    const atk = turnoDeCombate(combatente({ nome: 'Agressor' }), paralisado, 1).turnoLog.ataques[0];
    expect(atk.statusEncerrado).toBe('paralisia');
    expect(incapacitacaoAtiva(paralisado.debuffs)).toBeUndefined();
    expect(agilidadeComExaustao(10, paralisado.debuffs)).toBe(8);
  });

  it('golpe de fogo encerra a lentidão do Congelamento; outro elemento não', () => {
    const congelado = combatente({ nome: 'Congelado' });
    aplicarEfeitoControle(congelado, 'congelamento');
    // sem elemento: a lentidão continua
    turnoDeCombate(combatente({ nome: 'Agressor' }), congelado, 1);
    expect(agilidadeComExaustao(10, congelado.debuffs)).toBe(7);
    // fogo derrete o gelo
    const atk = turnoDeCombate(combatente({ nome: 'Fogo', elementoAtaque: 'fogo' }), congelado, 2).turnoLog.ataques[0];
    expect(atk.statusEncerrado).toBe('congelamento');
    expect(agilidadeComExaustao(10, congelado.debuffs)).toBe(10);
  });
});

describe('1.6.3 — chefes', () => {
  it('chefes resistem a Sono, Paralisia e Congelamento (mas não a dano contínuo, Loucura ou Maldição)', () => {
    expect([...STATUS_QUE_CHEFES_RESISTEM].sort()).toEqual(['congelamento', 'paralisia', 'sono']);
    const chefe = combatente({ imunidadesStatus: [...imunidadesDeChefe()] });
    expect(estaImuneAoStatus(chefe, 'sono')).toBe(true);
    expect(estaImuneAoStatus(chefe, 'paralisia')).toBe(true);
    expect(estaImuneAoStatus(chefe, 'congelamento')).toBe(true);
    expect(estaImuneAoStatus(chefe, 'veneno')).toBe(false);
    expect(estaImuneAoStatus(chefe, 'loucura')).toBe(false);
    expect(estaImuneAoStatus(chefe, 'maldicao')).toBe(false);
    expect(estaImuneAoStatus(combatente(), 'sono')).toBe(false);
  });
});

describe('Bloco C — monstro aplica o status no personagem (resolverCombate)', () => {
  const monstroQueAplica = (id: 'sono' | 'loucura' | 'maldicao' | 'congelamento' | 'paralisia'): MonsterDefinition => ({
    id: `teste-${id}`, nome: 'Testador', nivel: 1, hp: 500, categoriaCorporal: 'feral',
    atributos: { vigor: 1, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    xpConcedido: 1, ouroConcedido: { min: 1, max: 1 }, efeitosAplicados: [id],
  });
  const heroi = (): Combatente => combatente({ nome: 'Heroi', hp: 1000, hpMax: 1000, atributos: { ...atributos, forca: 5, agilidade: 1 } });

  it('Maldição causa 60% do HP máximo do alvo de uma vez e Congelamento 15%', () => {
    const rM = resolverCombate(heroi(), monstroQueAplica('maldicao'), 1, { rngStatus: () => 0 });
    const evM = rM.logTurnos.flatMap((t) => t.eventosEfeitos ?? []).find((e) => e.efeito === 'maldicao');
    expect(evM?.tipo).toBe('instantaneo');
    expect(evM?.dano).toBe(600);
    const rC = resolverCombate(heroi(), monstroQueAplica('congelamento'), 1, { rngStatus: () => 0 });
    const evC = rC.logTurnos.flatMap((t) => t.eventosEfeitos ?? []).find((e) => e.efeito === 'congelamento');
    expect(evC?.tipo).toBe('controle');
    expect(evC?.dano).toBe(150);
  });

  it('Sono aplicado no personagem faz ele perder ações', () => {
    const r = resolverCombate(heroi(), monstroQueAplica('sono'), 1, { rngStatus: () => 0 });
    const perdidas = r.logTurnos.flatMap((t) => t.ataques).filter((a) => a.incapacitado === 'sono');
    expect(perdidas.length).toBeGreaterThanOrEqual(2);
  });

  it('Loucura causa 10% do HP máximo e faz perder 1 ação', () => {
    const r = resolverCombate(heroi(), monstroQueAplica('loucura'), 1, { rngStatus: () => 0 });
    const ev = r.logTurnos.flatMap((t) => t.eventosEfeitos ?? []).find((e) => e.efeito === 'loucura');
    expect(ev?.dano).toBe(100);
    expect(r.logTurnos.flatMap((t) => t.ataques).some((a) => a.incapacitado === 'loucura')).toBe(true);
  });

  it('o texto do evento fala do status', () => {
    expect(formatarEventoEfeito({ tipo: 'controle', efeito: 'sono' }, 'Orc')).toBe('O Orc aplicou Sono em você');
    expect(formatarEventoEfeito({ tipo: 'controle', efeito: 'congelamento', dano: 150 }, 'Orc')).toContain('150 de dano');
    expect(formatarEventoEfeito({ tipo: 'imune', efeito: 'sono', alvo: 'Chefe' })).toBe('Chefe é imune a Sono');
  });
});
