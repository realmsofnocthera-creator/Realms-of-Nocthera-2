import type { EmblemaRaridade } from '@/rules/emblemas';
import type { MembroDaParty } from '@/rules/testeEquipe';

/** Lógica da tela do Teste de Equipe (feixes da party, quem pode iniciar e a raridade mais alta de cada dificuldade), sem React. */

const ORDEM_DAS_RARIDADES: readonly EmblemaRaridade[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'];

/** O índice (0 a 5) da raridade mais alta que a dificuldade pode dar: 0 = só comuns, 5 = até míticas. */
export function maiorRaridadeDaDificuldade(raridades: readonly { raridade: EmblemaRaridade }[]): number {
  return raridades.reduce((m, r) => Math.max(m, ORDEM_DAS_RARIDADES.indexOf(r.raridade)), 0);
}

/**
 * Os dois feixes entre os três altares: o primeiro liga o 1º ao 2º e o segundo, o 2º ao 3º. Cada um acende quando os dois membros dele
 * estão na party e prontos.
 */
export function segmentosDoFeixe(membros: readonly Pick<MembroDaParty, 'pronto'>[]): [boolean, boolean] {
  return [!!membros[0]?.pronto && !!membros[1]?.pronto, !!membros[1]?.pronto && !!membros[2]?.pronto];
}

export interface CondicoesParaIniciar {
  souLider: boolean;
  membros: number;
  todosProntos: boolean;
  liberada: boolean;
  custo: 'chave' | 'selo';
  /** As chaves do líder (grátis do dia mais as guardadas) e os selos do abismo dele. */
  chaves: number;
  selos: number;
}

/** O líder pode iniciar quando há pelo menos 2 na party, todos prontos, a dificuldade está aberta e ele tem a chave (ou o selo). */
export function podeIniciar(c: CondicoesParaIniciar): boolean {
  if (!c.souLider || c.membros < 2 || !c.todosProntos || !c.liberada) return false;
  return c.custo === 'selo' ? c.selos > 0 : c.chaves > 0;
}
