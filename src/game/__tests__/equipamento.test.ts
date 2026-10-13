import { describe, it, expect } from 'vitest';
import {
  EQUIPAMENTO_VAZIO,
  aplicarEquipamentoAosAtributos,
  calcularFichaEquipamento,
  desequiparArma,
  desequiparEspaco,
  equiparArma,
  equiparPeca,
  lerEquipamentoPersonagem,
  mitigacaoDoEquipamento,
} from '@/game/equipamento';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import { danoFixoDaArma } from '@/rules/armas';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { fixoDaPeca, xpAcumuladoAteNivel } from '@/rules/armaduras';
import type { Attributes } from '@/rules/attributes';

/** Equipamento: equipar, ficha de combate (atributos, HP, defesa, bônus da categoria) e habilidades somadas. */

const arma = (extra: Partial<ArmaPersonagem> = {}): ArmaPersonagem => ({
  id: 'w1',
  baseId: 'lamina-da-geada', // 1★, posição 3, Gelo + Sangramento
  categoria: 'espadaGrande',
  atributo: 'sorte',
  pontos: 12,
  reforjas: 0,
  criadaEm: '2026-10-13T00:00:00.000Z',
  ...extra,
});

const peca = (id: string, pecaId: string, extra: Partial<ArmaduraPersonagem> = {}): ArmaduraPersonagem => ({
  id, pecaId, atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '2026-10-13T00:00:00.000Z', ...extra,
});

const BASE: Attributes = { vigor: 10, sorte: 5, forca: 20, vitalidade: 8, arcano: 0, inteligencia: 3, agilidade: 40 };

describe('Equipar e desequipar', () => {
  const armas = [arma(), arma({ id: 'w2' })];
  const armaduras = [peca('p1', 'lobo-cinzento-elmo'), peca('p2', 'lobo-cinzento-peitoral')];

  it('equipa uma arma só: trocar devolve a anterior para a lista', () => {
    const a = equiparArma(EQUIPAMENTO_VAZIO, armas, 'w1');
    expect(a.ok && a.equipamento.armaId).toBe('w1');
    const b = equiparArma(a.ok ? a.equipamento : EQUIPAMENTO_VAZIO, armas, 'w2');
    expect(b.ok && b.equipamento.armaId).toBe('w2');
    expect(desequiparArma({ armaId: 'w2', armadura: {} }).armaId).toBeNull();
  });

  it('a peça vai para o espaço dela, e desequipar limpa só aquele espaço', () => {
    const r = equiparPeca(EQUIPAMENTO_VAZIO, armaduras, 'p1');
    const r2 = equiparPeca(r.ok ? r.equipamento : EQUIPAMENTO_VAZIO, armaduras, 'p2');
    expect(r2.ok && r2.equipamento.armadura).toEqual({ elmo: 'p1', peitoral: 'p2' });
    const livre = desequiparEspaco(r2.ok ? r2.equipamento : EQUIPAMENTO_VAZIO, 'elmo');
    expect(livre.ok && livre.equipamento.armadura).toEqual({ peitoral: 'p2' });
  });

  it('recusa item que não existe ou espaço inválido', () => {
    expect(equiparArma(EQUIPAMENTO_VAZIO, armas, 'nao-existe')).toEqual({ ok: false, motivo: 'itemNaoEncontrado' });
    expect(equiparArma(EQUIPAMENTO_VAZIO, armas, 42)).toEqual({ ok: false, motivo: 'itemNaoEncontrado' });
    expect(equiparPeca(EQUIPAMENTO_VAZIO, armaduras, 'w1')).toEqual({ ok: false, motivo: 'itemNaoEncontrado' });
    expect(desequiparEspaco(EQUIPAMENTO_VAZIO, 'cabeca')).toEqual({ ok: false, motivo: 'espacoInvalido' });
  });

  it('lê o gravado descartando o que sumiu ou está no espaço errado', () => {
    const lido = lerEquipamentoPersonagem(
      { armaId: 'w9', armadura: { elmo: 'p2', peitoral: 'p2', botas: 'zzz' } },
      armas,
      armaduras
    );
    expect(lido).toEqual({ armaId: null, armadura: { peitoral: 'p2' } });
    expect(lerEquipamentoPersonagem(undefined, armas, armaduras)).toEqual({ armaId: null, armadura: {} });
  });
});

describe('Ficha de combate do equipamento', () => {
  it('sem nada equipado a ficha é vazia', () => {
    const f = calcularFichaEquipamento(EQUIPAMENTO_VAZIO, [arma()], []);
    expect(f.arma).toBeNull();
    expect(f.hpExtra + f.mitigacaoExtra).toBe(0);
    expect(Object.values(f.atributos).every((v) => v === 0)).toBe(true);
    expect(aplicarEquipamentoAosAtributos(BASE, f)).toEqual(BASE);
  });

  it('arma física: dano fixo vira Força, o sorteado soma, e a categoria dá bônus e penalidade', () => {
    const f = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma()], []);
    const base = ARMAS_BASE_MAP['lamina-da-geada'];
    const dano = danoFixoDaArma(base.estrela, base.posicao, false);
    expect(f.atributos.forca).toBe(dano);
    expect(f.atributos.sorte).toBe(12);
    expect(f.percentuais).toMatchObject({ danoFisico: 10, agilidade: -10 }); // Espada grande
    expect(f.arma).toMatchObject({ tipoDano: 'fisico', subtipoFisico: 'corte', elementos: ['gelo'], status: ['sangramento'] });
    // Agilidade: 40 − 10% = 36
    const total = aplicarEquipamentoAosAtributos(BASE, f);
    expect(total.forca).toBe(BASE.forca + dano);
    expect(total.sorte).toBe(17);
    expect(total.agilidade).toBe(36);
  });

  it('arma mágica: o dano fixo vira Inteligência', () => {
    const f = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma({ categoria: 'cajado' })], []);
    expect(f.atributos.inteligencia).toBeGreaterThan(0);
    expect(f.atributos.forca).toBe(0);
    expect(f.percentuais).toMatchObject({ danoMagico: 10, defesa: -10 });
    expect(f.arma?.subtipoFisico).toBeUndefined();
  });

  it('Customização: dano +2% por ponto, atributo +1 por ponto e status +0,5 ponto na chance', () => {
    const sem = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma()], []);
    const com = calcularFichaEquipamento(
      { armaId: 'w1', armadura: {} },
      [arma({ customizacao: { dano: 10, atributo: 4, status: 6 } })],
      []
    );
    expect(com.arma!.danoFixo).toBe(Math.round(sem.arma!.danoFixo * 1.2));
    expect(com.atributos.sorte).toBe(12 + 4);
    expect(com.percentuais.chanceEfeitos).toBe(3);
  });

  it('Katana soma pontos de crítico; Grimório soma chance de efeitos', () => {
    const k = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma({ categoria: 'katana' })], []);
    expect(k.percentuais).toMatchObject({ chanceCritico: 5, defesa: -5 });
    const g = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma({ categoria: 'grimorio' })], []);
    expect(g.percentuais.chanceEfeitos).toBe(10);
  });

  it('peças: Vida vira HP, Defesa vira mitigação, Agilidade vira pontos, e o sorteado soma', () => {
    const armaduras = [
      peca('e', 'lobo-cinzento-elmo', { atributo: 'arcano', pontos: 3 }),
      peca('p', 'lobo-cinzento-peitoral'),
      peca('b', 'lobo-cinzento-botas', { atributo: 'vitalidade', pontos: 1 }),
    ];
    const f = calcularFichaEquipamento({ armaId: null, armadura: { elmo: 'e', peitoral: 'p', botas: 'b' } }, [], armaduras);
    expect(f.hpExtra).toBe(fixoDaPeca(1, 'elmo'));
    expect(f.mitigacaoExtra).toBe(fixoDaPeca(1, 'peitoral'));
    expect(f.atributos.agilidade).toBe(fixoDaPeca(1, 'botas'));
    expect([f.atributos.arcano, f.atributos.vigor, f.atributos.vitalidade]).toEqual([3, 2, 1]);
  });

  it('o nível da peça sobe o atributo fixo (+1% por nível)', () => {
    const sem = calcularFichaEquipamento({ armaId: null, armadura: { elmo: 'e' } }, [], [peca('e', 'oryndrak-elmo')]);
    const nv30 = calcularFichaEquipamento({ armaId: null, armadura: { elmo: 'e' } }, [], [peca('e', 'oryndrak-elmo', { xp: xpAcumuladoAteNivel(30) })]);
    expect(nv30.hpExtra).toBe(fixoDaPeca(9, 'elmo', 30));
    expect(nv30.hpExtra).toBeGreaterThan(sem.hpExtra);
  });

  it('% de Defesa da categoria vale sobre a mitigação das peças', () => {
    const f = calcularFichaEquipamento(
      { armaId: 'w1', armadura: { peitoral: 'p' } },
      [arma({ categoria: 'lanca' })],
      [peca('p', 'oryndrak-peitoral')]
    );
    expect(f.percentuais.defesa).toBe(10);
    expect(mitigacaoDoEquipamento(f)).toBe(Math.floor((f.mitigacaoExtra * 110) / 100));
  });

  it('habilidades somam entre as peças e param no nível máximo', () => {
    const armaduras = [peca('a', 'rato-da-floresta-elmo'), peca('b', 'rato-da-floresta-peitoral')];
    const f = calcularFichaEquipamento({ armaId: null, armadura: { elmo: 'a', peitoral: 'b' } }, [], armaduras);
    expect(f.habilidades['olho-critico']).toBe(2); // elmo: Olho Crítico 2
    expect(f.habilidades['tempo-de-esquiva']).toBe(2); // peitoral: Tempo de Esquiva 2
  });
});

describe('Habilidades de armadura na ficha (parte 1)', () => {
  it('Reforço de Vida soma % de HP; Reforço de Defesa soma mitigação e resistência; Resistência elemental vira resistência', () => {
    const f = calcularFichaEquipamento(
      { armaId: null, armadura: { peitoral: 'a', elmo: 'b', perneiras: 'c' } },
      [],
      [peca('a', 'esqueleto-peitoral'), peca('b', 'esqueleto-elmo'), peca('c', 'esqueleto-perneiras')]
    );
    expect(f.hpPercentual).toBeGreaterThan(0);
    expect(f.mitigacaoExtra).toBeGreaterThan(fixoDaPeca(1, 'peitoral'));
    expect(f.resistenciaElemental.sombrio).toBeGreaterThan(0);
  });

  it('Artesanato soma % no dano fixo da arma', () => {
    const sem = calcularFichaEquipamento({ armaId: 'w1', armadura: {} }, [arma()], []);
    const com = calcularFichaEquipamento({ armaId: 'w1', armadura: { botas: 'b' } }, [arma()], [peca('b', 'lobo-cinzento-botas')]);
    expect(com.habilidades['artesanato']).toBeGreaterThan(0);
    expect(com.arma!.danoFixo).toBeGreaterThanOrEqual(sem.arma!.danoFixo);
  });

  it('a % de Agilidade das habilidades soma com a da categoria da arma', () => {
    const f = calcularFichaEquipamento({ armaId: 'w1', armadura: { perneiras: 'p' } }, [arma()], [peca('p', 'rato-da-floresta-perneiras')]);
    expect(f.habilidades['extensor-de-esquiva']).toBeGreaterThan(0);
    expect(f.percentuais.agilidade).toBeGreaterThan(-10); // −10% da Espada grande + o Extensor de Esquiva
  });
});
