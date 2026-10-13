import { describe, it, expect } from 'vitest';
import { conjuntosDaTela, detalheDaPeca, efeitoDoNivel, minhasPecasTela, orbesDaTela, xpDosOrbes } from '@/lib/armaduraTela';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { custoDaReceita } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';

/** Tela "Melhorar armadura": conjuntos, estado das peças, detalhe, minhas peças e orbes. */

const peca = (extra: Partial<ArmaduraPersonagem> = {}): ArmaduraPersonagem => ({
  id: 'a1', pecaId: 'rato-da-floresta-peitoral', atributo: 'vigor', pontos: 2, reforjas: 1, xp: 0, criadaEm: '', ...extra,
});
const vazio = { inventario: {}, ouro: 0, armaduras: [] };

describe('Conjuntos', () => {
  it('82 conjuntos em ordem de estrela, cada um com as 5 peças', () => {
    const c = conjuntosDaTela(vazio);
    expect(c).toHaveLength(82);
    expect(c.map((x) => x.estrela)).toEqual([...c.map((x) => x.estrela)].sort((a, b) => a - b));
    expect(c[0]).toMatchObject({ nome: 'Rato da Floresta', raridadeNome: 'Comum', estilo: 'Veloz' });
    expect(c[0].pecas.map((p) => p.espacoNome)).toEqual(['Elmo', 'Peitoral', 'Luvas', 'Perneiras', 'Botas']);
    expect(c.filter((x) => x.nome.endsWith('(Mítico)'))).toHaveLength(4);
  });

  it('estado da peça: tenho, disponível ou falta material', () => {
    const id = 'lobo-cinzento-elmo';
    const custo = custoDaReceita(PECAS_ARMADURA_MAP[id].receita);
    const c = { inventario: { ...custo.itens }, ouro: custo.ouro, armaduras: [peca()] };
    const lista = conjuntosDaTela(c).flatMap((x) => x.pecas);
    expect(lista.find((p) => p.pecaId === 'rato-da-floresta-peitoral')).toMatchObject({ estado: 'tenho', quantas: 1 });
    expect(lista.find((p) => p.pecaId === id)?.estado).toBe('disponivel');
    expect(lista.find((p) => p.pecaId === 'esqueleto-elmo')?.estado).toBe('faltaMaterial');
  });
});

describe('Detalhe e minhas peças', () => {
  it('mostra fixo (nível 0 e 30), sorteio, habilidades, receita e se dá para fabricar', () => {
    const d = detalheDaPeca('oryndrak-mitico-elmo', vazio);
    expect(d).toMatchObject({ raridadeNome: 'Mítico', espacoNome: 'Elmo', fixo: 'Vida', fixoNivel0: 141, fixoNivel30: 183, podeFabricar: false });
    expect(d.sorteio).toBe('Arcano, Vigor ou Vitalidade: 30 a 45 pontos');
    expect(d.habilidades[0]).toMatchObject({ nome: 'Domínio dos Céus', nivel: 3 });
    expect(d.materiais.every((m) => m.tem === 0)).toBe(true);
  });

  it('peça do personagem: nível, XP do nível e fixo atual', () => {
    const [m] = minhasPecasTela({ armaduras: [peca({ xp: 30 })] });
    expect(m).toMatchObject({ nivel: 1, xpNoNivel: 8, xpDoNivel: 43, atributo: 'Vigor', pontos: 2, reforjas: 1, fixo: 'Defesa 5' });
    const [max] = minhasPecasTela({ armaduras: [peca({ xp: 10000 })] });
    expect([max.nivel, max.xpDoNivel]).toEqual([30, 0]);
    expect(detalheDaPeca('rato-da-floresta-peitoral', { inventario: {}, ouro: 0, armaduras: [peca()] }).minhas).toHaveLength(1);
  });

  it('o efeito dos níveis curtos ganha o texto do nível 1', () => {
    expect(efeitoDoNivel({ 1: 'Chance de crítico +3%.', 2: '+6%.' }, 2)).toBe('Chance de crítico +3%. No Nv. 2: +6%.');
    expect(efeitoDoNivel({ 1: 'A.', 2: 'Dano +2%.' }, 2)).toBe('Dano +2%.');
  });
});

describe('Orbes', () => {
  it('lista os 5 com a quantidade e calcula o XP aproveitado até o nível 30', () => {
    const o = orbesDaTela({ inventario: { 'orbe-de-armadura': 4 } });
    expect(o.map((x) => [x.xp, x.tenho])).toEqual([[10, 4], [50, 0], [200, 0], [500, 0], [1000, 0]]);
    expect(xpDosOrbes({ 'orbe-de-armadura': 3 }, 0)).toEqual({ total: 30, aproveitado: 30, nivelDepois: 1 });
    expect(xpDosOrbes({ 'orbe-de-armadura-regio': 1 }, 9500)).toEqual({ total: 1000, aproveitado: 500, nivelDepois: 30 });
  });
});
