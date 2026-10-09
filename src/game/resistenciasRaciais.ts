import { getRaceById } from '@/rules/races';
import { EFEITOS_STATUS, EfeitoStatus } from '@/rules/statusEffects';

/**
 * Roadmap 1.4 — Resistências raciais.
 * - Dano recebido por tipo (físico/mágico): até 5% por raça, vindo de `resistencias` da raça; soma com os demais bônus (teto de 80%).
 * - A passiva Resistência Ancestral do Anão (1.4.2) soma a própria porcentagem ao dano físico recebido.
 * - Resistência a status (1.4.3): reduz a CHANCE de ativação (não a duração). O Anão resiste a status físicos.
 * - A resistência ao Sombrio do Vampiro é elemental e continua em `obterModificadoresRaciais`.
 */
export interface ResistenciasRaciais {
  danoFisicoPercentual: number;
  danoMagicoPercentual: number;
  chanceStatusFisicoPercentual: number;
  chanceStatusMagicoPercentual: number;
}

const SEM_RESISTENCIA: ResistenciasRaciais = {
  danoFisicoPercentual: 0,
  danoMagicoPercentual: 0,
  chanceStatusFisicoPercentual: 0,
  chanceStatusMagicoPercentual: 0,
};

export function obterResistenciasRaciais(racaId: string | undefined): ResistenciasRaciais {
  const raca = racaId ? getRaceById(racaId) : undefined;
  if (!raca) {
    return SEM_RESISTENCIA;
  }
  const res = { ...SEM_RESISTENCIA };
  for (const r of raca.resistencias ?? []) {
    if (typeof r.valor !== 'number') continue;
    if (r.tipo === 'danoFisico') res.danoFisicoPercentual += r.valor;
    if (r.tipo === 'danoMagico') res.danoMagicoPercentual += r.valor;
  }
  if (raca.passivaRacial.efeito === 'resistenciaEfeitosFisicos') {
    res.danoFisicoPercentual += raca.passivaRacial.valor;
    res.chanceStatusFisicoPercentual += raca.passivaRacial.valor;
  }
  return res;
}

/** Redução (%) da chance de ativação de um status para uma raça. */
export function reducaoChanceStatusRacial(racaId: string | undefined, efeito: EfeitoStatus): number {
  const res = obterResistenciasRaciais(racaId);
  return EFEITOS_STATUS[efeito].natureza === 'fisico'
    ? res.chanceStatusFisicoPercentual
    : res.chanceStatusMagicoPercentual;
}
