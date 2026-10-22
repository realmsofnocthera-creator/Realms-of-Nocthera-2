import { ativarColecionavel, buscar, MENSAGEM_BLOQUEIO_COLECIONAVEL, reforcarColecionavel, subirEstrela, type MotivoBloqueioColecionavel, type ResultadoDaBusca } from '@/game/colecionaveis';
import {
  BUSCAS_DE_UMA_VEZ,
  COLECIONAVEL_MAP,
  ehSeloDeBusca,
  NOME_DO_SELO,
  nivelMaximoDoReforco,
  type ColecionaveisDoJogador,
  type SelosDoJogador,
} from '@/rules/colecionaveis';
import { carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { sorteadorDaSemente } from '@/server/almas';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Buscar (a roleta de colecionáveis) e a aba Colecionáveis: buscar com selos, ativar, reforçar e subir estrelas, tudo
 * numa transação. Os selos, os Fragmentos de Memória e as Pedras da Recordação vêm das expedições e dos eventos (e,
 * por enquanto, dos ajustes do Mestre).
 */

export class ErroDeColecionavel extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeColecionavel';
  }
}

/** O que as telas recebem: os saldos e os colecionáveis do jogador (o catálogo e as contas vêm de `rules/colecionaveis`). */
export interface EstadoDosColecionaveis {
  selos: SelosDoJogador;
  /** Buscas feitas com cada selo desde a última garantia (a 10ª dá um inteiro). */
  garantia: SelosDoJogador;
  fragmentosDeMemoria: number;
  pedrasDaRecordacao: number;
  colecionaveis: ColecionaveisDoJogador;
}

export const estadoDe = (char: CharacterDocument): EstadoDosColecionaveis => ({
  selos: char.selosDeBusca ?? {},
  garantia: char.garantiaDaBusca ?? {},
  fragmentosDeMemoria: char.fragmentosDeMemoria ?? 0,
  pedrasDaRecordacao: char.pedrasDaRecordacao ?? 0,
  colecionaveis: char.colecionaveis ?? {},
});

export async function estadoDosColecionaveis(uid: string): Promise<EstadoDosColecionaveis> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return estadoDe(char);
}

export const ACOES_DOS_COLECIONAVEIS = ['buscar', 'ativar', 'reforcar', 'estrela'] as const;
export type AcaoDosColecionaveis = (typeof ACOES_DOS_COLECIONAVEIS)[number];

export interface PedidoDosColecionaveis {
  selo?: unknown;
  vezes?: unknown;
  id?: unknown;
  niveis?: unknown;
}

export interface RespostaDosColecionaveis {
  mensagem: string;
  resultados?: ResultadoDaBusca[];
  estado: EstadoDosColecionaveis;
}

function exigir<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new ErroDeColecionavel(MENSAGEM_BLOQUEIO_COLECIONAVEL[(r as unknown as { motivo: MotivoBloqueioColecionavel }).motivo]);
  return r as Extract<T, { ok: true }>;
}

const vazioParaUndefined = <T extends object>(o: T): T | undefined => (Object.keys(o).length ? o : undefined);
const zeroParaUndefined = (n: number) => (n > 0 ? n : undefined);

export async function agirNosColecionaveis(uid: string, acao: unknown, pedido: PedidoDosColecionaveis, semente = gerarSementeCombate()): Promise<RespostaDosColecionaveis> {
  if (typeof acao !== 'string' || !(ACOES_DOS_COLECIONAVEIS as readonly string[]).includes(acao)) throw new ErroDeColecionavel('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'colecionaveis');
  return repositorio.executarTransacao(`colecionaveis:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const colecionaveis = eu.colecionaveis ?? {};
    switch (acao as AcaoDosColecionaveis) {
      case 'buscar': {
        if (!ehSeloDeBusca(pedido.selo)) throw new ErroDeColecionavel('Escolha o selo da busca.');
        const vezes = typeof pedido.vezes === 'number' && (BUSCAS_DE_UMA_VEZ as readonly number[]).includes(pedido.vezes) ? pedido.vezes : 0;
        if (!vezes) throw new ErroDeColecionavel('Busque 1 ou 10 vezes.');
        const r = exigir(buscar(eu.selosDeBusca ?? {}, eu.garantiaDaBusca ?? {}, colecionaveis, pedido.selo, vezes, sorteadorDaSemente(semente)));
        const salvo = salvarPersonagem(ctx, eu, {
          selosDeBusca: vazioParaUndefined(r.selos),
          garantiaDaBusca: vazioParaUndefined(r.garantia),
          colecionaveis: vazioParaUndefined(r.colecionaveis),
        });
        const ativados = r.resultados.filter((x) => x.ativou).length;
        return {
          mensagem: `${vezes === 1 ? 'Busca feita' : `${vezes} buscas feitas`} com ${NOME_DO_SELO[pedido.selo]}.${ativados ? ` ${ativados === 1 ? '1 colecionável novo ativado' : `${ativados} colecionáveis novos ativados`}!` : ''}`,
          resultados: r.resultados,
          estado: estadoDe(salvo),
        };
      }
      case 'ativar': {
        const r = exigir(ativarColecionavel(colecionaveis, pedido.id));
        const salvo = salvarPersonagem(ctx, eu, { colecionaveis: r.colecionaveis });
        return { mensagem: `${COLECIONAVEL_MAP[pedido.id as string].nome} ativado.`, estado: estadoDe(salvo) };
      }
      case 'reforcar': {
        const niveis = typeof pedido.niveis === 'number' && Number.isInteger(pedido.niveis) && pedido.niveis >= 1 && pedido.niveis <= nivelMaximoDoReforco(5) ? pedido.niveis : 1;
        const r = exigir(reforcarColecionavel(colecionaveis, eu.fragmentosDeMemoria ?? 0, pedido.id, niveis));
        const salvo = salvarPersonagem(ctx, eu, { colecionaveis: r.colecionaveis, fragmentosDeMemoria: zeroParaUndefined(r.memoria) });
        return { mensagem: `${COLECIONAVEL_MAP[pedido.id as string].nome} reforçado ao nível ${r.nivel}.`, estado: estadoDe(salvo) };
      }
      case 'estrela': {
        const r = exigir(subirEstrela(colecionaveis, eu.pedrasDaRecordacao ?? 0, pedido.id));
        const salvo = salvarPersonagem(ctx, eu, { colecionaveis: r.colecionaveis, pedrasDaRecordacao: zeroParaUndefined(r.pedras) });
        return { mensagem: `${COLECIONAVEL_MAP[pedido.id as string].nome} subiu para ${r.estrelas}★.`, estado: estadoDe(salvo) };
      }
    }
  });
}
