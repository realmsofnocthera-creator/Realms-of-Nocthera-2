/**
 * Detecção de anomalias (6.5-4) e limite de contas por rede (6.5-6), decididos pelo Yuri em 24/10/2026.
 *
 * Os tetos são o valor inicial "3× o que um jogador ativo faz", estimado sem dados reais: calibrar no beta. Um sinal
 * não pune ninguém; ele só manda o jogador para a fila de revisão do Painel do Mestre.
 */

/** Quantas contas novas uma mesma rede (IP) pode criar em 24 horas. */
export const CONTAS_POR_IP = 3;
export const JANELA_DAS_CONTAS_MS = 24 * 60 * 60 * 1000;

/** Estimativa de lutas por hora de um jogador ativo (a calibrar no beta). */
export const LUTAS_DE_UM_JOGADOR_ATIVO_POR_HORA = 200;
export const MULTIPLO_DO_TETO = 3;
/** Ações gravadas (lutas, buscas, resgates...) em uma hora. */
export const TETO_DE_ACOES_POR_HORA = MULTIPLO_DO_TETO * LUTAS_DE_UM_JOGADOR_ATIVO_POR_HORA;
/** O ouro de uma luta da Caçada vai até 15 × o nível; o teto é 3× uma hora de lutas assim. */
export const tetoDeOuroPorHora = (nivel: number) => MULTIPLO_DO_TETO * LUTAS_DE_UM_JOGADOR_ATIVO_POR_HORA * 15 * Math.max(1, Math.floor(nivel));
/** Níveis em uma hora, contados só do nível 20 em diante (antes disso subir rápido é normal). */
export const TETO_DE_NIVEIS_POR_HORA = 5;
export const NIVEL_EM_QUE_OS_NIVEIS_CONTAM = 20;
/** Ritmo de robô: nas últimas 20 ações, intervalos curtos e quase iguais. */
export const MARCAS_DO_RITMO = 20;
export const INTERVALO_MAXIMO_DO_ROBO_MS = 20_000;
export const VARIACAO_MAXIMA_DO_ROBO = 0.08;

export type TipoDeSinal = 'acoesPorHora' | 'ouroPorHora' | 'niveisPorHora' | 'ritmoDeRobo' | 'contasNoMesmoIp' | 'extratoSemRegistro' | 'apelacao';
export const TIPOS_DE_SINAL: readonly TipoDeSinal[] = ['acoesPorHora', 'ouroPorHora', 'niveisPorHora', 'ritmoDeRobo', 'contasNoMesmoIp', 'extratoSemRegistro', 'apelacao'];

export const NOME_DO_SINAL: Readonly<Record<TipoDeSinal, string>> = {
  acoesPorHora: 'Muitas ações em uma hora',
  ouroPorHora: 'Muito ouro em uma hora',
  niveisPorHora: 'Muitos níveis em uma hora',
  ritmoDeRobo: 'Ritmo regular demais (possível automação)',
  contasNoMesmoIp: 'Muitas contas na mesma rede',
  extratoSemRegistro: 'Moeda mexida sem registro no extrato',
  apelacao: 'Pedido de apelação de sanção',
};

/** O que fica no personagem: as contas da hora corrente e os instantes das últimas ações. */
export interface RitmoDoJogador {
  /** A hora (UTC, "AAAA-MM-DDTHH") a que as contas se referem. */
  hora: string;
  acoes: number;
  ouro: number;
  niveis: number;
  /** Instantes (ms) das últimas ações, da mais antiga para a mais nova. */
  marcas: number[];
  /** Sinais já mandados para a fila nesta hora (para não repetir a cada ação). */
  avisados: TipoDeSinal[];
}

export const horaDe = (agora: Date) => agora.toISOString().slice(0, 13);

/** Soma uma ação ao ritmo (zerando as contas se a hora virou). */
export function somarRitmo(r: RitmoDoJogador | undefined, ganhos: { ouro: number; niveis: number }, agora: Date): RitmoDoJogador {
  const hora = horaDe(agora);
  const base: RitmoDoJogador = r && r.hora === hora ? r : { hora, acoes: 0, ouro: 0, niveis: 0, marcas: r?.marcas ?? [], avisados: [] };
  return {
    ...base,
    acoes: base.acoes + 1,
    ouro: base.ouro + Math.max(0, Math.floor(ganhos.ouro)),
    niveis: base.niveis + Math.max(0, Math.floor(ganhos.niveis)),
    marcas: [...base.marcas, agora.getTime()].slice(-MARCAS_DO_RITMO),
  };
}

/** Média e coeficiente de variação dos intervalos entre as marcas (null se ainda não há marcas suficientes). */
export function regularidade(marcas: readonly number[]): { media: number; variacao: number } | null {
  if (marcas.length < MARCAS_DO_RITMO) return null;
  const intervalos = marcas.slice(1).map((m, i) => m - marcas[i]);
  const media = intervalos.reduce((t, x) => t + x, 0) / intervalos.length;
  if (media <= 0) return { media: 0, variacao: 0 };
  const desvio = Math.sqrt(intervalos.reduce((t, x) => t + (x - media) ** 2, 0) / intervalos.length);
  return { media, variacao: desvio / media };
}

export interface SinalDoRitmo {
  tipo: TipoDeSinal;
  descricao: string;
}

/** Os sinais que o ritmo acende agora (`nivel` é o nível do personagem no começo da hora ou agora). */
export function sinaisDoRitmo(r: RitmoDoJogador, nivel: number): SinalDoRitmo[] {
  const saida: SinalDoRitmo[] = [];
  if (r.acoes >= TETO_DE_ACOES_POR_HORA) saida.push({ tipo: 'acoesPorHora', descricao: `${r.acoes} ações na hora ${r.hora}h (UTC); o teto é ${TETO_DE_ACOES_POR_HORA}.` });
  const tetoOuro = tetoDeOuroPorHora(nivel);
  if (r.ouro >= tetoOuro) saida.push({ tipo: 'ouroPorHora', descricao: `${r.ouro.toLocaleString('pt-BR')} de ouro na hora ${r.hora}h (UTC), no nível ${nivel}; o teto é ${tetoOuro.toLocaleString('pt-BR')}.` });
  if (r.niveis >= TETO_DE_NIVEIS_POR_HORA && nivel - r.niveis >= NIVEL_EM_QUE_OS_NIVEIS_CONTAM)
    saida.push({ tipo: 'niveisPorHora', descricao: `${r.niveis} níveis na hora ${r.hora}h (UTC), chegando ao nível ${nivel}; o teto é ${TETO_DE_NIVEIS_POR_HORA}.` });
  const reg = regularidade(r.marcas);
  if (reg && reg.media <= INTERVALO_MAXIMO_DO_ROBO_MS && reg.variacao < VARIACAO_MAXIMA_DO_ROBO)
    saida.push({ tipo: 'ritmoDeRobo', descricao: `As últimas ${MARCAS_DO_RITMO} ações vieram a cada ${(reg.media / 1000).toFixed(1)} s, com variação de ${Math.round(reg.variacao * 100)}%.` });
  return saida;
}

/** Leitura tolerante do banco. */
export function ritmoDoDocumento(bruto: unknown): RitmoDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  if (typeof o.hora !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(o.hora)) return undefined;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return {
    hora: o.hora,
    acoes: n(o.acoes),
    ouro: n(o.ouro),
    niveis: n(o.niveis),
    marcas: Array.isArray(o.marcas) ? o.marcas.filter((m): m is number => typeof m === 'number' && Number.isFinite(m)).slice(-MARCAS_DO_RITMO) : [],
    avisados: Array.isArray(o.avisados) ? o.avisados.filter((t): t is TipoDeSinal => (TIPOS_DE_SINAL as readonly unknown[]).includes(t)) : [],
  };
}

/** Uma entrada da fila de revisão: um sinal de um jogador. */
export interface EntradaDeRevisao {
  /** `${uid}__${hora}__${tipo}`: o mesmo sinal na mesma hora não se repete. */
  id: string;
  uid: string;
  nome: string;
  tipo: TipoDeSinal;
  descricao: string;
  criadaEm: string;
  revisada: boolean;
  revisadaPor?: string;
  revisadaEm?: string;
  /** Contas da mesma rede (só no sinal contasNoMesmoIp). */
  contasDaRede?: string[];
}

export const idDaRevisao = (uid: string, hora: string, tipo: TipoDeSinal) => `${uid}__${hora}__${tipo}`;

export function revisaoDoDocumento(id: string, bruto: unknown): EntradaDeRevisao | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.uid !== 'string' || !(TIPOS_DE_SINAL as readonly unknown[]).includes(o.tipo)) return null;
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id,
    uid: o.uid,
    nome: texto(o.nome),
    tipo: o.tipo as TipoDeSinal,
    descricao: texto(o.descricao),
    criadaEm: texto(o.criadaEm),
    revisada: o.revisada === true,
    ...(typeof o.revisadaPor === 'string' ? { revisadaPor: o.revisadaPor } : {}),
    ...(typeof o.revisadaEm === 'string' ? { revisadaEm: o.revisadaEm } : {}),
    ...(Array.isArray(o.contasDaRede) ? { contasDaRede: o.contasDaRede.filter((u): u is string => typeof u === 'string') } : {}),
  };
}
