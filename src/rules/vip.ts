/**
 * Sistema VIP (8.5, decidido pelo Yuri em 27/10/2026). Cada real gasto de verdade no jogo soma ao gasto acumulado e o
 * nível VIP (0 a 10) sai desse gasto. Os bônus percentuais de XP e de ouro SUBSTITUEM os do nível anterior (não
 * acumulam). Só compras com dinheiro real contam; compra estornada deixa de contar e o nível é recalculado.
 * Os valores em reais são guardados em centavos (inteiros).
 */

export type EstadoDoBeneficio = 'ativo' | 'emBreve';

export interface BeneficioDoVip {
  texto: string;
  /** "emBreve": a mecânica ou a arte ainda não existe; o benefício aparece na tabela mas ainda não é entregue. */
  estado: EstadoDoBeneficio;
}

export interface NivelDoVip {
  nivel: number;
  nome: string;
  /** Gasto acumulado que abre o nível, em centavos. */
  gastoCentavos: number;
  /** Bônus de XP (%) e de ouro (%) nos ganhos de combate. */
  xp: number;
  ouro: number;
  /** Ouro que chega todo dia pelo Correio (do nível 1 em diante). */
  ouroDiario: number;
  /** Os benefícios novos deste nível, além dos percentuais. */
  beneficios: readonly BeneficioDoVip[];
}

export const OURO_DIARIO_DO_VIP = 500;

const ativo = (texto: string): BeneficioDoVip => ({ texto, estado: 'ativo' });
const emBreve = (texto: string): BeneficioDoVip => ({ texto, estado: 'emBreve' });

export const NIVEIS_DO_VIP: readonly NivelDoVip[] = [
  { nivel: 0, nome: 'Errante', gastoCentavos: 0, xp: 0, ouro: 0, ouroDiario: 0, beneficios: [ativo('Acesso padrão.')] },
  {
    nivel: 1,
    nome: 'Iniciado',
    gastoCentavos: 1_000,
    xp: 2,
    ouro: 0,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [ativo(`Recompensa diária de ${OURO_DIARIO_DO_VIP} de ouro pelo Correio.`), emBreve('Moldura VIP.')],
  },
  {
    nivel: 2,
    nome: 'Adepto',
    gastoCentavos: 3_000,
    xp: 3,
    ouro: 3,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [emBreve('Título de perfil exclusivo.'), ativo('+1 chance diária na Provação do Guerreiro (uma extra em cada dificuldade).')],
  },
  {
    nivel: 3,
    nome: 'Discípulo',
    gastoCentavos: 7_500,
    xp: 4,
    ouro: 5,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [ativo('+20 espaços na mochila (cartas, armas e armaduras).'), emBreve('Moldura exclusiva.')],
  },
  { nivel: 4, nome: 'Veterano', gastoCentavos: 15_000, xp: 5, ouro: 7, ouroDiario: OURO_DIARIO_DO_VIP, beneficios: [emBreve('Uma skin de personagem.')] },
  {
    nivel: 5,
    nome: 'Elite',
    gastoCentavos: 30_000,
    xp: 7,
    ouro: 10,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [ativo('+1 tentativa diária de Batalha Sangrenta.'), emBreve('Moldura animada de perfil.')],
  },
  {
    nivel: 6,
    nome: 'Ascendente',
    gastoCentavos: 60_000,
    xp: 8,
    ouro: 12,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [ativo('+1 chave grátis por dia no Teste de Equipe.'), emBreve('Efeito visual exclusivo ao entrar em combate.')],
  },
  {
    nivel: 7,
    nome: 'Exaltado',
    gastoCentavos: 100_000,
    xp: 10,
    ouro: 15,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [emBreve('Emblema exclusivo no chat e na guilda.'), emBreve('Skin exclusiva de personagem.')],
  },
  {
    nivel: 8,
    nome: 'Soberano',
    gastoCentavos: 150_000,
    xp: 12,
    ouro: 18,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [emBreve('Decoração exclusiva para o chat.'), emBreve('Moldura lendária animada.')],
  },
  {
    nivel: 9,
    nome: 'Imortal',
    gastoCentavos: 220_000,
    xp: 13,
    ouro: 20,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [emBreve('Aura exclusiva para o personagem.'), emBreve('Título especial.')],
  },
  {
    nivel: 10,
    nome: 'Transcendente',
    gastoCentavos: 300_000,
    xp: 15,
    ouro: 30,
    ouroDiario: OURO_DIARIO_DO_VIP,
    beneficios: [emBreve('Skin mítica.'), emBreve('Efeito visual especial no perfil.'), emBreve('Moldura e título exclusivos.')],
  },
];

export const NIVEL_MAXIMO_DO_VIP = NIVEIS_DO_VIP[NIVEIS_DO_VIP.length - 1].nivel;

/** O nível de quem gastou `gastoCentavos` (valores inválidos contam como zero). */
export function nivelDoVip(gastoCentavos: unknown): number {
  const gasto = typeof gastoCentavos === 'number' && Number.isFinite(gastoCentavos) ? gastoCentavos : 0;
  let nivel = 0;
  for (const n of NIVEIS_DO_VIP) if (gasto >= n.gastoCentavos) nivel = n.nivel;
  return nivel;
}

export const definicaoDoVip = (nivel: number): NivelDoVip => NIVEIS_DO_VIP[Math.max(0, Math.min(NIVEL_MAXIMO_DO_VIP, Math.floor(nivel)))];

/** O bônus em vigor: o do nível atual, sem somar os dos anteriores. */
export function bonusDoVip(gastoCentavos: unknown): { xp: number; ouro: number } {
  const n = definicaoDoVip(nivelDoVip(gastoCentavos));
  return { xp: n.xp, ouro: n.ouro };
}

export interface ProgressoDoVip {
  nivel: number;
  nome: string;
  gastoCentavos: number;
  /** Null no nível máximo. */
  proximo: { nivel: number; nome: string; faltamCentavos: number } | null;
  /** 0 a 100: o quanto já andou entre o nível atual e o próximo (100 no máximo). */
  percentual: number;
}

export function progressoDoVip(gastoCentavos: unknown): ProgressoDoVip {
  const gasto = typeof gastoCentavos === 'number' && Number.isFinite(gastoCentavos) && gastoCentavos > 0 ? Math.floor(gastoCentavos) : 0;
  const atual = definicaoDoVip(nivelDoVip(gasto));
  const seguinte = NIVEIS_DO_VIP[atual.nivel + 1];
  if (!seguinte) return { nivel: atual.nivel, nome: atual.nome, gastoCentavos: gasto, proximo: null, percentual: 100 };
  const faixa = seguinte.gastoCentavos - atual.gastoCentavos;
  return {
    nivel: atual.nivel,
    nome: atual.nome,
    gastoCentavos: gasto,
    proximo: { nivel: seguinte.nivel, nome: seguinte.nome, faltamCentavos: seguinte.gastoCentavos - gasto },
    percentual: Math.min(100, Math.floor(((gasto - atual.gastoCentavos) / faixa) * 100)),
  };
}

/** Soma o bônus percentual ao valor base (arredondando para baixo), sem mexer em valores zerados. */
export const comBonusPercentual = (base: number, percentual: number) => (base > 0 && percentual > 0 ? base + Math.floor((base * percentual) / 100) : base);

export const formatarReais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------------------------------------------
// Benefícios do VIP que mudam limites (mochila e tentativas diárias)
// ---------------------------------------------------------------------------------------------------------------

/** VIP 3: +20 espaços em cada uma das três mochilas (cartas, armas e armaduras). */
export const NIVEL_DA_MOCHILA_DO_VIP = 3;
export const ESPACOS_EXTRAS_DA_MOCHILA = 20;
export const espacosExtrasDoVip = (gastoCentavos: unknown) => (nivelDoVip(gastoCentavos) >= NIVEL_DA_MOCHILA_DO_VIP ? ESPACOS_EXTRAS_DA_MOCHILA : 0);

/** A partir de que nível o VIP dá +1 tentativa por dia em cada provação. */
export const NIVEL_DA_TENTATIVA_EXTRA = { guerreiro: 2, batalhaSangrenta: 5, testeEquipe: 6 } as const;
export type ProvacaoComTentativaExtra = keyof typeof NIVEL_DA_TENTATIVA_EXTRA;
/** 0 ou 1: as tentativas extras de hoje que o nível dá a essa provação (não acumulam com os níveis de baixo: é sempre +1). */
export const tentativaExtraDoVip = (gastoCentavos: unknown, provacao: ProvacaoComTentativaExtra) => (nivelDoVip(gastoCentavos) >= NIVEL_DA_TENTATIVA_EXTRA[provacao] ? 1 : 0);
