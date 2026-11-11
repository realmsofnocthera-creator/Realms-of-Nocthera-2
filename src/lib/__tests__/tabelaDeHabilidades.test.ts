import { describe, expect, it } from 'vitest';
import { tabelaDeHabilidades } from '@/lib/equipamentoTela';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';

const peca = (id: string, pecaId: string): ArmaduraPersonagem => ({ id, pecaId, atributo: 'vigor', pontos: 10, reforjas: 0, xp: 0, criadaEm: '' });

describe('Tabela habilidade × peça', () => {
  it('sem nada equipado, não há linhas', () => {
    expect(tabelaDeHabilidades({ armas: [], armaduras: [peca('p1', 'vargheist-elmo')], equipamento: { armaId: null, armadura: {} } })).toEqual([]);
    expect(tabelaDeHabilidades({ armas: [], armaduras: [], equipamento: undefined })).toEqual([]);
  });

  it('cada habilidade mostra de qual peça equipada vem cada nível, e o total respeita o nível máximo', () => {
    const armaduras = [peca('p1', 'vargheist-elmo'), peca('p2', 'vargheist-peitoral'), peca('p3', 'rato-da-floresta-luvas')];
    const tabela = tabelaDeHabilidades({ armas: [], armaduras, equipamento: { armaId: null, armadura: { elmo: 'p1', peitoral: 'p2', luvas: 'p3' } } });
    expect(tabela.length).toBeGreaterThan(0);
    for (const [slot, id, pecaId] of [['elmo', 'p1', 'vargheist-elmo'], ['peitoral', 'p2', 'vargheist-peitoral'], ['luvas', 'p3', 'rato-da-floresta-luvas']] as const) {
      void id;
      for (const h of PECAS_ARMADURA_MAP[pecaId].habilidades) {
        const linha = tabela.find((l) => l.id === h.id)!;
        expect(linha.porPeca[slot]).toBeGreaterThanOrEqual(h.nivel);
      }
    }
    for (const l of tabela) {
      expect(l.nivelMaximo).toBe(HABILIDADES_ARMADURA_MAP[l.id].nivelMaximo);
      expect(l.total).toBeLessThanOrEqual(l.nivelMaximo);
      expect(Object.keys(l.porPeca).length).toBeGreaterThan(0);
    }
  });

  it('só conta as peças equipadas (a peça guardada não aparece) e ordena do maior total para o menor', () => {
    const armaduras = [peca('p1', 'vargheist-elmo'), peca('p2', 'vargheist-peitoral')];
    const soElmo = tabelaDeHabilidades({ armas: [], armaduras, equipamento: { armaId: null, armadura: { elmo: 'p1' } } });
    expect(soElmo.every((l) => Object.keys(l.porPeca).join() === 'elmo')).toBe(true);
    const ambos = tabelaDeHabilidades({ armas: [], armaduras, equipamento: { armaId: null, armadura: { elmo: 'p1', peitoral: 'p2' } } });
    const totais = ambos.map((l) => l.total);
    expect(totais).toEqual([...totais].sort((a, b) => b - a));
  });
});
