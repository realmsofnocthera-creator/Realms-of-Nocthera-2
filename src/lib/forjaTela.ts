import type { CharacterDocument } from '@/server/characterService';
import { DADOS_CACADA_MAP } from '@/rules/cacada';
import {
  AlvoModificadorArma,
  CATEGORIAS_ARMA,
  CATEGORIAS_ARMA_MAP,
  CategoriaArma,
  RARIDADES_ARMA_MAP,
  RaridadeArma,
  ReceitaArma,
  atributosSorteaveis,
  danoFixoDaArma,
} from '@/rules/armas';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import { RaridadeMaterial } from '@/rules/raridades';
import { COR_RARIDADE, NOME_ELEMENTO } from '@/lib/cacadaTela';
import { ArmaPersonagem, custoDaReceita, diversosDaRaridade, nomeDoItem, pagarCusto } from '@/game/forja';

/** Lógica da tela da Forja (árvore de armas por monstro, lista de forja e detalhe da arma), sem React. */

type Personagem = Pick<CharacterDocument, 'inventario' | 'ouro' | 'armas'>;

export const COR_RARIDADE_ARMA: Readonly<Record<RaridadeArma, string>> = { ...COR_RARIDADE, mitico: '#E5484D' };

/**
 * Estado de cada arma da árvore para este personagem:
 * - tenho: está na mochila de armas;
 * - superada: o personagem já evoluiu para uma arma mais adiante na árvore;
 * - disponivel: tem a arma anterior (ou é a primeira) e paga a receita agora;
 * - faltaMaterial: tem a arma anterior (ou é a primeira), mas falta material ou ouro;
 * - bloqueada: falta a arma anterior da árvore.
 */
export type EstadoNoForja = 'tenho' | 'superada' | 'disponivel' | 'faltaMaterial' | 'bloqueada';

export interface NoForja {
  baseId: string;
  nome: string;
  raridade: RaridadeArma;
  raridadeNome: string;
  posicao: number;
  estado: EstadoNoForja;
}

export interface RamoForja {
  /** `principal` ou o id da subespécie. */
  id: string;
  /** Nome do ramo (a subespécie); vazio na árvore principal. */
  nome: string;
  nos: NoForja[];
}

export interface ArvoreForja {
  monstroId: string;
  nome: string;
  estrela: number;
  ramos: RamoForja[];
}

const armasDoPersonagem = (c: Personagem): readonly ArmaPersonagem[] => c.armas ?? [];

/** Pode fabricar esta arma agora? Só confere material e ouro (a arma anterior é conferida à parte). */
function pagaAReceita(baseId: string, c: Personagem): boolean {
  const base = ARMAS_BASE_MAP[baseId];
  const custo = custoDaReceita(base.receita);
  return pagarCusto(c.inventario ?? {}, custo) !== null && c.ouro >= custo.ouro;
}

/** Ids das armas da árvore que vêm depois desta (descendentes pela arma consumida). */
function descendentes(baseId: string): Set<string> {
  const resultado = new Set<string>();
  let fila = [baseId];
  while (fila.length > 0) {
    const proximos = ARMAS_BASE.filter((a) => a.consome !== null && fila.includes(a.consome)).map((a) => a.id);
    for (const id of proximos) resultado.add(id);
    fila = proximos;
  }
  return resultado;
}

export function estadoDoNo(baseId: string, categoria: CategoriaArma, c: Personagem): EstadoNoForja {
  const base = ARMAS_BASE_MAP[baseId];
  const minhas = armasDoPersonagem(c).filter((a) => a.categoria === categoria);
  if (minhas.some((a) => a.baseId === baseId)) return 'tenho';
  const depois = descendentes(baseId);
  if (minhas.some((a) => depois.has(a.baseId))) return 'superada';
  if (base.consome && !minhas.some((a) => a.baseId === base.consome)) return 'bloqueada';
  return pagaAReceita(baseId, c) ? 'disponivel' : 'faltaMaterial';
}

/** A árvore de armas de cada monstro (os 35), em ordem de estrela, com o estado de cada arma. */
export function arvoresDaForja(categoria: CategoriaArma, c: Personagem): ArvoreForja[] {
  const arvores: ArvoreForja[] = [];
  for (const arma of ARMAS_BASE) {
    let arvore = arvores.find((a) => a.monstroId === arma.monstroId);
    if (!arvore) {
      arvore = { monstroId: arma.monstroId, nome: DADOS_CACADA_MAP[arma.monstroId].nome, estrela: arma.estrela, ramos: [] };
      arvores.push(arvore);
    }
    let ramo = arvore.ramos.find((r) => r.id === arma.parte);
    if (!ramo) {
      ramo = { id: arma.parte, nome: arma.parte === 'principal' ? '' : DADOS_CACADA_MAP[arma.parte].nome, nos: [] };
      arvore.ramos.push(ramo);
    }
    ramo.nos.push({
      baseId: arma.id,
      nome: arma.nomes[categoria],
      raridade: arma.raridade,
      raridadeNome: RARIDADES_ARMA_MAP[arma.raridade].nome,
      posicao: arma.posicao,
      estado: estadoDoNo(arma.id, categoria, c),
    });
  }
  for (const a of arvores) for (const r of a.ramos) r.nos.sort((x, y) => x.posicao - y.posicao);
  return arvores;
}

export interface ItemListaForja extends NoForja {
  monstroNome: string;
  estrela: number;
}

/** Aba "Lista de forja": o que dá para fabricar agora, da maior estrela e raridade para a menor. */
export function listaDeForja(categoria: CategoriaArma, c: Personagem): ItemListaForja[] {
  const ordem: RaridadeArma[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'];
  return arvoresDaForja(categoria, c)
    .flatMap((a) => a.ramos.flatMap((r) => r.nos.map((n) => ({ ...n, monstroNome: a.nome, estrela: a.estrela }))))
    .filter((n) => n.estado === 'disponivel')
    .sort((x, y) => y.estrela - x.estrela || ordem.indexOf(y.raridade) - ordem.indexOf(x.raridade) || y.posicao - x.posicao);
}

export interface LinhaReceitaTela {
  id: string;
  nome: string;
  cor: string;
  precisa: number;
  tem: number;
  ok: boolean;
}

const COR_ITEM = (id: string): string => {
  const rar: RaridadeMaterial | undefined = MATERIAIS_MAP[id]?.raridade ?? MATERIAIS_MUNDO_MAP[id]?.raridade;
  return rar ? COR_RARIDADE[rar] : COR_RARIDADE.comum;
};

const ROTULO_MODIFICADOR: Readonly<Record<AlvoModificadorArma, string>> = {
  danoFisico: 'dano físico',
  danoMagico: 'dano mágico',
  agilidade: 'agilidade',
  chanceCritico: 'chance de crítico',
  defesa: 'defesa',
  chanceEfeitos: 'chance de efeitos',
};

export const textoModificador = (alvo: AlvoModificadorArma, percentual: number) =>
  `${percentual > 0 ? '+' : '−'}${Math.abs(percentual)}% ${ROTULO_MODIFICADOR[alvo]}`;

export interface DetalheArmaTela {
  baseId: string;
  nome: string;
  raridade: RaridadeArma;
  raridadeNome: string;
  cor: string;
  estrela: number;
  monstroNome: string;
  /** Subespécie do ramo, se a arma for de um ramo. */
  ramoNome: string | null;
  categoriaNome: string;
  tipoDano: 'Dano físico' | 'Dano mágico';
  subtipo: string | null;
  danoFixo: number;
  elementos: string[];
  status: string[];
  bonus: string;
  penalidade: string;
  /** Faixa do atributo sorteado, ou o tipo já definido pela arma anterior. */
  atributoSorteado: string;
  /** Arma anterior que será consumida (null na primeira arma da árvore). */
  consome: { nome: string; tenho: boolean } | null;
  materiais: LinhaReceitaTela[];
  diversos: LinhaReceitaTela | null;
  ouro: { precisa: number; tem: number; ok: boolean };
  estado: EstadoNoForja;
  /** Texto do botão: Fabricar na primeira arma, Evoluir nas seguintes. */
  acao: 'Fabricar' | 'Evoluir';
  /** Arma do personagem que será consumida ao evoluir (a enviar ao servidor). */
  armaAnteriorId: string | null;
  /** Se o personagem já tem esta arma: o atributo e os pontos sorteados. */
  minha: { atributo: string; pontos: number; reforjas: number } | null;
}

export function detalheDaArma(baseId: string, categoria: CategoriaArma, c: Personagem): DetalheArmaTela {
  const base = ARMAS_BASE_MAP[baseId];
  const def = CATEGORIAS_ARMA_MAP[categoria];
  const raridade = RARIDADES_ARMA_MAP[base.raridade];
  const minhas = armasDoPersonagem(c).filter((a) => a.categoria === categoria);
  const anterior = base.consome ? minhas.find((a) => a.baseId === base.consome) : undefined;
  const tenhoEsta = minhas.find((a) => a.baseId === baseId);
  const { materiais, diversos, ouro } = linhasDaReceita(base.receita, c);

  const atributoDefinido = anterior?.atributo ?? tenhoEsta?.atributo;
  const opcoes = atributosSorteaveis(categoria).map((a) => ATTRIBUTE_DISPLAY_NAMES[a]).join(', ');
  const faixa = `${raridade.pontosMin} a ${raridade.pontosMax} pontos`;

  return {
    baseId,
    nome: base.nomes[categoria],
    raridade: base.raridade,
    raridadeNome: raridade.nome,
    cor: COR_RARIDADE_ARMA[base.raridade],
    estrela: base.estrela,
    monstroNome: DADOS_CACADA_MAP[base.monstroId].nome,
    ramoNome: base.parte === 'principal' ? null : DADOS_CACADA_MAP[base.parte].nome,
    categoriaNome: def.nome,
    tipoDano: def.tipoDano === 'fisico' ? 'Dano físico' : 'Dano mágico',
    subtipo: def.subtipoFisico === 'corte' ? 'Corte' : def.subtipoFisico === 'perfuracao' ? 'Perfuração' : null,
    danoFixo: danoFixoDaArma(base.estrela, base.posicao, base.semElementoNemStatus === true),
    elementos: base.elementos.map((e) => NOME_ELEMENTO[e]),
    status: base.status.map((s) => EFEITOS_STATUS[s].nome),
    bonus: textoModificador(def.bonus.alvo, def.bonus.percentual),
    penalidade: textoModificador(def.penalidade.alvo, def.penalidade.percentual),
    atributoSorteado: atributoDefinido
      ? `${ATTRIBUTE_DISPLAY_NAMES[atributoDefinido]} (já definido na árvore): ${faixa}`
      : `Sorteado entre ${opcoes}: ${faixa}`,
    consome: base.consome ? { nome: ARMAS_BASE_MAP[base.consome].nomes[categoria], tenho: !!anterior } : null,
    materiais,
    diversos,
    ouro,
    estado: estadoDoNo(baseId, categoria, c),
    acao: base.consome ? 'Evoluir' : 'Fabricar',
    armaAnteriorId: anterior?.id ?? null,
    minha: tenhoEsta ? { atributo: ATTRIBUTE_DISPLAY_NAMES[tenhoEsta.atributo], pontos: tenhoEsta.pontos, reforjas: tenhoEsta.reforjas } : null,
  };
}

/** Linhas da receita para a tela: o que precisa, o que o personagem tem e o ouro (armas e armaduras). */
export function linhasDaReceita(
  receita: ReceitaArma,
  c: Pick<CharacterDocument, 'inventario' | 'ouro'>
): { materiais: LinhaReceitaTela[]; diversos: LinhaReceitaTela | null; ouro: { precisa: number; tem: number; ok: boolean } } {
  const custo = custoDaReceita(receita);
  const inv = c.inventario ?? {};
  const materiais: LinhaReceitaTela[] = Object.entries(custo.itens).map(([id, precisa]) => ({
    id, nome: nomeDoItem(id), cor: COR_ITEM(id), precisa, tem: inv[id] ?? 0, ok: (inv[id] ?? 0) >= precisa,
  }));
  let diversos: LinhaReceitaTela | null = null;
  if (custo.diversos) {
    const ids = diversosDaRaridade(custo.diversos.raridade);
    const tem = ids.reduce((soma, id) => soma + (inv[id] ?? 0), 0);
    diversos = {
      id: `diverso-${custo.diversos.raridade}`,
      nome: `Diverso ${raridadeNomeMaterial(custo.diversos.raridade)} (${ids.map(nomeDoItem).join(' ou ')})`,
      cor: COR_RARIDADE[custo.diversos.raridade],
      precisa: custo.diversos.qtd,
      tem,
      ok: tem >= custo.diversos.qtd,
    };
  }
  return { materiais, diversos, ouro: { precisa: custo.ouro, tem: c.ouro, ok: c.ouro >= custo.ouro } };
}

function raridadeNomeMaterial(r: RaridadeMaterial): string {
  return RARIDADES_ARMA_MAP[r].nome;
}

export const CATEGORIAS_TELA = CATEGORIAS_ARMA.map((c) => ({ id: c.id, nome: c.nome }));
