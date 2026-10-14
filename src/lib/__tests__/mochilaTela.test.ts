import { describe, it, expect } from 'vitest';
import { detalheDoItem, itensDaMochila, resumoDosEmblemas, saldosDaMochila } from '@/lib/mochilaTela';
import { MATERIAIS } from '@/rules/materiais';
import { MATERIAIS_MUNDO } from '@/rules/materiaisArmas';
import { ORBES_ARMADURA } from '@/rules/armaduras';
import { BILHETE_DE_MELHORIA } from '@/game/forja';

const monstroComum = MATERIAIS.find((m) => m.raridade === 'comum')!;
const monstroRaro = MATERIAIS.find((m) => m.raridade === 'raro')!;
const osso = MATERIAIS_MUNDO.find((m) => m.tipo === 'osso' && m.raridade === 'comum')!;
const diverso = MATERIAIS_MUNDO.find((m) => m.tipo === 'diverso' && m.raridade === 'muitoRaro')!;
const diversoRaro = MATERIAIS_MUNDO.find((m) => m.tipo === 'diverso' && m.raridade === 'raro')!;

describe('Itens da Mochila por aba', () => {
  it('separa materiais de monstro, de mundo, orbes e o Bilhete de melhoria', () => {
    const abas = itensDaMochila({
      [monstroComum.id]: 3,
      [osso.id]: 2,
      [ORBES_ARMADURA[0].id]: 5,
      [BILHETE_DE_MELHORIA.id]: 1,
    });
    expect(abas.monstros.map((i) => i.id)).toEqual([monstroComum.id]);
    expect(abas.mundo.map((i) => i.id)).toEqual([osso.id]);
    expect(abas.orbes.map((i) => i.id)).toEqual([ORBES_ARMADURA[0].id]);
    expect(abas.especiais.map((i) => [i.id, i.quantidade])).toEqual([[BILHETE_DE_MELHORIA.id, 1]]);
  });

  it('ordena do mais raro ao comum e ignora quantidade zero e ids desconhecidos', () => {
    const abas = itensDaMochila({ [monstroComum.id]: 3, [monstroRaro.id]: 1, inexistente: 5, [MATERIAIS[5].id]: 0 });
    expect(abas.monstros.map((i) => i.id)).toEqual([monstroRaro.id, monstroComum.id]);
    expect(abas.monstros[1]).toMatchObject({ quantidade: 3, categoria: 'monstros' });
    const orbes = itensDaMochila(Object.fromEntries(ORBES_ARMADURA.map((o) => [o.id, 1]))).orbes;
    expect(orbes.map((o) => o.raridade)).toEqual(['lendario', 'epico', 'muitoRaro', 'raro', 'comum']);
  });

  it('inventário vazio ou ausente dá quatro abas vazias', () => {
    for (const inv of [undefined, {}]) {
      expect(itensDaMochila(inv)).toEqual({ monstros: [], mundo: [], orbes: [], especiais: [] });
    }
  });

  it('o subtítulo mostra a raridade e a origem de cada tipo', () => {
    const abas = itensDaMochila({ [monstroComum.id]: 1, [osso.id]: 1, [ORBES_ARMADURA[1].id]: 1 });
    expect(abas.monstros[0].subtitulo).toContain('Comum');
    expect(abas.monstros[0].subtitulo).toContain('★');
    expect(abas.mundo[0].subtitulo).toBe('Comum · Osso');
    expect(abas.orbes[0].subtitulo).toBe('Raro · 50 XP');
  });
});

describe('Saldos e emblemas da Mochila', () => {
  it('mostra as cinco moedas formatadas em português, com zero quando não há', () => {
    const s = saldosDaMochila({ ouro: 12500, diamantes: 3, fragmentosAlma: undefined, essenciaHabilidade: 1000000, fragmentosAscensao: 0 });
    expect(s.map((x) => x.id)).toEqual(['ouro', 'diamantes', 'fragmentosAlma', 'essenciaHabilidade', 'fragmentosAscensao']);
    expect(s.map((x) => x.valor)).toEqual(['12.500', '3', '0', '1.000.000', '0']);
  });

  it('resume os emblemas guardados e equipados', () => {
    expect(resumoDosEmblemas({})).toMatchObject({ total: 0, equipados: 0 });
    expect(resumoDosEmblemas({}).texto).toContain('Provação do Guerreiro');
    const itens = [1, 2, 3].map((n) => ({ id: `e${n}`, tipo: 'dargan', estrelas: 1 }));
    expect(resumoDosEmblemas({ emblemasItens: itens, emblemasEquipados: ['e1'] }).texto).toBe('3 emblemas · 1 equipado');
    expect(resumoDosEmblemas({ emblemasItens: [itens[0]], emblemasEquipados: [] }).texto).toBe('1 emblema · 0 equipados');
  });
});

describe('Detalhe do item', () => {
  const valor = (d: ReturnType<typeof detalheDoItem>, rotulo: string) => d!.linhas.find((l) => l.rotulo === rotulo)?.valor;

  it('material de monstro: raridade, quem dropa, chance e uso nas receitas', () => {
    const d = detalheDoItem(monstroComum.id)!;
    expect(d.nome).toBe(monstroComum.nome);
    expect(valor(d, 'Raridade')).toBe('Comum');
    expect(valor(d, 'Chance')).toBe('Garantido');
    expect(valor(d, 'Cai de')).not.toBe('Sem origem registrada');
    expect(valor(d, 'Usado em')).toMatch(/receitas? de (arma|armadura)/);
    expect(valor(detalheDoItem(monstroRaro.id), 'Chance')).toContain('% por vitória');
  });

  it('osso, minério e planta do mundo ainda não têm fonte; o diverso cai de monstros', () => {
    expect(valor(detalheDoItem(osso.id), 'Onde conseguir')).toContain('Modo História');
    const d = detalheDoItem(diverso.id)!;
    expect(valor(d, 'Onde conseguir')).toContain('1% por vitória');
    expect(valor(d, 'Tipo')).toBe('Diverso');
    expect(valor(d, 'Usado em')).toMatch(/receitas? de (arma|armadura)/);
    // nenhuma receita pede diverso raro ainda: o detalhe diz a verdade
    expect(valor(detalheDoItem(diversoRaro.id), 'Usado em')).toBe('Nenhuma receita ainda');
  });

  it('orbe mostra o XP e a chance; o Bilhete mostra para que serve e a chance de cair', () => {
    const orbe = detalheDoItem(ORBES_ARMADURA[2].id)!;
    expect(valor(orbe, 'Efeito')).toContain('200 XP');
    expect(valor(detalheDoItem(ORBES_ARMADURA[0].id), 'Chance')).toContain('Garantido');
    const bilhete = detalheDoItem(BILHETE_DE_MELHORIA.id)!;
    expect(valor(bilhete, 'Efeito')).toContain('Mítica');
    expect(valor(bilhete, 'Chance')).toContain('9★');
  });

  it('id desconhecido não tem detalhe', () => {
    expect(detalheDoItem('nao-existe')).toBeNull();
  });
});
