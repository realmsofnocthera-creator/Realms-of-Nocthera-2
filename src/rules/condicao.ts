import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { GAME_CONFIG } from '@/rules/config';

/**
 * Condição de acesso de um objeto do mapa (Campanha, 5.5-5): porta, baú, ativador de cena e área de monstros só
 * valem quando TODAS as exigências da condição estão atendidas (o jogador atende a todas ao mesmo tempo). Sem
 * `condicao`, o objeto vale sempre. Os textos são do Yuri; o painel só guarda o que ele escrever.
 */
export const ID_DE_REFERENCIA = /^[a-z0-9][a-z0-9-]{1,47}$/;
export const MENSAGEM_MAXIMA_DA_CONDICAO = 200;
export const QUANTIDADE_MAXIMA_DE_ITEM = 999;

export interface CondicaoDeAcesso {
  /** A missão precisa estar em andamento. */
  missaoAtiva?: string;
  /** A missão precisa estar concluída. */
  missaoConcluida?: string;
  /** O jogador precisa ter visto a cena (a abertura não conta: use o identificador da cena). */
  cenaVista?: string;
  /** O jogador precisa ter este item na mochila (a chave não é gasta). */
  item?: { id: string; qtd: number };
  nivelMinimo?: number;
  /** O que o jogador lê quando está bloqueado. Vazio = uma mensagem padrão. */
  mensagem?: string;
}

const CAMPOS = ['missaoAtiva', 'missaoConcluida', 'cenaVista', 'item', 'nivelMinimo', 'mensagem'];
export const MENSAGEM_PADRAO_DE_BLOQUEIO = 'Você ainda não pode passar por aqui.';

const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const itemExiste = (id: string) => id in MATERIAIS_MAP || id in MATERIAIS_MUNDO_MAP;

/** Confere a condição bruta de um objeto e devolve a cópia limpa (undefined se não há exigência nenhuma). */
export function validarCondicao(bruto: unknown, nome: string, erros: string[]): CondicaoDeAcesso | undefined {
  if (bruto === undefined) return undefined;
  if (!eObjeto(bruto)) {
    erros.push(`${nome}: a condição precisa ser um objeto.`);
    return undefined;
  }
  const extras = Object.keys(bruto).filter((k) => !CAMPOS.includes(k));
  if (extras.length) erros.push(`${nome}: a condição tem campos desconhecidos (${extras.join(', ')}).`);
  const limpa: CondicaoDeAcesso = {};
  for (const campo of ['missaoAtiva', 'missaoConcluida', 'cenaVista'] as const) {
    const v = bruto[campo];
    if (v === undefined || v === '') continue;
    if (typeof v !== 'string' || !ID_DE_REFERENCIA.test(v)) erros.push(`${nome}: ${campo === 'cenaVista' ? 'escolha a cena da condição' : 'escolha a missão da condição'}.`);
    else limpa[campo] = v;
  }
  if (bruto.item !== undefined) {
    const it = bruto.item;
    if (!eObjeto(it) || typeof it.id !== 'string' || !itemExiste(it.id)) erros.push(`${nome}: item da condição desconhecido.`);
    else if (typeof it.qtd !== 'number' || !Number.isInteger(it.qtd) || it.qtd < 1 || it.qtd > QUANTIDADE_MAXIMA_DE_ITEM) erros.push(`${nome}: a quantidade do item da condição vai de 1 a ${QUANTIDADE_MAXIMA_DE_ITEM}.`);
    else limpa.item = { id: it.id, qtd: it.qtd };
  }
  if (bruto.nivelMinimo !== undefined && bruto.nivelMinimo !== 0) {
    const n = bruto.nivelMinimo;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > GAME_CONFIG.NIVEL_MAXIMO_GRAU_1) erros.push(`${nome}: o nível mínimo vai de 1 a ${GAME_CONFIG.NIVEL_MAXIMO_GRAU_1}.`);
    else limpa.nivelMinimo = n;
  }
  if (bruto.mensagem !== undefined) {
    const m = typeof bruto.mensagem === 'string' ? bruto.mensagem.trim() : null;
    if (m === null || m.length > MENSAGEM_MAXIMA_DA_CONDICAO) erros.push(`${nome}: a mensagem do bloqueio vai até ${MENSAGEM_MAXIMA_DA_CONDICAO} caracteres.`);
    else if (m) limpa.mensagem = m;
  }
  return Object.keys(limpa).length ? limpa : undefined;
}

/** O que o jogador tem agora, para conferir uma condição. */
export interface SituacaoDoJogador {
  nivel: number;
  inventario: Readonly<Record<string, number>>;
  /** Missões em andamento e concluídas. */
  missoesAtivas: readonly string[];
  missoesConcluidas: readonly string[];
  /** Cenas já vistas (chaves "abertura" e "mapa:objeto" não entram aqui: só identificadores de cena). */
  cenasVistas: readonly string[];
}

/** A primeira exigência não atendida, ou null se o jogador pode. */
export function condicaoNaoAtendida(condicao: CondicaoDeAcesso | undefined, s: SituacaoDoJogador): string | null {
  if (!condicao) return null;
  const falhou =
    (condicao.missaoAtiva !== undefined && !s.missoesAtivas.includes(condicao.missaoAtiva)) ||
    (condicao.missaoConcluida !== undefined && !s.missoesConcluidas.includes(condicao.missaoConcluida)) ||
    (condicao.cenaVista !== undefined && !s.cenasVistas.includes(condicao.cenaVista)) ||
    (condicao.item !== undefined && (s.inventario[condicao.item.id] ?? 0) < condicao.item.qtd) ||
    (condicao.nivelMinimo !== undefined && s.nivel < condicao.nivelMinimo);
  return falhou ? condicao.mensagem || MENSAGEM_PADRAO_DE_BLOQUEIO : null;
}
