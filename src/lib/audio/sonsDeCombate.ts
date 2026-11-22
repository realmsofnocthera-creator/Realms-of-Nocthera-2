import type { AcaoDaLuta } from '@/lib/cacadaReplay';
import type { IdDeSom } from '@/rules/audio';

/**
 * Os sons de um golpe, no momento do impacto (puro, sem navegador). Elemento manda no som do golpe; sem elemento, o tipo de dano da arma
 * (corte, perfuração, contusão). Golpe que não causou dano soa como bloqueio (quando o monstro ataca) ou como erro (quando o herói ataca).
 */
export function sonsDaAcao(acao: AcaoDaLuta): IdDeSom[] {
  const sons: IdDeSom[] = [];
  const doHeroi = acao.de === 'jogador';
  if (acao.bloqueado || acao.dano <= 0) {
    if (acao.cura > 0) return ['sfx_cura'];
    return [doHeroi ? 'sfx_falha_errou' : 'sfx_escudo_bloqueio'];
  }
  if (doHeroi) {
    if (acao.elemento) sons.push(`elem_${acao.elemento}_impacto` as IdDeSom);
    else if (acao.tipoGolpe === 'perfuracao') sons.push('sfx_lanca_golpe', 'sfx_impacto_carne_2');
    else if (acao.tipoGolpe === 'contusao') sons.push('sfx_martelo_golpe', 'sfx_impacto_carne_3');
    else if (acao.tipoGolpe === 'magico') sons.push('sfx_cajado_golpe');
    else sons.push('sfx_espada_golpe', 'sfx_impacto_carne_1');
    if (acao.criticos > 0) sons.push('sfx_dano_critico');
    if (acao.reacao === 'resistencia') sons.push('sfx_resistencia');
    if (acao.reacao === 'imune') sons.push('sfx_imunidade');
  } else {
    if (acao.elemento) sons.push(`elem_${acao.elemento}_impacto` as IdDeSom);
    sons.push(acao.criticos > 0 || acao.dano > 0 && acao.golpes.length > 1 ? 'sfx_dano_recebido_pesado' : 'sfx_dano_recebido_leve');
  }
  if (acao.cura > 0) sons.push('sfx_cura');
  return sons;
}
