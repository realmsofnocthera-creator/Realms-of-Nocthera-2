import { ICONES_DOS_SELOS } from '@/assets/buscarUi';
import { ICONES_DAS_MOEDAS } from '@/assets/colecaoUi';
import { HUD_ICONS } from '@/assets/hud';
import { BAU_PEQUENO, INGRESSO, MOEDAS_DE_OURO } from '@/assets/checkinUi';

/** Lógica do Check-in: o ícone de cada dia do calendário, a partir do texto da recompensa que o servidor manda. */

/** O ícone da recompensa principal (a primeira linha): ouro, Diamantes, selo, memória, pedra ou avanço de expedição. */
export function iconeDaRecompensa(linhas: readonly string[]): string {
  const t = (linhas[0] ?? '').toLowerCase();
  if (t.includes('diamante')) return HUD_ICONS.diamante;
  if (t.includes('ouro')) return MOEDAS_DE_OURO;
  if (t.includes('desgastado')) return ICONES_DOS_SELOS.desgastado;
  if (t.includes('encantado')) return ICONES_DOS_SELOS.encantado;
  if (t.includes('eternidade')) return ICONES_DOS_SELOS.eternidade;
  if (t.includes('origem')) return ICONES_DOS_SELOS.origem;
  if (t.includes('fragmento')) return ICONES_DAS_MOEDAS.fragmento;
  if (t.includes('pedra')) return ICONES_DAS_MOEDAS.pedra;
  if (t.includes('avanço') || t.includes('avanco')) return INGRESSO;
  return BAU_PEQUENO;
}
