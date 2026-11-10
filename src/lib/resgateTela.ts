import { BAU_DE_EMBLEMAS, BAU_DOURADO, BRASAO_DE_EMBLEMA, ICONES_DAS_ABAS_DO_RESGATE } from '@/assets/resgateUi';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { ICONES_DAS_MOEDAS } from '@/assets/colecaoUi';
import { ICONES_DOS_SELOS } from '@/assets/buscarUi';
import { arteDaCarta } from '@/assets/cartasDaAlma';
import { HUD_ICONS } from '@/assets/hud';
import type { MoedaDaLoja, ProdutoDaLoja } from '@/rules/loja';

/** Lógica da tela do Resgate (a loja de ouro): o ícone de cada produto e da moeda, sem React. */

export type IconeDoProduto = { tipo: 'imagem'; src: string } | { tipo: 'material' };

const ICONE_DO_RECURSO: Readonly<Record<string, string>> = {
  'selo:desgastado': ICONES_DOS_SELOS.desgastado,
  'selo:encantado': ICONES_DOS_SELOS.encantado,
  'selo:eternidade': ICONES_DOS_SELOS.eternidade,
  'selo:origem': ICONES_DOS_SELOS.origem,
  fragmentosDeMemoria: ICONES_DAS_MOEDAS.fragmento,
  pedrasDaRecordacao: ICONES_DAS_MOEDAS.pedra,
  poeiraDeAlma: ICONES_DAS_MOEDAS.poeira,
  cacosDeAlma: ICONES_DAS_MOEDAS.cacos,
  fragmentosAlma: ICONES_DE_SALDO.fragmentosAlma,
  essenciaHabilidade: ICONES_DE_SALDO.essenciaHabilidade,
  fragmentosAscensao: ICONES_DE_SALDO.fragmentosAscensao,
};

export function iconeDoProduto(p: Pick<ProdutoDaLoja, 'tipo' | 'id' | 'aba'>): IconeDoProduto {
  switch (p.tipo) {
    case 'material':
      return { tipo: 'material' };
    case 'recurso':
      return { tipo: 'imagem', src: ICONE_DO_RECURSO[p.id] ?? ICONES_DAS_ABAS_DO_RESGATE.recursos };
    case 'carta':
      return { tipo: 'imagem', src: arteDaCarta(p.id) ?? ICONES_DAS_ABAS_DO_RESGATE.cartas };
    case 'emblema':
      return { tipo: 'imagem', src: BRASAO_DE_EMBLEMA };
    case 'escolhaCarta':
      return { tipo: 'imagem', src: BAU_DOURADO };
    case 'escolhaEmblema':
      return { tipo: 'imagem', src: BAU_DE_EMBLEMAS };
  }
}

export const ICONE_DA_MOEDA: Readonly<Record<MoedaDaLoja, string>> = {
  ouro: HUD_ICONS.ouro,
  diamantes: HUD_ICONS.diamante,
  essenciaDeSoberano: ICONES_DE_SALDO.essenciaDeSoberano,
};

export const NOME_DA_MOEDA: Readonly<Record<MoedaDaLoja, string>> = { ouro: 'Ouro', diamantes: 'Diamantes', essenciaDeSoberano: 'Essência de Soberano' };
