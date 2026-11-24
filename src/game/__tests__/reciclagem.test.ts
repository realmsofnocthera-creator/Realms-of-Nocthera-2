import { describe, expect, it } from 'vitest';
import { PERCENTUAL_DA_RECICLAGEM, devolucaoDaReceita, planejarReciclagemArma, planejarReciclagemArmadura } from '@/game/reciclagem';
import { diversosDaRaridade, type ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';

const arma = (baseId: string, id = 'a1'): ArmaPersonagem => ({ id, baseId, categoria: 'katana', atributo: 'vigor', pontos: 5, reforjas: 2, criadaEm: '' });
const peca = (pecaId: string, id = 'p1'): ArmaduraPersonagem => ({ id, pecaId, atributo: 'vigor', pontos: 5, reforjas: 0, xp: 0, criadaEm: '' });

describe('Reciclar: devolução de 30% da receita', () => {
  it('30% de cada material, arredondado para baixo e no mínimo 1 de cada um que a receita pede', () => {
    expect(PERCENTUAL_DA_RECICLAGEM).toBe(30);
    const d = devolucaoDaReceita({ materiaisMonstro: [{ id: 'pelo-de-rato', qtd: 10 }, { id: 'garra-x', qtd: 2 }], materiaisMundo: [{ id: 'mundo-osso-bruto', qtd: 7 }], diversos: { raridade: 'comum', qtd: 4 }, ouro: 500 });
    expect(d['pelo-de-rato']).toBe(3);
    expect(d['garra-x']).toBe(1);
    expect(d['mundo-osso-bruto']).toBe(2);
    // os diversos voltam como o primeiro da raridade; não devolve ouro
    expect(d[diversosDaRaridade('comum')[0]]).toBe(1);
    expect(Object.keys(d).some((k) => k === 'ouro')).toBe(false);
  });

  it('toda receita do catálogo (armas e armaduras) devolve algo e nunca mais que a receita inteira', () => {
    for (const b of ARMAS_BASE) {
      const d = devolucaoDaReceita(b.receita);
      expect(Object.keys(d).length, b.id).toBeGreaterThan(0);
      const total = b.receita.materiaisMonstro.concat(b.receita.materiaisMundo).reduce((s, i) => s + i.qtd, 0) + (b.receita.diversos?.qtd ?? 0);
      expect(Object.values(d).reduce((s, q) => s + q, 0), b.id).toBeLessThanOrEqual(total);
    }
    for (const p of PECAS_ARMADURA) expect(Object.keys(devolucaoDaReceita(p.receita)).length, p.id).toBeGreaterThan(0);
  });
});

describe('Reciclar arma', () => {
  const baseId = 'ferro-de-cacada';
  it('remove a arma e soma os materiais ao inventário (sem tocar nos que o jogador já tem)', () => {
    const r = planejarReciclagemArma({ inventario: { 'pelo-de-rato': 4, outro: 9 }, armas: [arma(baseId), arma(baseId, 'a2')] }, 'a1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.armas.map((a) => a.id)).toEqual(['a2']);
    const esperado = devolucaoDaReceita(ARMAS_BASE_MAP[baseId].receita);
    for (const [id, q] of Object.entries(esperado)) expect(r.inventario[id]).toBe((id === 'pelo-de-rato' ? 4 : 0) + q);
    expect(r.inventario.outro).toBe(9);
  });
  it('arma equipada, inexistente ou id estranho não recicla', () => {
    const base = { inventario: {}, armas: [arma(baseId)] };
    const eq = planejarReciclagemArma({ ...base, equipamento: { armaId: 'a1', armadura: {} } }, 'a1');
    expect(eq.ok ? 'ok' : eq.motivo).toBe('equipada');
    for (const id of ['nada', undefined, 7, null, '__proto__']) {
      const x = planejarReciclagemArma(base, id);
      expect(x.ok ? 'ok' : x.motivo, String(id)).toBe('naoEncontrada');
    }
  });
});

describe('Reciclar armadura', () => {
  const pecaId = PECAS_ARMADURA[0].id;
  it('remove a peça e soma os materiais; peça equipada não recicla', () => {
    const r = planejarReciclagemArmadura({ inventario: {}, armaduras: [peca(pecaId), peca(pecaId, 'p2')] }, 'p1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.armaduras.map((a) => a.id)).toEqual(['p2']);
    expect(r.inventario).toEqual(r.devolucao);
    const eq = planejarReciclagemArmadura({ inventario: {}, armaduras: [peca(pecaId)], equipamento: { armaId: null, armadura: { peitoral: 'p1' } as never } }, 'p1');
    expect(eq.ok ? 'ok' : eq.motivo).toBe('equipada');
    expect((planejarReciclagemArmadura({ inventario: {}, armaduras: [] }, 'p1') as { motivo: string }).motivo).toBe('naoEncontrada');
  });
});
