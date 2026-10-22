/** Ajustes manuais do Painel do Mestre (3.5.4.2): campos permitidos e limites por pedido. */
export const CAMPOS_DE_AJUSTE = [
  'ouro',
  'diamantes',
  'fragmentosAlma',
  'essenciaHabilidade',
  'fragmentosAscensao',
  'xp',
  'seloDesgastado',
  'seloEncantado',
  'seloEternidade',
  'seloOrigem',
  'fragmentosDeMemoria',
  'pedrasDaRecordacao',
] as const;
export type CampoDeAjuste = (typeof CAMPOS_DE_AJUSTE)[number];

export const NOME_DO_CAMPO: Readonly<Record<CampoDeAjuste, string>> = {
  ouro: 'Ouro',
  diamantes: 'Diamantes',
  fragmentosAlma: 'Fragmentos de alma',
  essenciaHabilidade: 'Essência de habilidade',
  fragmentosAscensao: 'Fragmentos de ascensão',
  xp: 'XP',
  seloDesgastado: 'Selo Desgastado',
  seloEncantado: 'Selo Encantado',
  seloEternidade: 'Selo da Eternidade',
  seloOrigem: 'Selo da Origem',
  fragmentosDeMemoria: 'Fragmentos de Memória',
  pedrasDaRecordacao: 'Pedras da Recordação',
};

/** Os campos dos colecionáveis (Buscar): não são moedas com extrato, mudam direto no personagem. */
export const CAMPOS_DOS_COLECIONAVEIS = {
  seloDesgastado: { selo: 'desgastado' },
  seloEncantado: { selo: 'encantado' },
  seloEternidade: { selo: 'eternidade' },
  seloOrigem: { selo: 'origem' },
  fragmentosDeMemoria: { saldo: 'fragmentosDeMemoria' },
  pedrasDaRecordacao: { saldo: 'pedrasDaRecordacao' },
} as const;
export type CampoDosColecionaveis = keyof typeof CAMPOS_DOS_COLECIONAVEIS;
export const ehCampoDosColecionaveis = (c: string): c is CampoDosColecionaveis => c in CAMPOS_DOS_COLECIONAVEIS;

/** Limite de variação por pedido (em valor absoluto): evita erro de digitação virar milhões. */
export const LIMITE_POR_CAMPO: Readonly<Record<CampoDeAjuste, number>> = {
  ouro: 1_000_000,
  diamantes: 10_000,
  fragmentosAlma: 10_000,
  essenciaHabilidade: 10_000,
  fragmentosAscensao: 10_000,
  xp: 1_000_000,
  seloDesgastado: 10_000,
  seloEncantado: 10_000,
  seloEternidade: 10_000,
  seloOrigem: 10_000,
  fragmentosDeMemoria: 100_000,
  pedrasDaRecordacao: 10_000,
};

export const LIMITE_DE_MATERIAL_POR_PEDIDO = 1_000;
export const MAXIMO_DE_MATERIAIS_POR_PEDIDO = 20;

export function ehCampoDeAjuste(valor: string): valor is CampoDeAjuste {
  return (CAMPOS_DE_AJUSTE as readonly string[]).includes(valor);
}
