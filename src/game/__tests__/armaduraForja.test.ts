import { describe, it, expect } from 'vitest';
import {
  ArmaduraPersonagem,
  EstadoArmaduras,
  MAX_ARMADURAS_POR_PERSONAGEM,
  lerArmadurasPersonagem,
  nivelDaArmadura,
  planejarFabricacaoArmadura,
  planejarReforjaArmadura,
  planejarUsoDeOrbes,
  sortearOrbesDaCacada,
} from '@/game/armaduraForja';
import { custoDaReceita, nomeDoItem } from '@/game/forja';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { FAIXA_SORTEIO_ARMADURA } from '@/rules/armaduras';
import { DADOS_CACADA_MAP } from '@/rules/cacada';

/** Armaduras: fabricar, reforjar e usar orbes (regras puras), e o drop dos orbes. */

const amb = (valor = 0) => ({ aleatorio: () => valor, novoId: () => 'p1', agora: '2026-10-13T00:00:00.000Z' });
const PECA = 'rato-da-floresta-peitoral';
const inventarioPara = (pecaId: string, percentual = 100) => ({ ...custoDaReceita(PECAS_ARMADURA_MAP[pecaId].receita, percentual).itens });
const ouroPara = (pecaId: string, percentual = 100) => custoDaReceita(PECAS_ARMADURA_MAP[pecaId].receita, percentual).ouro;
const peca = (extra: Partial<ArmaduraPersonagem> = {}): ArmaduraPersonagem => ({
  id: 'p1', pecaId: PECA, atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '', ...extra,
});

describe('Fabricar peça', () => {
  it('paga a receita e sorteia Arcano, Vigor ou Vitalidade na faixa da raridade', () => {
    const estado: EstadoArmaduras = { inventario: inventarioPara(PECA), ouro: ouroPara(PECA), armaduras: [] };
    const r = planejarFabricacaoArmadura(estado, PECA, amb(0.999));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inventario).toEqual({});
    expect(r.ouroGasto).toBe(ouroPara(PECA));
    expect(r.armadura).toMatchObject({ pecaId: PECA, atributo: 'vitalidade', pontos: FAIXA_SORTEIO_ARMADURA.comum.max, xp: 0, reforjas: 0 });
  });

  it('bloqueia peça inválida, falta de material ou ouro e o limite de peças', () => {
    const motivo = (e: EstadoArmaduras, id: unknown) => {
      const r = planejarFabricacaoArmadura(e, id, amb());
      return r.ok ? 'ok' : r.motivo;
    };
    const rico: EstadoArmaduras = { inventario: inventarioPara(PECA), ouro: 99999, armaduras: [] };
    expect(motivo(rico, 'nao-existe')).toBe('pecaInvalida');
    expect(motivo({ ...rico, inventario: {} }, PECA)).toBe('materiaisInsuficientes');
    expect(motivo({ ...rico, ouro: 0 }, PECA)).toBe('ouroInsuficiente');
    expect(motivo({ ...rico, armaduras: Array.from({ length: MAX_ARMADURAS_POR_PERSONAGEM }, (_, i) => peca({ id: `x${i}` })) }, PECA)).toBe('limiteDeArmaduras');
  });
});

describe('Reforjar peça', () => {
  it('custa 50% da receita, sorteia os pontos de novo e mantém o tipo', () => {
    const r = planejarReforjaArmadura({ inventario: inventarioPara(PECA, 50), ouro: ouroPara(PECA, 50), armaduras: [peca()] }, 'p1', amb(0));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.percentual).toBe(50);
    expect(r.inventario).toEqual({});
    expect(r.armadura).toMatchObject({ atributo: 'vigor', pontos: FAIXA_SORTEIO_ARMADURA.comum.min, reforjas: 1 });
    const x = planejarReforjaArmadura({ inventario: {}, ouro: 0, armaduras: [] }, 'p1', amb());
    expect(x.ok ? 'ok' : x.motivo).toBe('armaduraNaoEncontrada');
  });
});

describe('Orbes de armadura', () => {
  it('somam o XP dos orbes e sobem o nível', () => {
    const r = planejarUsoDeOrbes(
      { inventario: { 'orbe-de-armadura': 5, 'orbe-de-armadura-reforcado': 1 }, ouro: 0, armaduras: [peca()] },
      'p1',
      { 'orbe-de-armadura': 3, 'orbe-de-armadura-reforcado': 1 }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.xpGanho).toBe(80);
    expect([r.nivelAntes, r.nivelDepois]).toEqual([0, 2]);
    expect(r.inventario).toEqual({ 'orbe-de-armadura': 2 });
  });

  it('o XP para no nível 30 e a peça no 30 recusa orbes', () => {
    const r = planejarUsoDeOrbes({ inventario: { 'orbe-de-armadura-regio': 20 }, ouro: 0, armaduras: [peca({ xp: 9500 })] }, 'p1', { 'orbe-de-armadura-regio': 1 });
    expect(r.ok && [r.armadura.xp, r.xpGanho, r.nivelDepois]).toEqual([10000, 500, 30]);
    const cheio = planejarUsoDeOrbes({ inventario: { 'orbe-de-armadura': 1 }, ouro: 0, armaduras: [peca({ xp: 10000 })] }, 'p1', { 'orbe-de-armadura': 1 });
    expect(cheio.ok ? 'ok' : cheio.motivo).toBe('nivelMaximo');
    expect(nivelDaArmadura({ xp: 10000 })).toBe(30);
  });

  it('recusa orbes inválidos ou insuficientes', () => {
    const e: EstadoArmaduras = { inventario: { 'orbe-de-armadura': 1 }, ouro: 0, armaduras: [peca()] };
    const motivo = (orbes: unknown) => {
      const r = planejarUsoDeOrbes(e, 'p1', orbes);
      return r.ok ? 'ok' : r.motivo;
    };
    expect(motivo({})).toBe('orbesInvalidos');
    expect(motivo({ 'pelo-de-rato': 1 })).toBe('orbesInvalidos');
    expect(motivo({ 'orbe-de-armadura': -1 })).toBe('orbesInvalidos');
    expect(motivo({ 'orbe-de-armadura': 1.5 })).toBe('orbesInvalidos');
    expect(motivo({ 'orbe-de-armadura': 2 })).toBe('orbesInsuficientes');
  });

  it('drop na Caçada: Orbe comum garantido e teto pela raridade dos materiais do monstro', () => {
    const rato = DADOS_CACADA_MAP['rato-da-floresta'];
    expect(sortearOrbesDaCacada(rato.drops, () => 99).map((o) => o.materialId)).toEqual(['orbe-de-armadura']);
    expect(sortearOrbesDaCacada(rato.drops, () => 0).map((o) => o.materialId)).toEqual(['orbe-de-armadura', 'orbe-de-armadura-reforcado', 'orbe-de-armadura-superior']);
    expect(sortearOrbesDaCacada(DADOS_CACADA_MAP['oryndrak'].drops, () => 0)).toHaveLength(5);
    expect(nomeDoItem('orbe-de-armadura-regio')).toBe('Orbe de Armadura Régio');
  });
});

describe('Leitura das peças gravadas', () => {
  it('descarta entradas inválidas e limita o XP', () => {
    const lidas = lerArmadurasPersonagem([
      { id: 'a', pecaId: PECA, atributo: 'arcano', pontos: 2, reforjas: 1, xp: 99999, criadaEm: 't' },
      { id: 'b', pecaId: 'nao-existe', atributo: 'vigor' },
      { id: 'c', pecaId: PECA, atributo: 'forca' },
      null,
    ]);
    expect(lidas).toEqual([{ id: 'a', pecaId: PECA, atributo: 'arcano', pontos: 2, reforjas: 1, xp: 10000, criadaEm: 't' }]);
    expect(lerArmadurasPersonagem(undefined)).toEqual([]);
  });
});
