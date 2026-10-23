import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { fimDaSemana, semanaDe } from '@/rules/chefeSemanal';
import { textoDoPresente } from '@/rules/correio';
import {
  BAU_DIARIO,
  BAU_SEMANAL,
  baus,
  checkinFeitoHoje,
  DIAS_DO_CHECKIN,
  diarioDeAgora,
  MISSOES_DIARIAS,
  MISSOES_SEMANAIS,
  missaoCompleta,
  proximoDiaDoCheckin,
  quantasCompletas,
  recompensaDoCheckin,
  somarDiario,
  type DefinicaoDeMissao,
  type DegrauDoBau,
  type ProgressoDeMissoes,
} from '@/rules/diario';
import { expedicaoPronta } from '@/rules/expedicao';
import { carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { entregarPresente } from '@/server/correio';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Missões diárias e semanais, baús de progresso e Check-in de 30 dias. O dia e a semana são os de Brasília; tudo
 * que entrega recompensa roda numa transação, com extrato.
 */

export class ErroDoDiario extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoDiario';
  }
}

export interface MissaoNaTela {
  id: string;
  nome: string;
  progresso: number;
  meta: number;
  completa: boolean;
}
export interface BauNaTela {
  missoes: number;
  diamantes: number;
  aberto: boolean;
  resgatado: boolean;
}
export interface DiaDoCalendario {
  dia: number;
  recompensa: string[];
  especial: boolean;
  feito: boolean;
  hoje: boolean;
}

/** Os avisos (pontos) do jogo, calculados só com o que está no personagem. */
export interface AvisosDoJogo {
  /** Degraus de baú (diário e semanal) prontos para resgatar. */
  missoes: number;
  /** O check-in de hoje ainda não foi feito. */
  checkin: boolean;
  /** Há expedição pronta para coletar. */
  expedicao: boolean;
  /** Há recompensa do Chefe de guildas de uma semana que acabou, esperando resgate. */
  guilda: boolean;
}

export interface EstadoDoDiario {
  dia: string;
  semana: string;
  fechaDiaEm: string;
  fechaSemanaEm: string;
  diarias: MissaoNaTela[];
  bauDiario: BauNaTela[];
  semanais: MissaoNaTela[];
  bauSemanal: BauNaTela[];
  checkin: { feitoHoje: boolean; proximoDia: number; calendario: DiaDoCalendario[] };
  avisos: AvisosDoJogo;
}

const naTela = (lista: readonly DefinicaoDeMissao[], p: ProgressoDeMissoes): MissaoNaTela[] =>
  lista.map((d) => ({ id: d.id, nome: d.nome, progresso: Math.min(p[d.metrica] ?? 0, d.meta), meta: d.meta, completa: missaoCompleta(d, p) }));

const bauNaTela = (degraus: readonly DegrauDoBau[], completas: number, resgatados: number): BauNaTela[] =>
  degraus.map((d, i) => ({ missoes: d.missoes, diamantes: d.diamantes, aberto: completas >= d.missoes, resgatado: i < resgatados }));

const somaDiamantes = (lista: readonly DegrauDoBau[]) => lista.reduce((t, d) => t + d.diamantes, 0);

export function avisosDe(char: CharacterDocument, agora: Date): AvisosDoJogo {
  const dia = diaDeBrasilia(agora);
  const semana = semanaDe(agora);
  const d = diarioDeAgora(char.diario, dia, semana);
  const prontos = baus(BAU_DIARIO, quantasCompletas(MISSOES_DIARIAS, d.hoje), d.bausDiarios).prontos.length + baus(BAU_SEMANAL, quantasCompletas(MISSOES_SEMANAIS, d.estaSemana), d.bausSemanais).prontos.length;
  return {
    missoes: prontos,
    checkin: !checkinFeitoHoje(char.checkin, dia),
    expedicao: (char.expedicoes ?? []).some((e) => expedicaoPronta(e, agora)),
    guilda: (char.chefeSemanal ?? []).some((p) => p.semana < semana && !p.resgatada),
  };
}

export function estadoDe(char: CharacterDocument, agora: Date): EstadoDoDiario {
  const dia = diaDeBrasilia(agora);
  const semana = semanaDe(agora);
  const d = diarioDeAgora(char.diario, dia, semana);
  const feitoHoje = checkinFeitoHoje(char.checkin, dia);
  const proximo = proximoDiaDoCheckin(char.checkin);
  // Dias já feitos do ciclo: o próximo é feitos + 1 (depois do 30º o ciclo volta ao começo, e o calendário zera)
  const feitos = feitoHoje && (char.checkin?.feitos ?? 0) === 0 ? DIAS_DO_CHECKIN : (char.checkin?.feitos ?? 0);
  return {
    dia,
    semana,
    fechaDiaEm: new Date(Date.parse(`${dia}T03:00:00.000Z`) + 86_400_000).toISOString(),
    fechaSemanaEm: `${fimDaSemana(semana)}T03:00:00.000Z`,
    diarias: naTela(MISSOES_DIARIAS, d.hoje),
    bauDiario: bauNaTela(BAU_DIARIO, quantasCompletas(MISSOES_DIARIAS, d.hoje), d.bausDiarios),
    semanais: naTela(MISSOES_SEMANAIS, d.estaSemana),
    bauSemanal: bauNaTela(BAU_SEMANAL, quantasCompletas(MISSOES_SEMANAIS, d.estaSemana), d.bausSemanais),
    checkin: {
      feitoHoje,
      proximoDia: proximo,
      calendario: Array.from({ length: DIAS_DO_CHECKIN }, (_, i) => {
        const n = i + 1;
        const r = recompensaDoCheckin(n);
        return { dia: n, recompensa: textoDoPresente(r), especial: !!r.diamantes, feito: n <= feitos, hoje: !feitoHoje && n === proximo };
      }),
    },
    avisos: avisosDe(char, agora),
  };
}

export async function estadoDoDiario(uid: string, agora = new Date()): Promise<EstadoDoDiario> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return estadoDe(char, agora);
}

export async function avisosDoJogador(uid: string, agora = new Date()): Promise<AvisosDoJogo> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return avisosDe(char, agora);
}

export const ACOES_DO_DIARIO = ['checkin', 'bau'] as const;
export type AcaoDoDiario = (typeof ACOES_DO_DIARIO)[number];

export async function agirNoDiario(uid: string, acao: unknown, pedido: { tipo?: unknown }, agora = new Date()): Promise<{ mensagem: string; estado: EstadoDoDiario }> {
  if (typeof acao !== 'string' || !(ACOES_DO_DIARIO as readonly string[]).includes(acao)) throw new ErroDoDiario('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'diario');
  const dia = diaDeBrasilia(agora);
  const semana = semanaDe(agora);
  return repositorio.executarTransacao(`diario:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);

    if (acao === 'checkin') {
      if (checkinFeitoHoje(eu.checkin, dia)) throw new ErroDoDiario('Você já fez o Check-in de hoje. Volte amanhã.');
      const n = proximoDiaDoCheckin(eu.checkin);
      const presente = recompensaDoCheckin(n);
      const { doc, patch } = entregarPresente(ctx, eu, presente, `Check-in (dia ${n})`);
      const salvo = salvarPersonagem(ctx, doc, {
        ...patch,
        checkin: { ultimoDia: dia, feitos: n % DIAS_DO_CHECKIN },
        diario: somarDiario(eu.diario, { checkin: 1 }, dia, semana),
      });
      return { mensagem: `Check-in do dia ${n} feito: ${textoDoPresente(presente).join(', ')}.`, estado: estadoDe(salvo, agora) };
    }

    const tipo = pedido.tipo === 'diario' || pedido.tipo === 'semanal' ? pedido.tipo : null;
    if (!tipo) throw new ErroDoDiario('Escolha o baú: diário ou semanal.');
    const d = diarioDeAgora(eu.diario, dia, semana);
    const diario = tipo === 'diario';
    const { prontos, abertos } = baus(diario ? BAU_DIARIO : BAU_SEMANAL, quantasCompletas(diario ? MISSOES_DIARIAS : MISSOES_SEMANAIS, diario ? d.hoje : d.estaSemana), diario ? d.bausDiarios : d.bausSemanais);
    if (!prontos.length) throw new ErroDoDiario(`Não há degrau do baú ${diario ? 'diário' : 'semanal'} para resgatar agora.`);
    const diamantes = somaDiamantes(prontos);
    const { doc, patch } = entregarPresente(ctx, eu, { diamantes }, `Baú ${diario ? 'diário' : 'semanal'} de missões`);
    const salvo = salvarPersonagem(ctx, doc, { ...patch, diario: { ...d, ...(diario ? { bausDiarios: abertos } : { bausSemanais: abertos }) } });
    return { mensagem: `${prontos.length === 1 ? '1 degrau do baú resgatado' : `${prontos.length} degraus do baú resgatados`}: ${diamantes} Diamantes.`, estado: estadoDe(salvo, agora) };
  });
}
