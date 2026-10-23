import { MATERIAIS_MUNDO, MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import type { RaridadeMaterial } from '@/rules/raridades';
import { SELOS_DE_BUSCA, type SelosDoJogador } from '@/rules/colecionaveis';
import {
  AVANCO_MS,
  expedicaoPronta,
  HORA_MS,
  NIVEL_DA_EXPEDICAO,
  turnoDeHoras,
  TURNOS_DE_EXPEDICAO,
  VAGAS_DE_EXPEDICAO,
  type ExpedicaoEmAndamento,
  type TurnoDeExpedicao,
} from '@/rules/expedicao';
import { bonusDaMaestriaDeExpedicao, ganharXpDeMaestria, XP_POR_HORA_DE_EXPEDICAO } from '@/rules/maestrias';
import { somarEstatisticas } from '@/rules/conquistas';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { sorteadorDaSemente } from '@/server/almas';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Expedição: enviar (paga o ouro), usar Avanço de expedição (tira 1 hora) e coletar a recompensa quando o tempo acaba,
 * tudo numa transação. O tempo é sempre o do servidor: o jogador só guarda quando a expedição termina.
 */

export class ErroDeExpedicao extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeExpedicao';
  }
}

export interface EstadoDaExpedicao {
  nivelNecessario: number;
  meuNivel: number;
  /** A hora do servidor (ISO), para a tela acertar a contagem regressiva com o relógio dele. */
  agora: string;
  ouro: number;
  avancos: number;
  expedicoes: ExpedicaoEmAndamento[];
  /** Vagas do jogador: 3, mais as da maestria de Expedição. */
  vagas: number;
  /** Maestria de Expedição: % a menos no tempo e materiais comuns a mais por expedição. */
  reducaoDeTempoPercentual: number;
  materiaisExtras: number;
}

/** As vagas do jogador (3 + as da maestria de Expedição). */
export const vagasDe = (char: Pick<CharacterDocument, 'maestrias'>) => VAGAS_DE_EXPEDICAO + bonusDaMaestriaDeExpedicao(char.maestrias).vagasExtras;

/** Duração de um turno com a maestria de Expedição (arredondada para o minuto). */
export function duracaoDoTurno(horas: number, reducaoPercentual: number): number {
  const minutos = Math.round((horas * 60 * (100 - reducaoPercentual)) / 100);
  return minutos * 60_000;
}

export const estadoDe = (char: CharacterDocument, agora: Date): EstadoDaExpedicao => {
  const maestria = bonusDaMaestriaDeExpedicao(char.maestrias);
  return {
    nivelNecessario: NIVEL_DA_EXPEDICAO,
    meuNivel: char.nivel,
    agora: agora.toISOString(),
    ouro: char.ouro ?? 0,
    avancos: char.avancosDeExpedicao ?? 0,
    expedicoes: char.expedicoes ?? [],
    vagas: VAGAS_DE_EXPEDICAO + maestria.vagasExtras,
    reducaoDeTempoPercentual: maestria.reducaoDeTempoPercentual,
    materiaisExtras: maestria.materiaisExtras,
  };
};

export async function estadoDaExpedicao(uid: string, agora = new Date()): Promise<EstadoDaExpedicao> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return estadoDe(char, agora);
}

export const ACOES_DA_EXPEDICAO = ['enviar', 'avancar', 'coletar'] as const;
export type AcaoDaExpedicao = (typeof ACOES_DA_EXPEDICAO)[number];

export interface PedidoDaExpedicao {
  horas?: unknown;
  vaga?: unknown;
  quantidade?: unknown;
}

/** O que uma coleta entregou (para a tela mostrar). */
export interface RecompensaColetada {
  vaga: number;
  horas: number;
  selos: SelosDoJogador;
  fragmentosDeMemoria: number;
  pedrasDaRecordacao: number;
  materiais: { id: string; nome: string; raridade: RaridadeMaterial; quantidade: number }[];
}

export interface RespostaDaExpedicao {
  mensagem: string;
  coletadas?: RecompensaColetada[];
  estado: EstadoDaExpedicao;
}

const vagaValida = (v: unknown, vagas: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < vagas;

/**
 * Sorteia os materiais do turno: a quantidade de cada raridade é fixa (mais os comuns extras da maestria de
 * Expedição); o tipo, sorteado entre os da raridade.
 */
function sortearMateriais(turno: TurnoDeExpedicao, sorteio: () => number, comunsExtras = 0): Record<string, number> {
  const saida: Record<string, number> = {};
  const quantidades = { ...turno.materiais, ...(comunsExtras > 0 ? { comum: (turno.materiais.comum ?? 0) + comunsExtras } : {}) };
  for (const [raridade, qtd] of Object.entries(quantidades) as [RaridadeMaterial, number][]) {
    const opcoes = MATERIAIS_MUNDO.filter((m) => m.raridade === raridade);
    for (let i = 0; i < qtd; i++) {
      const m = opcoes[Math.min(opcoes.length - 1, Math.floor(sorteio() * opcoes.length))];
      saida[m.id] = (saida[m.id] ?? 0) + 1;
    }
  }
  return saida;
}

export async function agirNaExpedicao(uid: string, acao: unknown, pedido: PedidoDaExpedicao, agora = new Date(), semente = gerarSementeCombate()): Promise<RespostaDaExpedicao> {
  if (typeof acao !== 'string' || !(ACOES_DA_EXPEDICAO as readonly string[]).includes(acao)) throw new ErroDeExpedicao('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'expedicao');
  return repositorio.executarTransacao(`expedicao:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    if (eu.nivel < NIVEL_DA_EXPEDICAO) throw new ErroDeExpedicao(`A Expedição abre no nível ${NIVEL_DA_EXPEDICAO}.`);
    const expedicoes = eu.expedicoes ?? [];
    const maestria = bonusDaMaestriaDeExpedicao(eu.maestrias);
    const vagas = VAGAS_DE_EXPEDICAO + maestria.vagasExtras;
    switch (acao as AcaoDaExpedicao) {
      case 'enviar': {
        const turno = turnoDeHoras(pedido.horas);
        if (!turno) throw new ErroDeExpedicao(`Escolha o turno: ${TURNOS_DE_EXPEDICAO.map((t) => `${t.horas} h`).join(', ')}.`);
        const ocupadas = new Set(expedicoes.map((e) => e.vaga));
        const vaga = vagaValida(pedido.vaga, vagas) ? pedido.vaga : [...Array(vagas).keys()].find((v) => !ocupadas.has(v));
        if (vaga === undefined || ocupadas.has(vaga)) throw new ErroDeExpedicao(`As ${vagas} vagas estão ocupadas. Colete uma expedição primeiro.`);
        if ((eu.ouro ?? 0) < turno.custoOuro) throw new ErroDeExpedicao(`Você precisa de ${turno.custoOuro} de ouro.`);
        const doc = alterarSaldoEm(ctx, eu, 'ouro', -turno.custoOuro, `Expedição de ${turno.horas} h`).character;
        const nova: ExpedicaoEmAndamento = { vaga, horas: turno.horas, inicio: agora.toISOString(), fim: new Date(agora.getTime() + duracaoDoTurno(turno.horas, maestria.reducaoDeTempoPercentual)).toISOString() };
        const salvo = salvarPersonagem(ctx, doc, { ouro: doc.ouro, expedicoes: [...expedicoes, nova].sort((a, b) => a.vaga - b.vaga) });
        return { mensagem: `Expedição de ${turno.horas} h enviada.`, estado: estadoDe(salvo, agora) };
      }
      case 'avancar': {
        const e = vagaValida(pedido.vaga, vagas) ? expedicoes.find((x) => x.vaga === pedido.vaga) : undefined;
        if (!e) throw new ErroDeExpedicao('Não há expedição nessa vaga.');
        if (expedicaoPronta(e, agora)) throw new ErroDeExpedicao('Essa expedição já terminou. É só coletar.');
        const quantidade = typeof pedido.quantidade === 'number' && Number.isInteger(pedido.quantidade) && pedido.quantidade >= 1 ? pedido.quantidade : 1;
        // Não gasta mais Avanços do que o tempo que falta
        const necessarios = Math.ceil((Date.parse(e.fim) - agora.getTime()) / AVANCO_MS);
        const usados = Math.min(quantidade, necessarios);
        if ((eu.avancosDeExpedicao ?? 0) < usados) throw new ErroDeExpedicao('Avanços de expedição insuficientes.');
        const fim = new Date(Math.max(Date.parse(e.inicio), Date.parse(e.fim) - usados * AVANCO_MS)).toISOString();
        const restantes = (eu.avancosDeExpedicao ?? 0) - usados;
        const salvo = salvarPersonagem(ctx, eu, {
          avancosDeExpedicao: restantes || undefined,
          expedicoes: expedicoes.map((x) => (x.vaga === e.vaga ? { ...x, fim, avancos: (x.avancos ?? 0) + usados } : x)),
        });
        return { mensagem: `${usados === 1 ? '1 Avanço usado' : `${usados} Avanços usados`}: -${usados} h.`, estado: estadoDe(salvo, agora) };
      }
      case 'coletar': {
        // Uma vaga, ou todas as prontas se a vaga não vier
        const alvo = vagaValida(pedido.vaga, vagas) ? expedicoes.filter((x) => x.vaga === pedido.vaga) : expedicoes.filter((x) => expedicaoPronta(x, agora));
        if (!alvo.length) throw new ErroDeExpedicao('Não há expedição pronta para coletar.');
        if (alvo.some((x) => !expedicaoPronta(x, agora))) throw new ErroDeExpedicao('Essa expedição ainda não voltou.');
        const sorteio = sorteadorDaSemente(semente);
        const selos: SelosDoJogador = { ...(eu.selosDeBusca ?? {}) };
        const inventario = { ...(eu.inventario ?? {}) };
        let memoria = eu.fragmentosDeMemoria ?? 0;
        let pedras = eu.pedrasDaRecordacao ?? 0;
        const coletadas: RecompensaColetada[] = [];
        for (const e of alvo) {
          const turno = turnoDeHoras(e.horas)!;
          for (const selo of SELOS_DE_BUSCA) if (turno.selos[selo]) selos[selo] = (selos[selo] ?? 0) + turno.selos[selo]!;
          memoria += turno.fragmentosDeMemoria;
          pedras += turno.pedrasDaRecordacao;
          const materiais = sortearMateriais(turno, sorteio, maestria.materiaisExtras);
          for (const [id, qtd] of Object.entries(materiais)) inventario[id] = (inventario[id] ?? 0) + qtd;
          coletadas.push({
            vaga: e.vaga,
            horas: e.horas,
            selos: turno.selos,
            fragmentosDeMemoria: turno.fragmentosDeMemoria,
            pedrasDaRecordacao: turno.pedrasDaRecordacao,
            materiais: Object.entries(materiais).map(([id, quantidade]) => ({ id, nome: MATERIAIS_MUNDO_MAP[id].nome, raridade: MATERIAIS_MUNDO_MAP[id].raridade, quantidade })),
          });
        }
        const coletadasVagas = new Set(alvo.map((x) => x.vaga));
        const restantes = expedicoes.filter((x) => !coletadasVagas.has(x.vaga));
        // Maestria de Expedição: XP pelas horas coletadas (com o teto do dia)
        const maestrias = ganharXpDeMaestria(eu.maestrias, { expedicao: alvo.reduce((t, x) => t + x.horas, 0) * XP_POR_HORA_DE_EXPEDICAO }, diaDeBrasilia(agora));
        const salvo = salvarPersonagem(ctx, eu, {
          ...(maestrias ? { maestrias } : {}),
          estatisticas: somarEstatisticas(eu.estatisticas, { expedicoes: alvo.length }),
          selosDeBusca: selos,
          fragmentosDeMemoria: memoria || undefined,
          pedrasDaRecordacao: pedras || undefined,
          inventario,
          expedicoes: restantes.length ? restantes : undefined,
        });
        return {
          mensagem: coletadas.length === 1 ? 'Expedição coletada!' : `${coletadas.length} expedições coletadas!`,
          coletadas,
          estado: estadoDe(salvo, agora),
        };
      }
    }
  });
}
