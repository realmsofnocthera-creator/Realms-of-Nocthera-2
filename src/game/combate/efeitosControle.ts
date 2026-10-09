import { EFEITOS_STATUS, EfeitoStatus, STATUS_QUE_CHEFES_RESISTEM } from '@/rules/statusEffects';
import { adicionarDebuffs, AplicacaoDebuff, DebuffAtivo } from './efeitosDebuffs';

/**
 * Bloco C (1.6.2) — status de controle: Congelamento, Sono, Loucura e Paralisia
 * (a Maldição é dano instantâneo e passa pelo mesmo caminho do Sangramento).
 * Cada um é aplicado no alvo como debuffs (perder ações, lentidão); o dano imediato é calculado por quem aplica.
 */
export interface AlvoDeStatus {
  debuffs?: DebuffAtivo[];
  /** Status a que o alvo é imune (chefes: Sono, Paralisia e Congelamento). */
  imunidadesStatus?: readonly EfeitoStatus[];
}

export function imunidadesDeChefe(): readonly EfeitoStatus[] {
  return STATUS_QUE_CHEFES_RESISTEM;
}

export function estaImuneAoStatus(alvo: AlvoDeStatus, efeito: EfeitoStatus): boolean {
  return (alvo.imunidadesStatus ?? []).includes(efeito);
}

/** Coloca no alvo os debuffs do status de controle. Não calcula o dano imediato (percentualHpMax). */
export function aplicarEfeitoControle(alvo: AlvoDeStatus, efeito: EfeitoStatus): void {
  const def = EFEITOS_STATUS[efeito];
  const aplicacoes: AplicacaoDebuff[] = [];
  if (def.incapacitaAcoes) {
    // Sono e Loucura são debuffs de mesmo nome do status
    aplicacoes.push({ tipo: efeito === 'sono' ? 'sono' : 'loucura', acoes: def.incapacitaAcoes });
  }
  if (def.incapacitaAteSerAtingido) {
    aplicacoes.push({ tipo: 'paralisia' });
  }
  if (def.lentidao) {
    aplicacoes.push({
      tipo: 'lentidao',
      percentual: def.lentidao.percentual,
      rodadas: def.lentidao.rodadas,
      origem: 'congelamento',
    });
  }
  alvo.debuffs = adicionarDebuffs(alvo.debuffs, aplicacoes);
}
