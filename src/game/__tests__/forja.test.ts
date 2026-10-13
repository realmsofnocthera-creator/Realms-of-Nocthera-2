import { describe, it, expect } from 'vitest';
import {
  ArmaPersonagem,
  BILHETE_DE_MELHORIA,
  EstadoForja,
  MAX_ARMAS_POR_PERSONAGEM,
  custoDaReceita,
  lerArmasPersonagem,
  nomeDoItem,
  pagarCusto,
  planejarCustomizacao,
  planejarFabricacao,
  planejarReforja,
} from '@/game/forja';
import { CHANCE_DIVERSO_PERCENTUAL, sortearDropsExtras } from '@/game/cacada';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { RARIDADES_ARMA_MAP } from '@/rules/armas';
import { DADOS_CACADA_MAP } from '@/rules/cacada';

/** Forja: fabricar, evoluir, reforjar e customizar (regras puras). */

const amb = (valor = 0) => {
  let n = 0;
  return { aleatorio: () => valor, novoId: () => `arma-${++n}`, agora: '2026-10-12T00:00:00.000Z' };
};

/** Inventário com o bastante para pagar a receita `vezes` vezes. */
function inventarioPara(baseId: string, vezes = 1): Record<string, number> {
  const custo = custoDaReceita(ARMAS_BASE_MAP[baseId].receita);
  const inv: Record<string, number> = {};
  for (const [id, q] of Object.entries(custo.itens)) inv[id] = q * vezes;
  return inv;
}

const vazio: EstadoForja = { inventario: {}, ouro: 0, armas: [] };

describe('Fabricar', () => {
  it('fabrica a primeira arma: paga materiais e ouro, sorteia atributo e pontos da raridade', () => {
    const estado: EstadoForja = { inventario: inventarioPara('ferro-de-cacada'), ouro: 150, armas: [] };
    const r = planejarFabricacao(estado, { baseId: 'ferro-de-cacada', categoria: 'katana' }, amb(0));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ouroGasto).toBe(100);
    expect(r.inventario).toEqual({});
    expect(r.arma).toMatchObject({ baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'vigor', pontos: 1, reforjas: 0 });
    expect(r.armas).toHaveLength(1);
  });

  it('evoluir consome a arma anterior da mesma categoria e mantém o tipo do atributo', () => {
    const anterior: ArmaPersonagem = {
      id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'sorte', pontos: 3, reforjas: 2, criadaEm: '',
    };
    const estado: EstadoForja = { inventario: inventarioPara('montante-de-pelo'), ouro: 1000, armas: [anterior] };
    const r = planejarFabricacao(estado, { baseId: 'montante-de-pelo', categoria: 'katana', armaAnteriorId: 'a1' }, amb(0.999));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.armas.map((a) => a.baseId)).toEqual(['montante-de-pelo']);
    expect(r.arma).toMatchObject({ atributo: 'sorte', pontos: RARIDADES_ARMA_MAP.comum.pontosMax, reforjas: 0 });
  });

  it('bloqueia sem a arma anterior, com categoria diferente, sem material, sem ouro ou com o limite cheio', () => {
    const katana: ArmaPersonagem = { id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'sorte', pontos: 3, reforjas: 0, criadaEm: '' };
    const rico: EstadoForja = { inventario: inventarioPara('montante-de-pelo'), ouro: 9999, armas: [katana] };
    const motivo = (e: EstadoForja, p: Parameters<typeof planejarFabricacao>[1]) => {
      const r = planejarFabricacao(e, p, amb());
      return r.ok ? 'ok' : r.motivo;
    };
    expect(motivo(rico, { baseId: 'nao-existe', categoria: 'katana' })).toBe('armaInvalida');
    expect(motivo(rico, { baseId: 'ferro-de-cacada', categoria: 'machado' })).toBe('categoriaInvalida');
    expect(motivo(rico, { baseId: 'montante-de-pelo', categoria: 'katana' })).toBe('armaAnteriorAusente');
    expect(motivo(rico, { baseId: 'montante-de-pelo', categoria: 'lanca', armaAnteriorId: 'a1' })).toBe('armaAnteriorAusente');
    expect(motivo({ ...rico, inventario: {} }, { baseId: 'montante-de-pelo', categoria: 'katana', armaAnteriorId: 'a1' })).toBe('materiaisInsuficientes');
    expect(motivo({ ...rico, ouro: 10 }, { baseId: 'montante-de-pelo', categoria: 'katana', armaAnteriorId: 'a1' })).toBe('ouroInsuficiente');
    const cheio = { ...rico, inventario: inventarioPara('ferro-de-cacada'), armas: Array.from({ length: MAX_ARMAS_POR_PERSONAGEM }, (_, i) => ({ ...katana, id: `x${i}` })) };
    expect(motivo(cheio, { baseId: 'ferro-de-cacada', categoria: 'katana' })).toBe('limiteDeArmas');
    expect(motivo(vazio, { baseId: 'ferro-de-cacada', categoria: 'katana' })).toBe('materiaisInsuficientes');
  });

  it('diversos: a receita aceita qualquer um dos dois da raridade', () => {
    const comDiverso = ARMAS_BASE.find((a) => a.receita.diversos)!;
    const custo = custoDaReceita(comDiverso.receita);
    const [d1, d2] = ['mundo-coracao-de-serpe', 'mundo-nucleo-elemental'];
    const inv = { ...custo.itens, [d1]: 0, [d2]: custo.diversos!.qtd };
    expect(custo.diversos!.raridade).toBe('muitoRaro');
    expect(pagarCusto(inv, custo)).toEqual({});
    expect(pagarCusto({ ...custo.itens }, custo)).toBeNull();
  });
});

describe('Reforjar', () => {
  const arma: ArmaPersonagem = { id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'sorte', pontos: 1, reforjas: 0, criadaEm: '' };

  it('custa 50% da receita (arredondado para cima), sorteia os pontos de novo e mantém o tipo', () => {
    const r = planejarReforja({ inventario: { 'pelo-de-rato': 3, 'mundo-osso-bruto': 1, 'mundo-minerio-de-ferro-bruto': 1, 'mundo-fibra-silvestre': 1 }, ouro: 50, armas: [arma] }, 'a1', amb(0.999));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.percentual).toBe(50);
    expect(r.ouroGasto).toBe(50);
    expect(r.inventario).toEqual({});
    expect(r.arma).toMatchObject({ atributo: 'sorte', pontos: 9, reforjas: 1 });
  });

  it('a próxima reforja custa mais; arma inexistente é recusada', () => {
    const r = planejarReforja({ inventario: { 'pelo-de-rato': 5, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 }, ouro: 75, armas: [{ ...arma, reforjas: 1 }] }, 'a1', amb());
    expect(r.ok && r.percentual).toBe(75);
    const x = planejarReforja(vazio, 'a1', amb());
    expect(x.ok ? 'ok' : x.motivo).toBe('armaNaoEncontrada');
  });
});

describe('Customização', () => {
  const mitica = ARMAS_BASE.find((a) => a.raridade === 'mitico' && a.status.length > 0)!;
  const miticaSemStatus = ARMAS_BASE.find((a) => a.raridade === 'mitico' && a.status.length === 0)!;
  const arma = (baseId: string, customizacao?: ArmaPersonagem['customizacao']): ArmaPersonagem => ({
    id: 'm1', baseId, categoria: 'cajado', atributo: 'vigor', pontos: 120, reforjas: 0, criadaEm: '', ...(customizacao ? { customizacao } : {}),
  });
  const rico = (a: ArmaPersonagem): EstadoForja => ({ inventario: { [BILHETE_DE_MELHORIA.id]: 1 }, ouro: 20000, armas: [a] });
  const motivo = (e: EstadoForja, opcao: string) => {
    const r = planejarCustomizacao(e, 'm1', opcao);
    return r.ok ? 'ok' : r.motivo;
  };

  it('+1 ponto por 20.000 de ouro e 1 Bilhete de melhoria', () => {
    const r = planejarCustomizacao(rico(arma(mitica.id)), 'm1', 'dano');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ouroGasto).toBe(20000);
    expect(r.inventario).toEqual({});
    expect(r.arma.customizacao).toEqual({ dano: 1 });
  });

  it('só Mítico, até +20, status só em arma com status, e pede Bilhete e ouro', () => {
    expect(motivo(rico(arma('ferro-de-cacada')), 'dano')).toBe('naoCustomizavel');
    expect(motivo(rico(arma(mitica.id)), 'velocidade')).toBe('opcaoInvalida');
    expect(motivo(rico(arma(miticaSemStatus.id)), 'status')).toBe('semStatus');
    expect(motivo(rico(arma(mitica.id, { dano: 15, atributo: 5 })), 'status')).toBe('customizacaoNoMaximo');
    expect(motivo({ ...rico(arma(mitica.id)), inventario: {} }, 'dano')).toBe('bilheteInsuficiente');
    expect(motivo({ ...rico(arma(mitica.id)), ouro: 19999 }, 'dano')).toBe('ouroInsuficiente');
  });
});

describe('Drops extras da Caçada', () => {
  it('1% por raridade de cair um diverso; Bilhete de melhoria só no 9★', () => {
    const rato = DADOS_CACADA_MAP['rato-da-floresta'];
    expect(sortearDropsExtras(rato.drops, 1, () => 99)).toEqual([]);
    const tudo = sortearDropsExtras(rato.drops, 1, () => 0);
    expect(tudo.map((d) => d.materialId)).toEqual(['mundo-couro-grosseiro', 'mundo-glandula-venenosa', 'mundo-coracao-de-serpe']);
    expect(CHANCE_DIVERSO_PERCENTUAL).toBe(1);
    const oryndrak = DADOS_CACADA_MAP['oryndrak'];
    const extras = sortearDropsExtras(oryndrak.drops, 9, () => 0).map((d) => d.materialId);
    expect(extras).toHaveLength(6);
    expect(extras[5]).toBe(BILHETE_DE_MELHORIA.id);
    expect(sortearDropsExtras(oryndrak.drops, 9, (i) => (i < 60 ? 99 : 0.5)).map((d) => d.materialId)).toEqual([BILHETE_DE_MELHORIA.id]);
  });

  it('Entomologista soma pontos percentuais à chance do diverso', () => {
    const rato = DADOS_CACADA_MAP['rato-da-floresta'];
    expect(sortearDropsExtras(rato.drops, 1, () => 1.2)).toEqual([]); // 1,2 não passa de 1%
    expect(sortearDropsExtras(rato.drops, 1, () => 1.2, 0.5)).toHaveLength(3); // 1,2 passa de 1,5%
    expect(sortearDropsExtras(rato.drops, 1, () => 2.5, 2)).toHaveLength(3); // até 3%
    expect(sortearDropsExtras(rato.drops, 1, () => 3.1, 2)).toEqual([]);
  });

  it('nome de qualquer item do inventário', () => {
    expect(nomeDoItem('pelo-de-rato')).toBe('Pelo de Rato');
    expect(nomeDoItem('mundo-osso-bruto')).toBe('Osso Bruto');
    expect(nomeDoItem(BILHETE_DE_MELHORIA.id)).toBe('Bilhete de melhoria');
  });
});

describe('Leitura das armas gravadas', () => {
  it('descarta entradas inválidas e limpa a customização', () => {
    const lidas = lerArmasPersonagem([
      { id: 'a', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'sorte', pontos: 4, reforjas: 1, customizacao: { dano: 2, x: 9, status: 0 }, criadaEm: 't' },
      { id: 'b', baseId: 'nao-existe', categoria: 'katana', atributo: 'sorte' },
      { id: 'c', baseId: 'ferro-de-cacada', categoria: 'machado', atributo: 'sorte' },
      null,
    ]);
    expect(lidas).toEqual([{ id: 'a', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'sorte', pontos: 4, reforjas: 1, customizacao: { dano: 2 }, criadaEm: 't' }]);
    expect(lerArmasPersonagem('x')).toEqual([]);
  });
});
