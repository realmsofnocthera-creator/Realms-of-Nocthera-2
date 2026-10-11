import type { CharacterDocument } from '@/server/characterService';
import { GAME_CONFIG } from '@/rules/config';
import { SUBCLASSES } from '@/rules/subclasses';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';
import {
  ESPACO_DO_SLOT,
  TIER_POR_ESPACO_HABILIDADE,
  custoDoTier,
} from '@/rules/subclasseTiers';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';

/** Lógica pura da Tela de Subclasse (2.1.5): estado, ações, custos e o que cada espaço mostra. */

export type EstadoSubclasse = 'bloqueadaPorNivel' | 'disponivel' | 'ativa';
export type ModoTela = 'escolha' | 'evolucao';
export type TipoAcaoSubclasse = 'desbloquear' | 'subirTier' | 'resetar';

export interface AcaoSubclasse {
  tipo: TipoAcaoSubclasse;
  rotulo: string;
  custo: { ouro: number; fragmentosAlma: number; fragmentosSubclasse: number; diamantes: number };
  /** Recursos que faltam (vazio = pode pagar). */
  faltando: string[];
  habilitada: boolean;
}

/** Cada personagem tem uma subclasse só: sem ela aparece a escolha; com ela, a evolução por tiers. */
export function modoDaTela(char: Pick<CharacterDocument, 'subclasseAtualId'>): ModoTela {
  return char.subclasseAtualId ? 'evolucao' : 'escolha';
}

export function tierDaSubclasse(char: Pick<CharacterDocument, 'subclasseTiers'>, subclasseId: string): number | null {
  const t = char.subclasseTiers?.[subclasseId];
  return typeof t === 'number' ? t : null;
}

export function estadoDaSubclasse(
  char: Pick<CharacterDocument, 'nivel' | 'subclasseAtualId'>,
  subclasseId: string
): EstadoSubclasse {
  if (char.subclasseAtualId === subclasseId) return 'ativa';
  if (char.nivel < GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO) return 'bloqueadaPorNivel';
  return 'disponivel';
}

type Recursos = Pick<CharacterDocument, 'ouro' | 'fragmentosAlma' | 'diamantes' | 'fragmentosSubclasse'>;

function montar(
  char: Recursos,
  subclasseId: string,
  tipo: TipoAcaoSubclasse,
  rotulo: string,
  c: Partial<AcaoSubclasse['custo']>
): AcaoSubclasse {
  const custo = { ouro: 0, fragmentosAlma: 0, fragmentosSubclasse: 0, diamantes: 0, ...c };
  const f: string[] = [];
  if ((char.ouro ?? 0) < custo.ouro) f.push('ouro');
  if ((char.fragmentosAlma ?? 0) < custo.fragmentosAlma) f.push('fragmentos de alma');
  if ((char.diamantes ?? 0) < custo.diamantes) f.push('diamantes');
  if ((char.fragmentosSubclasse?.[subclasseId] ?? 0) < custo.fragmentosSubclasse) f.push('fragmentos da subclasse');
  return { tipo, rotulo, custo, faltando: f, habilitada: f.length === 0 };
}

/** Tela de escolha: botão Desbloquear (tier 0) de cada subclasse, ou o aviso de nível. */
export function acaoDeEscolha(
  char: Pick<CharacterDocument, 'nivel'> & Recursos,
  subclasseId: string
): { acao: AcaoSubclasse | null; aviso: string | null } {
  if (char.nivel < GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO) {
    return { acao: null, aviso: `Disponível a partir do nível ${GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO}` };
  }
  return { acao: montar(char, subclasseId, 'desbloquear', 'Desbloquear', custoDoTier(0)), aviso: null };
}

export type EstadoDoTier = 'comprado' | 'proximo' | 'bloqueado';
export interface TierDaLinha {
  tier: number;
  estado: EstadoDoTier;
  espaco: 'passiva' | ChaveEspaco;
  rotulo: string;
}

const ESPACO_DO_TIER: Record<number, TierDaLinha['espaco']> = { 1: 'passiva', 2: 'basico', 3: 'especial', 4: 'ultimate' };
const ROTULO_DO_ESPACO: Record<TierDaLinha['espaco'], string> = {
  passiva: 'Passiva',
  basico: 'Ataque básico',
  especial: 'Habilidade especial',
  ultimate: 'Ultimate',
};

/** A linha T1 a T4 da tela de evolução (o tier 0 é a escolha da subclasse). */
export function linhaDeTiers(char: Pick<CharacterDocument, 'subclasseTiers' | 'subclasseAtualId'>): TierDaLinha[] {
  const atual = char.subclasseAtualId ? tierDaSubclasse(char, char.subclasseAtualId) ?? 0 : 0;
  return [1, 2, 3, 4].map((tier) => ({
    tier,
    estado: tier <= atual ? 'comprado' : tier === atual + 1 ? 'proximo' : 'bloqueado',
    espaco: ESPACO_DO_TIER[tier],
    rotulo: ROTULO_DO_ESPACO[ESPACO_DO_TIER[tier]],
  }));
}

/** Botão do tier selecionado: só o próximo tier pode ser comprado. */
export function acaoDoTier(
  char: Pick<CharacterDocument, 'subclasseTiers' | 'subclasseAtualId'> & Recursos,
  tier: number
): { acao: AcaoSubclasse | null; aviso: string | null } {
  const sub = char.subclasseAtualId;
  const atual = sub ? tierDaSubclasse(char, sub) ?? 0 : 0;
  if (!sub) return { acao: null, aviso: 'Escolha uma subclasse' };
  if (tier <= atual) return { acao: null, aviso: 'Comprado' };
  if (tier > atual + 1) return { acao: null, aviso: `Compre o tier ${tier - 1} antes` };
  return { acao: montar(char, sub, 'subirTier', `Subir para o tier ${tier}`, custoDoTier(tier)), aviso: null };
}

/** Resetar a subclasse custa 100 diamantes e zera os tiers. */
export function acaoDeReset(char: Pick<CharacterDocument, 'subclasseAtualId'> & Recursos): AcaoSubclasse | null {
  if (!char.subclasseAtualId) return null;
  return montar(char, char.subclasseAtualId, 'resetar', 'Resetar subclasse', {
    diamantes: GAME_CONFIG.SUBCLASSE_CUSTO_RESET_DIAMANTES,
  });
}

export type ChaveEspaco = 'basico' | 'especial' | 'ultimate';
export const ESPACOS_DO_KIT: readonly { slot: SlotHabilidade; espaco: ChaveEspaco }[] = [
  { slot: 'ataqueBasico', espaco: ESPACO_DO_SLOT.ataqueBasico },
  { slot: 'habilidadeEspecial', espaco: ESPACO_DO_SLOT.habilidadeEspecial },
  { slot: 'ultimate', espaco: ESPACO_DO_SLOT.ultimate },
];

/** A habilidade de kit pode ser escolhida: subclasse ativa e tier do espaço comprado. */
export function habilidadeDoKitLiberada(
  char: Pick<CharacterDocument, 'subclasseTiers' | 'subclasseAtualId'>,
  subclasseId: string,
  espaco: ChaveEspaco
): boolean {
  if (char.subclasseAtualId !== subclasseId) return false;
  return (tierDaSubclasse(char, subclasseId) ?? 0) >= TIER_POR_ESPACO_HABILIDADE[espaco];
}

/** A passiva da subclasse vale a partir do tier 1. */
export function passivaDaSubclasseLiberada(
  char: Pick<CharacterDocument, 'subclasseTiers'>,
  subclasseId: string
): boolean {
  return (tierDaSubclasse(char, subclasseId) ?? -1) >= 1;
}

export interface BonusDeAtributoTela {
  atributo: keyof NonNullable<(typeof SUBCLASSES)[number]['bonusAtributos']>;
  valor: number;
}

/** Atributos que a subclasse soma (só os maiores que zero), em ordem decrescente. */
export function bonusDeAtributosDaSubclasse(subclasseId: string): BonusDeAtributoTela[] {
  const sub = SUBCLASSES.find((s) => s.id === subclasseId);
  if (!sub) return [];
  return (Object.entries(sub.bonusAtributos) as [BonusDeAtributoTela['atributo'], number][])
    .filter(([, v]) => v > 0)
    .map(([atributo, valor]) => ({ atributo, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function textoDaSubclasse(subclasseId: string) {
  return TEXTOS_SUBCLASSE[subclasseId];
}
