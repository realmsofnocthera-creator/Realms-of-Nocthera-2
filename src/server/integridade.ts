import { createHash } from 'node:crypto';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import type { DivergenciaDoExtrato } from '@/server/extrato';
import {
  CONTAS_POR_IP,
  horaDe,
  idDaRevisao,
  JANELA_DAS_CONTAS_MS,
  NOME_DO_SINAL,
  sinaisDoRitmo,
  somarRitmo,
  type EntradaDeRevisao,
  type TipoDeSinal,
} from '@/rules/integridade';

/**
 * Integridade (6.5-4 e 6.5-6): o ritmo de cada jogador, contado no fim de cada transação, os sinais que mandam o
 * jogador para a fila de revisão e o limite de contas novas por rede.
 */

// ---------------------------------------------------------------------------------------------------------------
// Rede (IP): só uma marca curta, nunca o IP
// ---------------------------------------------------------------------------------------------------------------

/**
 * A marca da rede: 6 caracteres de um hash do IP (no IPv6, da faixa /64, que é a de uma casa). Não dá para voltar ao
 * IP (milhares de IPs têm a mesma marca), e o que fica guardado dura 24 horas: basta para contar contas novas da
 * mesma rede sem guardar o IP de ninguém (LGPD). Null quando o IP é desconhecido.
 */
export function marcaDaRede(ip: string): string | null {
  const limpo = ip.trim().toLowerCase().replace(/^::ffff:/, '');
  if (!limpo || limpo === 'desconhecido') return null;
  const faixa = limpo.includes(':') ? limpo.split(':').slice(0, 4).join(':') : limpo;
  return `r${createHash('sha256').update(`nocthera-rede:${faixa}`).digest('hex').slice(0, 6)}`;
}

/** O registro das contas criadas numa rede nas últimas 24 horas. */
export interface CadastrosDaRede {
  marca: string;
  contas: { uid: string; em: string }[];
}

export class ErroDeMulticonta extends Error {
  readonly status = 429;
  constructor(readonly contasDaRede: string[]) {
    super(`Já foram criadas ${CONTAS_POR_IP} contas nesta rede nas últimas 24 horas. Tente de novo amanhã.`);
    this.name = 'ErroDeMulticonta';
  }
}

/** Confere o limite e devolve o registro com a conta nova (ou lança ErroDeMulticonta). */
export function cadastrarNaRede(atual: CadastrosDaRede | null, marca: string, uid: string, agora: Date): CadastrosDaRede {
  const recentes = (atual?.contas ?? []).filter((c) => agora.getTime() - Date.parse(c.em) < JANELA_DAS_CONTAS_MS && c.uid !== uid);
  if (recentes.length >= CONTAS_POR_IP) throw new ErroDeMulticonta(recentes.map((c) => c.uid));
  return { marca, contas: [...recentes, { uid, em: agora.toISOString() }] };
}

export function revisaoDeMulticonta(uid: string, contasDaRede: string[], agora: Date): EntradaDeRevisao {
  return {
    id: idDaRevisao(uid, horaDe(agora), 'contasNoMesmoIp'),
    uid,
    nome: '(sem personagem)',
    tipo: 'contasNoMesmoIp',
    descricao: `Tentou criar a ${CONTAS_POR_IP + 1}ª conta da mesma rede em 24 horas e foi barrado.`,
    criadaEm: agora.toISOString(),
    revisada: false,
    contasDaRede,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ritmo, no fim de cada transação
// ---------------------------------------------------------------------------------------------------------------

/**
 * Transações que não são ação do jogador: as do Mestre, as que o servidor faz sozinho ao abrir uma tela (correio do
 * Chefe Mundial, contratos do dia, conserto da guilda), o salvamento automático da posição na Campanha (que vem em
 * intervalos fixos e pareceria robô) e a de teste.
 */
const SEM_RITMO = new Set([
  'atualizarPersonagem',
  'ajusteDoMestre',
  'zerarProgressao',
  'correio:mestre',
  'correio:chefeMundial',
  'criarPersonagem',
  'campanhaPosicao',
  'guilda:contratosDoDia',
  'guilda:consertar',
  'correio:arena',
  'correio:vip',
  'compra:criar',
  'compra:pagar',
  'compra:estornar',
  'correio:campeonato',
  'chat:bloquear',
  'chat:desbloquear',
]);
const contaNoRitmo = (operacao: string) => !SEM_RITMO.has(operacao) && !operacao.startsWith('alterar:');

/**
 * Soma a ação ao ritmo de cada jogador gravado (troca o personagem em `gravados`) e devolve as entradas novas da fila
 * de revisão: os sinais do ritmo (uma vez por hora cada) e as moedas mexidas sem extrato.
 */
export function observarJogadores(
  operacao: string,
  lidos: ReadonlyMap<string, CharacterDocument | null>,
  gravados: Map<string, CharacterDocument>,
  transacoes: readonly TransactionDocument[],
  divergencias: readonly DivergenciaDoExtrato[],
  agora = new Date()
): EntradaDeRevisao[] {
  const revisoes: EntradaDeRevisao[] = [];
  const quando = agora.toISOString();
  const entrada = (c: CharacterDocument, tipo: TipoDeSinal, descricao: string): EntradaDeRevisao => ({
    id: idDaRevisao(c.uid, horaDe(agora), tipo),
    uid: c.uid,
    nome: c.nome,
    tipo,
    descricao,
    criadaEm: quando,
    revisada: false,
  });

  for (const [uid, depois] of gravados) {
    const semRegistro = divergencias.filter((d) => d.uid === uid);
    if (semRegistro.length)
      revisoes.push(entrada(depois, 'extratoSemRegistro', `Em "${operacao}": ${semRegistro.map((d) => `${d.chave} devia ficar em ${d.esperado} e ficou em ${d.real}`).join('; ')}.`));

    if (!lidos.has(uid)) continue;
    const antes = lidos.get(uid);
    // As regras trabalham com o personagem sem o ritmo (normalizarPersonagem): ele vem sempre do que estava no banco
    if (!contaNoRitmo(operacao)) {
      if (antes?.ritmo) gravados.set(uid, { ...depois, ritmo: antes.ritmo });
      continue;
    }
    const ouro = transacoes.filter((t) => t.uid === uid && (t.moeda ?? 'ouro') === 'ouro' && t.tipo === 'ganho' && !t.semRegistro).reduce((s, t) => s + t.quantidade, 0);
    const niveis = Math.max(0, (depois.nivel ?? 1) - (antes?.nivel ?? depois.nivel ?? 1));
    const ritmo = somarRitmo(antes?.ritmo, { ouro, niveis }, agora);
    const novos = sinaisDoRitmo(ritmo, depois.nivel ?? 1).filter((s) => !ritmo.avisados.includes(s.tipo));
    for (const s of novos) revisoes.push(entrada(depois, s.tipo, s.descricao));
    gravados.set(uid, { ...depois, ritmo: { ...ritmo, avisados: [...ritmo.avisados, ...novos.map((s) => s.tipo)] } });
  }
  return revisoes;
}

export { NOME_DO_SINAL };

export function cadastrosDaRedeDoDocumento(marca: string, bruto: unknown): CadastrosDaRede | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const contas = (bruto as Record<string, unknown>).contas;
  return {
    marca,
    contas: Array.isArray(contas)
      ? contas.filter((c): c is { uid: string; em: string } => !!c && typeof c === 'object' && typeof (c as { uid?: unknown }).uid === 'string' && typeof (c as { em?: unknown }).em === 'string')
      : [],
  };
}
