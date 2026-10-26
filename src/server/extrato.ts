import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import { registrarLog } from '@/server/log';

/**
 * Ledger da economia (6.5-3). No fim de cada transação do banco, antes de gravar:
 *
 * - as cartas da Alma e os emblemas que entraram ou saíram viram linhas do extrato (o saldo é a quantidade de itens);
 * - cada linha ganha o saldo antes e depois, na ordem em que aconteceu;
 * - o saldo final de cada moeda tem de bater com o que foi registrado. Se não bater, alguma parte do código mexeu na
 *   moeda sem extrato: nos testes isso é erro; em produção, o fechamento cria uma linha "sem registro" para acertar e
 *   avisa no log, sem travar o jogador.
 *
 * Os equipamentos (armas e armaduras) ficam de fora, por decisão do Yuri em 24/10/2026.
 */

export const MOEDAS_DO_EXTRATO = ['ouro', 'diamantes', 'fragmentosAlma', 'essenciaHabilidade', 'fragmentosAscensao', 'essenciaDeSoberano'] as const;

/** Transações que não conferem: só a de atualização direta, usada pelos testes para montar o personagem. */
const SEM_CONFERENCIA = new Set(['atualizarPersonagem']);

/** O nome das transações que entregam ou consomem cartas e emblemas, para o motivo do extrato. */
const NOMES_DAS_OPERACOES: Record<string, string> = {
  'alma:despertar': 'Despertar carta',
  'alma:destruir': 'Destruir cartas',
  'alma:refinar': 'Refinar carta',
  'teste:iniciar': 'Teste de Equipe',
  'guilda:incursao': 'Incursão de guilda',
  'guilda:resgatarChefeSemanal': 'Chefe de guildas',
  guerreiro: 'Provação do Guerreiro',
  fundirEmblemas: 'Fundir emblemas',
  zerarProgressao: 'Progressão zerada pelo Mestre',
  ajusteDoMestre: 'Ajuste do Mestre',
  'mercado:anunciar': 'Mercado: anúncio',
  'mercado:comprar': 'Mercado: compra e venda',
  'mercado:cancelar': 'Mercado: anúncio cancelado',
  'mercado:devolver': 'Mercado: anúncio expirado',
  'correio:resgatar': 'Correio',
  'correio:resgatarTudo': 'Correio',
  'loja:comprar': 'Loja',
  'arena:comprarLuta': 'Arena: luta extra',
  'correio:arena': 'Correio: prêmio da Arena',
};
const nomeDaOperacao = (operacao: string) => NOMES_DAS_OPERACOES[operacao] ?? operacao;

/** A chave de saldo de uma linha: a moeda e, nos fragmentos de subclasse, a subclasse. */
export const chaveDoSaldo = (t: Pick<TransactionDocument, 'moeda' | 'chave'>) => (t.chave ? `${t.moeda ?? 'ouro'}:${t.chave}` : (t.moeda ?? 'ouro'));

/** Todos os saldos que o extrato acompanha, de um personagem (null = ainda não existe: tudo zero). */
export function saldosDoExtrato(c: CharacterDocument | null | undefined): Record<string, number> {
  const saida: Record<string, number> = {};
  if (!c) return saida;
  for (const m of MOEDAS_DO_EXTRATO) saida[m] = (c[m] as number | undefined) ?? 0;
  for (const [id, n] of Object.entries(c.fragmentosSubclasse ?? {})) if (n) saida[`fragmentosSubclasse:${id}`] = n;
  saida.cartas = c.cartasItens?.length ?? 0;
  saida.emblemas = c.emblemasItens?.length ?? 0;
  return saida;
}

export interface DivergenciaDoExtrato {
  uid: string;
  chave: string;
  esperado: number;
  real: number;
}

const ids = (lista: readonly { id: string }[] | undefined) => new Set((lista ?? []).map((i) => i.id));

function linhasDeItens(uid: string, moeda: 'cartas' | 'emblemas', antes: Set<string>, depois: Set<string>, operacao: string, agora: string): TransactionDocument[] {
  const entraram = [...depois].filter((id) => !antes.has(id)).length;
  const sairam = [...antes].filter((id) => !depois.has(id)).length;
  const nome = moeda === 'cartas' ? 'carta' : 'emblema';
  const linha = (tipo: 'ganho' | 'perda', n: number): TransactionDocument => ({
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    uid,
    tipo,
    quantidade: n,
    moeda,
    motivo: `${nomeDaOperacao(operacao)}: ${n} ${n === 1 ? nome : `${nome}s`}`,
    timestamp: agora,
  });
  return [...(sairam ? [linha('perda', sairam)] : []), ...(entraram ? [linha('ganho', entraram)] : [])];
}

/**
 * Fecha o extrato de uma transação: devolve as linhas a gravar (com saldo antes e depois e as de cartas e emblemas)
 * e as divergências encontradas. `lidos` é o personagem como estava no banco antes da transação; `gravados`, como
 * vai ficar.
 */
export function fecharExtrato(
  operacao: string,
  lidos: ReadonlyMap<string, CharacterDocument | null>,
  gravados: ReadonlyMap<string, CharacterDocument>,
  transacoes: readonly TransactionDocument[],
  agora = new Date()
): { transacoes: TransactionDocument[]; divergencias: DivergenciaDoExtrato[] } {
  const quando = agora.toISOString();
  const saida: TransactionDocument[] = transacoes.map((t) => ({ ...t, operacao }));
  const divergencias: DivergenciaDoExtrato[] = [];
  const conferir = !SEM_CONFERENCIA.has(operacao);

  for (const [uid, depois] of gravados) {
    if (!lidos.has(uid)) continue; // gravado sem ler (não acontece nos fluxos do jogo): sem base para conferir
    const antes = lidos.get(uid) ?? null;
    saida.push(
      ...linhasDeItens(uid, 'cartas', ids(antes?.cartasItens), ids(depois.cartasItens), operacao, quando).map((t) => ({ ...t, operacao })),
      ...linhasDeItens(uid, 'emblemas', ids(antes?.emblemasItens), ids(depois.emblemasItens), operacao, quando).map((t) => ({ ...t, operacao }))
    );
    const corrente = saldosDoExtrato(antes);
    for (const t of saida) {
      if (t.uid !== uid) continue;
      const chave = chaveDoSaldo(t);
      const antesDaLinha = corrente[chave] ?? 0;
      const depoisDaLinha = antesDaLinha + (t.tipo === 'ganho' ? t.quantidade : -t.quantidade);
      t.saldoAntes = antesDaLinha;
      t.saldoDepois = depoisDaLinha;
      corrente[chave] = depoisDaLinha;
    }
    if (!conferir) continue;
    const real = saldosDoExtrato(depois);
    for (const chave of new Set([...Object.keys(corrente), ...Object.keys(real)])) {
      const esperado = corrente[chave] ?? 0;
      const final = real[chave] ?? 0;
      if (esperado === final) continue;
      divergencias.push({ uid, chave, esperado, real: final });
      const [moeda, sub] = chave.split(':');
      saida.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        uid,
        tipo: final > esperado ? 'ganho' : 'perda',
        quantidade: Math.abs(final - esperado),
        moeda: moeda as TransactionDocument['moeda'],
        ...(sub ? { chave: sub } : {}),
        motivo: `Ajuste sem registro (${operacao})`,
        timestamp: quando,
        operacao,
        saldoAntes: esperado,
        saldoDepois: final,
        semRegistro: true,
      });
    }
  }
  saida.forEach((t, i) => (t.ordem = i));
  return { transacoes: saida, divergencias };
}

/** Avisa (ou, nos testes, falha) quando o fechamento achou moeda mexida sem extrato. */
export function tratarDivergencias(operacao: string, divergencias: readonly DivergenciaDoExtrato[]): void {
  if (!divergencias.length) return;
  if (process.env.NODE_ENV === 'test' && !process.env.EXTRATO_SO_AVISA) {
    const d = divergencias[0];
    throw new Error(`Extrato: "${d.chave}" de ${d.uid} mudou sem registro em "${operacao}" (esperado ${d.esperado}, ficou ${d.real}).`);
  }
  registrarLog('ERROR', 'extrato.sem_registro', { operacao, divergencias: divergencias.map((d) => ({ ...d })) });
}

// ---------------------------------------------------------------------------------------------------------------
// Conferência (reconciliação) do extrato com o saldo, para o Painel do Mestre
// ---------------------------------------------------------------------------------------------------------------

export interface ProblemaDoExtrato {
  chave: string;
  descricao: string;
}

export interface ConferenciaDoExtrato {
  confere: boolean;
  /** Quantas linhas recentes tinham saldo (as anteriores à v3.49 não têm e ficam de fora). */
  linhasConferidas: number;
  /** Linhas criadas para acertar moeda mexida sem registro. */
  semRegistro: number;
  problemas: ProblemaDoExtrato[];
}

/**
 * Confere o extrato recente com o saldo de agora: em cada moeda, a linha mais recente tem de terminar no saldo atual
 * e cada linha tem de começar onde a anterior terminou. `transacoes` pode vir em qualquer ordem.
 */
export function conferirExtrato(c: CharacterDocument, transacoes: readonly TransactionDocument[]): ConferenciaDoExtrato {
  const comSaldo = transacoes
    .filter((t) => typeof t.saldoAntes === 'number' && typeof t.saldoDepois === 'number')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || (a.ordem ?? 0) - (b.ordem ?? 0));
  const problemas: ProblemaDoExtrato[] = [];
  const ultima = new Map<string, TransactionDocument>();
  for (const t of comSaldo) {
    const chave = chaveDoSaldo(t);
    const anterior = ultima.get(chave);
    if (anterior && anterior.saldoDepois !== t.saldoAntes)
      problemas.push({ chave, descricao: `Salto no extrato em ${t.timestamp}: a linha anterior terminou em ${anterior.saldoDepois} e esta começa em ${t.saldoAntes}.` });
    ultima.set(chave, t);
  }
  const saldos = saldosDoExtrato(c);
  for (const [chave, t] of ultima) {
    const atual = saldos[chave] ?? 0;
    if (t.saldoDepois !== atual) problemas.push({ chave, descricao: `O saldo atual é ${atual}, mas o extrato termina em ${t.saldoDepois}.` });
  }
  const semRegistro = transacoes.filter((t) => t.semRegistro).length;
  return { confere: problemas.length === 0 && semRegistro === 0, linhasConferidas: comSaldo.length, semRegistro, problemas };
}
