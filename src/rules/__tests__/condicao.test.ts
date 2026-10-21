import { describe, it, expect } from 'vitest';
import { condicaoNaoAtendida, MENSAGEM_PADRAO_DE_BLOQUEIO, validarCondicao, type SituacaoDoJogador } from '@/rules/condicao';

const erros = (bruto: unknown) => {
  const e: string[] = [];
  const c = validarCondicao(bruto, 'Porta', e);
  return { e, c };
};
const jogador = (parte: Partial<SituacaoDoJogador> = {}): SituacaoDoJogador => ({ nivel: 5, inventario: { 'pelo-de-rato': 2 }, missoesAtivas: [], missoesConcluidas: [], cenasVistas: [], ...parte });

describe('Condição de acesso dos objetos do mapa', () => {
  it('sem condição ou vazia: vale sempre e não gera campo', () => {
    expect(erros(undefined)).toEqual({ e: [], c: undefined });
    expect(erros({})).toEqual({ e: [], c: undefined });
    expect(erros({ missaoAtiva: '', nivelMinimo: 0 })).toEqual({ e: [], c: undefined });
  });

  it('aceita as exigências válidas e devolve a cópia limpa', () => {
    const { e, c } = erros({ missaoAtiva: 'primeira', missaoConcluida: 'segunda', cenaVista: 'chegada', item: { id: 'pelo-de-rato', qtd: 2 }, nivelMinimo: 3, mensagem: '  A porta está trancada.  ' });
    expect(e).toEqual([]);
    expect(c).toEqual({ missaoAtiva: 'primeira', missaoConcluida: 'segunda', cenaVista: 'chegada', item: { id: 'pelo-de-rato', qtd: 2 }, nivelMinimo: 3, mensagem: 'A porta está trancada.' });
  });

  it('recusa campo desconhecido, id ruim, item desconhecido, quantidade e nível fora do limite, mensagem grande', () => {
    expect(erros([]).e[0]).toMatch(/precisa ser um objeto/);
    expect(erros({ extra: 1 }).e[0]).toMatch(/campos desconhecidos/);
    expect(erros({ missaoAtiva: 'Missão Ruim' }).e[0]).toMatch(/escolha a missão/);
    expect(erros({ cenaVista: 7 }).e[0]).toMatch(/escolha a cena/);
    expect(erros({ item: { id: 'nao-existe', qtd: 1 } }).e[0]).toMatch(/item da condição desconhecido/);
    expect(erros({ item: { id: 'pelo-de-rato', qtd: 0 } }).e[0]).toMatch(/quantidade/);
    expect(erros({ nivelMinimo: 31 }).e[0]).toMatch(/nível mínimo/);
    expect(erros({ nivelMinimo: 2.5 }).e[0]).toMatch(/nível mínimo/);
    expect(erros({ mensagem: 'x'.repeat(201) }).e[0]).toMatch(/mensagem/);
  });

  it('o jogador só passa se atende a TODAS as exigências; a mensagem é a escrita ou a padrão', () => {
    expect(condicaoNaoAtendida(undefined, jogador())).toBeNull();
    const c = { missaoConcluida: 'primeira', item: { id: 'pelo-de-rato', qtd: 2 }, nivelMinimo: 5, cenaVista: 'chegada', mensagem: 'Trancada.' };
    const completo = jogador({ missoesConcluidas: ['primeira'], cenasVistas: ['chegada'] });
    expect(condicaoNaoAtendida(c, completo)).toBeNull();
    expect(condicaoNaoAtendida(c, { ...completo, missoesConcluidas: [] })).toBe('Trancada.');
    expect(condicaoNaoAtendida(c, { ...completo, inventario: { 'pelo-de-rato': 1 } })).toBe('Trancada.');
    expect(condicaoNaoAtendida(c, { ...completo, nivel: 4 })).toBe('Trancada.');
    expect(condicaoNaoAtendida(c, { ...completo, cenasVistas: [] })).toBe('Trancada.');
    expect(condicaoNaoAtendida({ missaoAtiva: 'primeira' }, jogador())).toBe(MENSAGEM_PADRAO_DE_BLOQUEIO);
    expect(condicaoNaoAtendida({ missaoAtiva: 'primeira' }, jogador({ missoesAtivas: ['primeira'] }))).toBeNull();
  });
});
