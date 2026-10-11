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

export type EstadoSubclasse = 'bloqueadaPorNivel' | 'naoDesbloqueada' | 'desbloqueada' | 'ativa';
export type TipoAcaoSubclasse = 'desbloquear' | 'ativar' | 'subirTier';

export interface AcaoSubclasse {
  tipo: TipoAcaoSubclasse;
  rotulo: string;
  custo: { ouro: number; fragmentosAlma: number; fragmentosSubclasse: number; diamantes: number };
  /** Recursos que faltam (vazio = pode pagar). */
  faltando: string[];
  habilitada: boolean;
}

export interface AcoesSubclasse {
  estado: EstadoSubclasse;
  tier: number | null;
  principal: AcaoSubclasse | null;
  /** Subclasse já desbloqueada e que não é a ativa: pode ativar (diamantes) além de subir de tier. */
  secundaria: AcaoSubclasse | null;
  /** Motivo de não haver ação principal (nível baixo ou tier máximo). */
  aviso: string | null;
}

export function tierDaSubclasse(char: Pick<CharacterDocument, 'subclasseTiers'>, subclasseId: string): number | null {
  const t = char.subclasseTiers?.[subclasseId];
  return typeof t === 'number' ? t : null;
}

export function estadoDaSubclasse(
  char: Pick<CharacterDocument, 'nivel' | 'subclasseTiers' | 'subclasseAtualId'>,
  subclasseId: string
): EstadoSubclasse {
  if (char.subclasseAtualId === subclasseId) return 'ativa';
  if (tierDaSubclasse(char, subclasseId) !== null) return 'desbloqueada';
  if (char.nivel < GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO) return 'bloqueadaPorNivel';
  return 'naoDesbloqueada';
}

function faltando(
  char: Pick<CharacterDocument, 'ouro' | 'fragmentosAlma' | 'diamantes' | 'fragmentosSubclasse'>,
  subclasseId: string,
  custo: AcaoSubclasse['custo']
): string[] {
  const f: string[] = [];
  if ((char.ouro ?? 0) < custo.ouro) f.push('ouro');
  if ((char.fragmentosAlma ?? 0) < custo.fragmentosAlma) f.push('fragmentos de alma');
  if ((char.diamantes ?? 0) < custo.diamantes) f.push('diamantes');
  if ((char.fragmentosSubclasse?.[subclasseId] ?? 0) < custo.fragmentosSubclasse) f.push('fragmentos da subclasse');
  return f;
}

export function acoesDaSubclasse(
  char: Pick<
    CharacterDocument,
    'nivel' | 'ouro' | 'fragmentosAlma' | 'diamantes' | 'fragmentosSubclasse' | 'subclasseTiers' | 'subclasseAtualId'
  >,
  subclasseId: string
): AcoesSubclasse {
  const estado = estadoDaSubclasse(char, subclasseId);
  const tier = tierDaSubclasse(char, subclasseId);
  const montar = (tipo: TipoAcaoSubclasse, rotulo: string, c: Partial<AcaoSubclasse['custo']>): AcaoSubclasse => {
    const custo = { ouro: 0, fragmentosAlma: 0, fragmentosSubclasse: 0, diamantes: 0, ...c };
    const f = faltando(char, subclasseId, custo);
    return { tipo, rotulo, custo, faltando: f, habilitada: f.length === 0 };
  };

  if (estado === 'bloqueadaPorNivel') {
    return { estado, tier, principal: null, secundaria: null, aviso: `Disponível a partir do nível ${GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO}` };
  }
  if (estado === 'naoDesbloqueada') {
    const c = custoDoTier(0);
    return { estado, tier, principal: montar('desbloquear', 'Desbloquear', c), secundaria: null, aviso: null };
  }

  const ativar = estado === 'desbloqueada' ? montar('ativar', 'Ativar', { diamantes: GAME_CONFIG.SUBCLASSE_CUSTO_TROCA_DIAMANTES }) : null;
  if ((tier ?? 0) >= GAME_CONFIG.SUBCLASSE_TIER_MAX) {
    return { estado, tier, principal: null, secundaria: ativar, aviso: 'Tier máximo' };
  }
  const proximo = (tier ?? 0) + 1;
  return {
    estado,
    tier,
    principal: montar('subirTier', `Subir para o tier ${proximo}`, custoDoTier(proximo)),
    secundaria: ativar,
    aviso: null,
  };
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
