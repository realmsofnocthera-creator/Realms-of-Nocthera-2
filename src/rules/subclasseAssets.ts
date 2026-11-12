/**
 * Artes da Tela de Subclasse (2.1.5). Toda habilidade e passiva de subclasse sem arte própria usa a imagem base.
 * Para trocar, basta registrar o caminho em ICONES_HABILIDADE_SUBCLASSE (chave = id da habilidade ou da passiva)
 * e em BANNERS_SUBCLASSE (chave = id da subclasse).
 */
export const SUBCLASSE_ICONE_BASE = '/icons/skills/subclasses/base.webp';

/** Os 48 ícones das habilidades das 12 subclasses (folhas do Yuri, 256 x 256 com fundo transparente). */
export const ICONES_HABILIDADE_SUBCLASSE: Readonly<Record<string, string>> = {
  sacerdote_aura_sagrada: '/icons/skills/subclasses/sacerdote_aura_sagrada.webp',
  sacerdote_toque_sagrado: '/icons/skills/subclasses/sacerdote_toque_sagrado.webp',
  sacerdote_prece_de_cura: '/icons/skills/subclasses/sacerdote_prece_de_cura.webp',
  sacerdote_graca_redentora: '/icons/skills/subclasses/sacerdote_graca_redentora.webp',
  inquisidor_olhar_julgador: '/icons/skills/subclasses/inquisidor_olhar_julgador.webp',
  inquisidor_sentenca: '/icons/skills/subclasses/inquisidor_sentenca.webp',
  inquisidor_fogo_sagrado: '/icons/skills/subclasses/inquisidor_fogo_sagrado.webp',
  inquisidor_julgamento_final: '/icons/skills/subclasses/inquisidor_julgamento_final.webp',
  assassino_instinto_letal: '/icons/skills/subclasses/assassino_instinto_letal.webp',
  assassino_estocada_furtiva: '/icons/skills/subclasses/assassino_estocada_furtiva.webp',
  assassino_golpe_nas_sombras: '/icons/skills/subclasses/assassino_golpe_nas_sombras.webp',
  assassino_execucao_silenciosa: '/icons/skills/subclasses/assassino_execucao_silenciosa.webp',
  duelista_postura_de_duelo: '/icons/skills/subclasses/duelista_postura_de_duelo.webp',
  duelista_estocada_dupla: '/icons/skills/subclasses/duelista_estocada_dupla.webp',
  duelista_finta: '/icons/skills/subclasses/duelista_finta.webp',
  duelista_duelo_final: '/icons/skills/subclasses/duelista_duelo_final.webp',
  arquimago_poder_arcano: '/icons/skills/subclasses/arquimago_poder_arcano.webp',
  arquimago_bola_de_fogo: '/icons/skills/subclasses/arquimago_bola_de_fogo.webp',
  arquimago_tempestade_de_raios: '/icons/skills/subclasses/arquimago_tempestade_de_raios.webp',
  arquimago_meteoro: '/icons/skills/subclasses/arquimago_meteoro.webp',
  sabio_arcano_sabedoria_arcana: '/icons/skills/subclasses/sabio_arcano_sabedoria_arcana.webp',
  sabio_arcano_lanca_de_gelo: '/icons/skills/subclasses/sabio_arcano_lanca_de_gelo.webp',
  sabio_arcano_feitico_do_torpor: '/icons/skills/subclasses/sabio_arcano_feitico_do_torpor.webp',
  sabio_arcano_eclipse_da_mente: '/icons/skills/subclasses/sabio_arcano_eclipse_da_mente.webp',
  vanguarda_linha_de_frente: '/icons/skills/subclasses/vanguarda_linha_de_frente.webp',
  vanguarda_estocada_da_vanguarda: '/icons/skills/subclasses/vanguarda_estocada_da_vanguarda.webp',
  vanguarda_carga_esmagadora: '/icons/skills/subclasses/vanguarda_carga_esmagadora.webp',
  vanguarda_estandarte_de_guerra: '/icons/skills/subclasses/vanguarda_estandarte_de_guerra.webp',
  bastiao_fortaleza_viva: '/icons/skills/subclasses/bastiao_fortaleza_viva.webp',
  bastiao_golpe_de_escudo: '/icons/skills/subclasses/bastiao_golpe_de_escudo.webp',
  bastiao_muralha_inabalavel: '/icons/skills/subclasses/bastiao_muralha_inabalavel.webp',
  bastiao_ultimo_juramento: '/icons/skills/subclasses/bastiao_ultimo_juramento.webp',
  kensei_lamina_perfeita: '/icons/skills/subclasses/kensei_lamina_perfeita.webp',
  kensei_corte_perfeito: '/icons/skills/subclasses/kensei_corte_perfeito.webp',
  kensei_lamina_desembainhada: '/icons/skills/subclasses/kensei_lamina_desembainhada.webp',
  kensei_corte_decisivo: '/icons/skills/subclasses/kensei_corte_decisivo.webp',
  ronin_passo_livre: '/icons/skills/subclasses/ronin_passo_livre.webp',
  ronin_corte_relampago: '/icons/skills/subclasses/ronin_corte_relampago.webp',
  ronin_danca_da_lamina_solitaria: '/icons/skills/subclasses/ronin_danca_da_lamina_solitaria.webp',
  ronin_quatro_ventos: '/icons/skills/subclasses/ronin_quatro_ventos.webp',
  berserker_frenesi: '/icons/skills/subclasses/berserker_frenesi.webp',
  berserker_golpe_desenfreado: '/icons/skills/subclasses/berserker_golpe_desenfreado.webp',
  berserker_investida_sangrenta: '/icons/skills/subclasses/berserker_investida_sangrenta.webp',
  berserker_desvario_final: '/icons/skills/subclasses/berserker_desvario_final.webp',
  colosso_casca_de_pedra: '/icons/skills/subclasses/colosso_casca_de_pedra.webp',
  colosso_golpe_esmagador: '/icons/skills/subclasses/colosso_golpe_esmagador.webp',
  colosso_impacto_sismico: '/icons/skills/subclasses/colosso_impacto_sismico.webp',
  colosso_furia_do_colosso: '/icons/skills/subclasses/colosso_furia_do_colosso.webp',
};

export const BANNERS_SUBCLASSE: Readonly<Record<string, string>> = {};

export function iconeDaHabilidadeSubclasse(id: string): string {
  return ICONES_HABILIDADE_SUBCLASSE[id] ?? SUBCLASSE_ICONE_BASE;
}

export function bannerDaSubclasse(subclasseId: string): string | null {
  return BANNERS_SUBCLASSE[subclasseId] ?? null;
}

/** Cor de destaque de cada classe (banner provisório, sem arte). */
export const COR_DA_CLASSE: Readonly<Record<string, string>> = {
  barbaro: '#8B1A1A',
  cavaleiro: '#A67C1E',
  samurai: '#9B2335',
  bandido: '#6E1D2A',
  profeta: '#C9A53A',
  feiticeiro: '#5E3A99',
};
