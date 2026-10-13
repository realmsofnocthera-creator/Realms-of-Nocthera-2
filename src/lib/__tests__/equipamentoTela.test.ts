import { describe, it, expect } from 'vitest';
import { SLOTS_EQUIPAMENTO, armaParaTela, opcoesDoSlot, pecaParaTela, resumoDoEquipamento, slotsDaTela } from '@/lib/equipamentoTela';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import type { CharacterDocument } from '@/server/characterService';

const arma = (id: string, extra: Partial<ArmaPersonagem> = {}): ArmaPersonagem => ({ id, baseId: 'lamina-da-geada', categoria: 'espadaGrande', atributo: 'sorte', pontos: 12, reforjas: 0, criadaEm: '', ...extra });
const peca = (id: string, pecaId: string, extra: Partial<ArmaduraPersonagem> = {}): ArmaduraPersonagem => ({ id, pecaId, atributo: 'vigor', pontos: 2, reforjas: 0, xp: 0, criadaEm: '', ...extra });

type Pers = Pick<CharacterDocument, 'armas' | 'armaduras' | 'equipamento' | 'bonusEquipamento' | 'mitigacaoEquipamento'>;
const personagem = (extra: Partial<Pers> = {}): Pers => ({
  armas: [arma('w1'), arma('w2', { baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'vigor', pontos: 3 })],
  armaduras: [peca('p1', 'lobo-cinzento-elmo', { atributo: 'arcano', pontos: 3 }), peca('p2', 'rato-da-floresta-elmo'), peca('p3', 'lobo-cinzento-peitoral')],
  equipamento: { armaId: null, armadura: {} },
  ...extra,
});

describe('Aba Equipamentos da ficha (lógica)', () => {
  it('tem 6 espaços: a arma e as 5 peças', () => {
    expect(SLOTS_EQUIPAMENTO.map((s) => s.id)).toEqual(['arma', 'elmo', 'peitoral', 'luvas', 'perneiras', 'botas']);
    const slots = slotsDaTela(personagem());
    expect(slots.map((s) => [s.id, s.disponiveis, s.equipado])).toEqual([
      ['arma', 2, null], ['elmo', 2, null], ['peitoral', 1, null], ['luvas', 0, null], ['perneiras', 0, null], ['botas', 0, null],
    ]);
  });

  it('o item equipado aparece no espaço e vem primeiro na lista, depois do mais raro para o mais comum', () => {
    const c = personagem({ equipamento: { armaId: 'w2', armadura: {} } });
    const lista = opcoesDoSlot(c, 'arma');
    expect(lista.map((i) => [i.id, i.equipado])).toEqual([['w2', true], ['w1', false]]);
    expect(slotsDaTela(c)[0].equipado?.id).toBe('w2');
    const elmos = opcoesDoSlot(personagem(), 'elmo');
    expect(elmos.map((i) => i.id)).toEqual(['p2', 'p1']); // os dois são Comum: por nome (Capuz de Rato, Elmo de Lobo)
  });

  it('a arma mostra dano fixo, atributo, bônus, penalidade, elemento e status', () => {
    const a = armaParaTela(arma('w1'), false)!;
    expect(a.nome).toBe('Lâmina da Geada');
    expect(a.linhas).toContain('Bônus: +10% dano físico');
    expect(a.linhas).toContain('Penalidade: −10% agilidade');
    expect(a.linhas).toContain('Elemento: Gelo');
    expect(a.linhas).toContain('Status: Sangramento');
    expect(a.linhas.some((l) => l.startsWith('Dano fixo ') && l.endsWith('(soma em Força)'))).toBe(true);
    expect(a.resumo).toContain('Sorte +12');
    expect(armaParaTela(arma('x', { baseId: 'nao-existe' }), false)).toBeNull();
  });

  it('a peça mostra o fixo do espaço no nível dela, o sorteado e as habilidades', () => {
    const p = pecaParaTela(peca('p2', 'rato-da-floresta-elmo'), true)!;
    expect(p.slot).toBe('elmo');
    expect(p.equipado).toBe(true);
    expect(p.linhas[0]).toBe('Elmo · Nível 0/30');
    expect(p.linhas).toContain('Vida 17');
    expect(p.linhas).toContain('Vigor +2');
    expect(p.linhas).toContain('Olho Crítico Nv. 2');
    expect(pecaParaTela(peca('x', 'nao-existe'), false)).toBeNull();
  });

  it('o resumo sem nada equipado é vazio', () => {
    const r = resumoDoEquipamento(personagem());
    expect(r.vazio).toBe(true);
    expect(r.habilidades).toEqual([]);
  });

  it('o resumo soma HP, defesa, habilidades e mostra elemento e status da arma', () => {
    const c = personagem({
      equipamento: { armaId: 'w1', armadura: { elmo: 'p1', peitoral: 'p3' } },
      bonusEquipamento: { vigor: 0, sorte: 12, forca: 23, vitalidade: 0, arcano: 3, inteligencia: 0, agilidade: -3 },
      mitigacaoEquipamento: 5,
    });
    const r = resumoDoEquipamento(c);
    expect(r.vazio).toBe(false);
    expect(r.hp).toBe(17);
    expect(r.defesa).toBe(5);
    expect(r.atributos).toContainEqual({ nome: 'Força', valor: '+23' });
    expect(r.atributos).toContainEqual({ nome: 'Agilidade', valor: '−3' });
    expect(r.percentuais).toEqual([{ rotulo: 'Dano físico', valor: '+10%' }]); // a % de Agilidade já está no atributo
    expect(r.elementos).toEqual(['Gelo']);
    expect(r.status).toEqual(['Sangramento']);
    expect(r.habilidades.length).toBeGreaterThan(0);
    expect(r.habilidades.every((h) => h.nivel <= h.nivelMaximo)).toBe(true);
  });

  it('cada habilidade do resumo diz se o combate já a aplica', () => {
    const c = personagem({
      armaduras: [peca('p1', 'lobo-cinzento-elmo'), peca('p4', 'rato-da-floresta-peitoral')],
      equipamento: { armaId: null, armadura: { elmo: 'p1', peitoral: 'p4' } },
    });
    const porId = Object.fromEntries(resumoDoEquipamento(c).habilidades.map((h) => [h.id, h.aplicada]));
    expect(porId['reforco-de-ataque']).toBe(true); // dano e crítico condicionais já valem no combate
    expect(porId['extensor-de-agilidade']).toBe(true); // Agilidade em porcentagem já vale na ficha
  });
});
