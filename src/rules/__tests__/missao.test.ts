import { describe, it, expect } from 'vitest';
import { metaDoObjetivo, missaoEmBranco, textoDoObjetivo, validarMissao, type MissaoDados } from '@/rules/missao';
import { validarConteudo, referenciasDoConteudo } from '@/rules/conteudo';
import { mapaVazio } from '@/rules/mapa';
import { objetoNovo } from '@/rules/objetosDoMapa';

const completa = (): MissaoDados => ({
  formato: 1,
  titulo: 'Primeiros passos',
  descricao: 'Conheça a estação.',
  objetivos: [
    { id: 'o1', tipo: 'falar', mapa: 'vila', objeto: 'npc-1' },
    { id: 'o2', tipo: 'bau', mapa: 'vila', objeto: 'bau-1', texto: 'Abra o baú.' },
    { id: 'o3', tipo: 'cena', cenaId: 'chegada' },
    { id: 'o4', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 3 },
    { id: 'o5', tipo: 'chegar', mapa: 'floresta' },
    { id: 'o6', tipo: 'item', itemId: 'pelo-de-rato', quantidade: 2 },
  ],
  requisitos: { missoes: ['antes'], nivelMinimo: 2 },
  recompensa: { xp: 100, ouro: 50, itens: [{ id: 'pelo-de-rato', qtd: 1 }] },
});
const erros = (m: unknown) => {
  const r = validarMissao(m);
  return r.ok ? '' : r.erros.join(' | ');
};

describe('Missão (formato 1)', () => {
  it('aceita uma missão completa com os seis tipos de objetivo e volta igual; o rascunho em branco vale', () => {
    const r = validarMissao(completa());
    expect(r.ok && r.dados).toEqual(completa());
    expect(validarMissao(missaoEmBranco('Teste')).ok).toBe(true);
    expect(validarConteudo('missao', completa()).ok).toBe(true);
  });

  it('título, descrição, formato, campos extras', () => {
    expect(erros(null)).toMatch(/precisa ser um objeto/);
    expect(erros({ ...completa(), formato: 2 })).toMatch(/Formato/);
    expect(erros({ ...completa(), titulo: 'a' })).toMatch(/Título/);
    expect(erros({ ...completa(), descricao: 'x'.repeat(1001) })).toMatch(/Descrição/);
    expect(erros({ ...completa(), extra: 1 })).toMatch(/Campos desconhecidos/);
  });

  it('objetivos: de 1 a 10, tipo válido, ids únicos e os campos certos de cada tipo', () => {
    expect(erros({ ...completa(), objetivos: [] })).toMatch(/de 1 a 10 objetivos/);
    expect(erros({ ...completa(), objetivos: Array.from({ length: 11 }, (_, i) => ({ id: `o${i}`, tipo: 'chegar', mapa: 'vila' })) })).toMatch(/de 1 a 10/);
    const com = (o: unknown) => erros({ ...completa(), objetivos: [o] });
    expect(com({ id: 'a', tipo: 'voar' })).toMatch(/tipo inválido/);
    expect(com({ id: 'A B', tipo: 'chegar', mapa: 'vila' })).toMatch(/identificador inválido/);
    expect(erros({ ...completa(), objetivos: [{ id: 'a', tipo: 'chegar', mapa: 'vila' }, { id: 'a', tipo: 'chegar', mapa: 'vila' }] })).toMatch(/repetido/);
    expect(com({ id: 'a', tipo: 'falar', mapa: 'vila' })).toMatch(/escolha o NPC/);
    expect(com({ id: 'a', tipo: 'bau', mapa: 'vila' })).toMatch(/escolha o baú/);
    expect(com({ id: 'a', tipo: 'falar', objeto: 'npc-1' })).toMatch(/escolha o mapa/);
    expect(com({ id: 'a', tipo: 'cena' })).toMatch(/escolha a cena/);
    expect(com({ id: 'a', tipo: 'derrotar', monstroId: 'rato' })).toMatch(/quantos monstros/);
    expect(com({ id: 'a', tipo: 'derrotar', monstroId: 'Rato Ruim', quantidade: 1 })).toMatch(/escolha o monstro/);
    expect(com({ id: 'a', tipo: 'item', itemId: 'nao-existe', quantidade: 1 })).toMatch(/item desconhecido/);
    expect(com({ id: 'a', tipo: 'item', itemId: 'pelo-de-rato', quantidade: 0 })).toMatch(/quantidade/);
    expect(com({ id: 'a', tipo: 'chegar', mapa: 'vila', monstroId: 'rato' })).toMatch(/campos que este tipo não tem/);
    expect(com({ id: 'a', tipo: 'chegar', mapa: 'vila', texto: 'x'.repeat(161) })).toMatch(/texto vai até/);
  });

  it('requisitos e recompensa', () => {
    expect(erros({ ...completa(), requisitos: { missoes: ['a', 'a'], nivelMinimo: 0 } })).toMatch(/sem repetir/);
    expect(erros({ ...completa(), requisitos: { missoes: ['a', 'b', 'c', 'd', 'e', 'f'], nivelMinimo: 0 } })).toMatch(/até 5 missões/);
    expect(erros({ ...completa(), requisitos: { missoes: [], nivelMinimo: 31 } })).toMatch(/nível mínimo/);
    expect(erros({ ...completa(), requisitos: undefined })).toMatch(/Faltam os requisitos/);
    expect(erros({ ...completa(), recompensa: { xp: -1, ouro: 0, itens: [] } })).toMatch(/XP/);
    expect(erros({ ...completa(), recompensa: { xp: 0, ouro: 1_000_001, itens: [] } })).toMatch(/ouro/);
    expect(erros({ ...completa(), recompensa: { xp: 0, ouro: 0, itens: [{ id: 'nao-existe', qtd: 1 }] } })).toMatch(/item desconhecido/);
    expect(erros({ ...completa(), recompensa: { xp: 0, ouro: 0, itens: [{ id: 'pelo-de-rato', qtd: 1 }, { id: 'pelo-de-rato', qtd: 2 }] } })).toMatch(/repetido/);
    expect(erros({ ...completa(), recompensa: undefined })).toMatch(/Falta a recompensa/);
  });

  it('texto e meta dos objetivos', () => {
    expect(textoDoObjetivo({ id: 'a', tipo: 'derrotar', monstroId: 'x', quantidade: 3 })).toBe('Derrotar 3 monstro(s)');
    expect(textoDoObjetivo({ id: 'a', tipo: 'chegar', mapa: 'vila', texto: 'Vá à vila' })).toBe('Vá à vila');
    expect(textoDoObjetivo({ id: 'a', tipo: 'item', itemId: 'pelo-de-rato', quantidade: 2 })).toBe('Ter 2 × pelo-de-rato na mochila');
    expect(metaDoObjetivo({ id: 'a', tipo: 'derrotar', monstroId: 'x', quantidade: 3 })).toBe(3);
    expect(metaDoObjetivo({ id: 'a', tipo: 'falar', mapa: 'v', objeto: 'n' })).toBe(1);
  });

  it('referências: a missão aponta para cenas, mapas, monstros e requisitos; o mapa aponta para missões e cenas da condição', () => {
    const refs = referenciasDoConteudo('missao', completa());
    expect(refs).toEqual(expect.arrayContaining([
      { tipo: 'cena', id: 'chegada', soExistir: true },
      { tipo: 'mapa', id: 'vila', soExistir: true },
      { tipo: 'mapa', id: 'floresta', soExistir: true },
      { tipo: 'monstro', id: 'rato-da-floresta', podeSerDoCodigo: true },
      { tipo: 'missao', id: 'antes', soExistir: true },
    ]));
    expect(refs.filter((r) => r.tipo === 'mapa' && r.id === 'vila')).toHaveLength(1); // sem repetir

    const m = { ...mapaVazio(10, 10), tilesets: ['floresta'] };
    m.objetos = [
      { ...objetoNovo('npc', 'npc-1', 1, 1), missaoId: 'primeira', cenaId: 'dialogo' },
      { ...objetoNovo('porta', 'porta-1', 2, 2), destino: { mapa: 'vila', x: 1, y: 1 }, condicao: { missaoConcluida: 'primeira', cenaVista: 'chegada' } },
      { ...objetoNovo('cena', 'cena-1', 4, 4), cenaId: 'chegada', missaoId: 'segunda', condicao: { missaoAtiva: 'primeira' } },
    ];
    const rm = referenciasDoConteudo('mapa', m);
    expect(rm).toEqual(expect.arrayContaining([
      { tipo: 'missao', id: 'primeira', soExistir: true },
      { tipo: 'missao', id: 'segunda', soExistir: true },
      { tipo: 'cena', id: 'dialogo' },
      { tipo: 'cena', id: 'chegada' }, // a cena do ativador precisa estar publicada e vence a "basta existir" da condição
    ]));
    expect(rm.filter((r) => r.tipo === 'cena' && r.id === 'chegada')).toEqual([{ tipo: 'cena', id: 'chegada' }]);
    expect(referenciasDoConteudo('cena', {})).toEqual([]);
  });
});
