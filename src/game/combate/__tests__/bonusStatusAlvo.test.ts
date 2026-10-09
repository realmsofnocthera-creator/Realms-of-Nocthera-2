import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import {
  BONUS_DANO_POR_CONDICAO_PERCENTUAL,
  MARCAS_MAXIMAS,
  adicionarMarcas,
  bonusDanoPorMarcas,
  bonusDanoPorStatus,
  condicoesDoAlvo,
  registrarEstadoDeLuta,
} from '@/game/combate/bonusStatusAlvo';
import { aplicarEfeitoControle } from '@/game/combate/efeitosControle';
import type { CondicaoAlvo } from '@/game/combate/bonusStatusAlvo';
import {
  DefinicaoHabilidade,
  ResultadoHabilidade,
  limparRegistroParaTestes,
  registrarHabilidade,
  resolverDanoHabilidade,
} from '@/game/combate/habilidades';

/** 1.9.1 — Bônus por status no alvo e Marca (catálogo 1.2), com a lista do Yuri. */

describe('1.9.1 — lista de bônus por status no alvo', () => {
  it('valores exatos da lista', () => {
    expect(BONUS_DANO_POR_CONDICAO_PERCENTUAL).toEqual({
      sangramento: 5,
      veneno: 3,
      podridaoEscarlate: 4,
      congelado: 10,
      dormindo: 15,
      louco: 8,
      maldicao: 12,
      paralisado: 20,
    });
  });

  it('só soma as condições que a habilidade usa E que estão ativas', () => {
    expect(bonusDanoPorStatus(['sangramento', 'dormindo'], ['sangramento', 'dormindo'])).toBe(20);
    expect(bonusDanoPorStatus(['sangramento', 'dormindo'], ['sangramento'])).toBe(5);
    expect(bonusDanoPorStatus(['veneno'], ['sangramento'])).toBe(0);
    expect(bonusDanoPorStatus(['veneno'], undefined)).toBe(0);
    expect(bonusDanoPorStatus(['veneno'], ['veneno', 'veneno'])).toBe(3); // sem contar duas vezes
  });

  it('condicoesDoAlvo: lê DOTs, estados de luta e controles', () => {
    const alvo: Combatente = {
      nome: 'Alvo', hp: 100, hpMax: 100, sobreescudo: 0, atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      statusAtivos: ['veneno', 'podridaoEscarlate', 'queimadura'],
    };
    registrarEstadoDeLuta(alvo, 'sangramento');
    registrarEstadoDeLuta(alvo, 'maldicao');
    registrarEstadoDeLuta(alvo, 'veneno'); // não é estado de luta: ignorado
    aplicarEfeitoControle(alvo, 'sono');
    aplicarEfeitoControle(alvo, 'paralisia');
    aplicarEfeitoControle(alvo, 'congelamento');
    aplicarEfeitoControle(alvo, 'loucura');
    expect(condicoesDoAlvo(alvo).sort()).toEqual(
      ['congelado', 'dormindo', 'louco', 'maldicao', 'paralisado', 'podridaoEscarlate', 'sangramento', 'veneno'].sort()
    );
  });

  it('Marca: +3% por marca, no máximo +15%', () => {
    expect(bonusDanoPorMarcas(0)).toBe(0);
    expect(bonusDanoPorMarcas(1)).toBe(3);
    expect(bonusDanoPorMarcas(4)).toBe(12);
    expect(bonusDanoPorMarcas(5)).toBe(15);
    expect(bonusDanoPorMarcas(9)).toBe(15);
    expect(MARCAS_MAXIMAS).toBe(5);
    const alvo: { marcas?: number } = {};
    adicionarMarcas(alvo, 3);
    adicionarMarcas(alvo, 4);
    expect(alvo.marcas).toBe(5);
  });
});

describe('1.9.1 — dano com os bônus (regra 1.2.2: soma no mesmo grupo)', () => {
  const r = (extra: Partial<ResultadoHabilidade>): ResultadoHabilidade => ({
    nome: 'Teste', tipoDano: 'fisico', percentualDano: 100, ignorarDefesaPercentual: 0, bonusDanoPercentual: 0,
    bonusContraSobreescudoPercentual: 0, curaPercentualDanoCausado: 0, curaPercentualHpMax: 0, ...extra,
  });
  const ctx = (alvo: { condicoes?: CondicaoAlvo[]; marcas?: number }) => ({
    atacante: { hp: 100, hpMax: 100, nivel: 1 },
    alvo: { hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacaoFisica: 0, mitigacaoMagica: 0, ...alvo },
    danoBase: 100,
  });

  it('com Sangramento +5% e Dormindo +15% o dano de 100 vira 120 (somados, não multiplicados)', () => {
    const c = ctx({ condicoes: ['sangramento', 'dormindo'] });
    expect(resolverDanoHabilidade(r({}), c).danoBruto).toBe(100);
    expect(resolverDanoHabilidade(r({ bonusPorStatusAlvo: ['sangramento', 'dormindo'] }), c).danoBruto).toBe(120);
  });

  it('soma também com o bônus da própria habilidade e com as marcas', () => {
    const c = ctx({ condicoes: ['paralisado'], marcas: 3 });
    const res = r({ bonusDanoPercentual: 10, bonusPorStatusAlvo: ['paralisado'], bonusPorMarca: true });
    expect(resolverDanoHabilidade(res, c).danoBruto).toBe(139); // 100 × (1 + 0,10 + 0,20 + 0,09)
  });
});

describe('1.9.1 — em combate', () => {
  const base: ResultadoHabilidade = {
    nome: '', tipoDano: 'fisico', percentualDano: 100, ignorarDefesaPercentual: 0, bonusDanoPercentual: 0,
    bonusContraSobreescudoPercentual: 0, curaPercentualDanoCausado: 0, curaPercentualHpMax: 0,
  };
  const habilidade = (id: string, extra: Partial<ResultadoHabilidade>): DefinicaoHabilidade => ({
    id, espaco: 'basico', tipoDano: 'fisico', executar: () => ({ ...base, nome: id, ...extra }),
  });
  beforeEach(() => {
    limparRegistroParaTestes();
    registrarHabilidade(habilidade('teste_marca', { marcar: true, bonusPorMarca: true }));
    registrarHabilidade(habilidade('teste_marca_dupla', { marcar: true, numeroGolpes: 2 }));
    registrarHabilidade(habilidade('teste_sono', { bonusPorStatusAlvo: ['dormindo'] }));
  });
  afterEach(() => limparRegistroParaTestes());

  const heroi = (id: string): Combatente => ({
    nome: 'Heroi', classeId: 'barbaro', nivel: 1, hp: 5000, hpMax: 5000, sobreescudo: 0,
    habilidadesEquipadas: { ataqueBasico: id, habilidadeEspecial: 'barbaro_furia_selvagem', ultimate: 'barbaro_ira_do_barbaro' },
    atributos: { vigor: 40, sorte: 0, forca: 20, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 5 },
  });
  const alvo = (): Combatente => ({
    nome: 'Alvo', hp: 5000, hpMax: 5000, sobreescudo: 0, mitigacao: 0,
    atributos: { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 5 },
  });

  it('cada golpe marcador coloca 1 marca e o dano cresce +3% por marca (até +15%)', () => {
    const h = heroi('teste_marca');
    const a = alvo();
    const danos: number[] = [];
    for (let t = 1; t <= 7; t++) danos.push(turnoDeCombate(h, a, t).turnoLog.ataques[0].danoBruto);
    expect(a.marcas).toBe(5);
    expect(danos[0]).toBe(20); // sem marcas
    expect(danos[1]).toBe(Math.ceil(20 * 1.03));
    expect(danos[5]).toBe(Math.ceil(20 * 1.15));
    expect(danos[6]).toBe(Math.ceil(20 * 1.15)); // teto
  });

  it('uma habilidade de 2 golpes coloca 2 marcas por ação', () => {
    const a = alvo();
    turnoDeCombate(heroi('teste_marca_dupla'), a, 1);
    expect(a.marcas).toBe(2);
  });

  it('o bônus de Dormindo só vale com o alvo dormindo', () => {
    const h = heroi('teste_sono');
    const normal = turnoDeCombate(h, alvo(), 1).turnoLog.ataques[0].danoBruto;
    const dormindo = alvo();
    aplicarEfeitoControle(dormindo, 'sono');
    const comSono = turnoDeCombate(heroi('teste_sono'), dormindo, 1).turnoLog.ataques[0].danoBruto;
    expect(normal).toBe(20);
    expect(comSono).toBe(Math.ceil(20 * 1.15));
  });
});
