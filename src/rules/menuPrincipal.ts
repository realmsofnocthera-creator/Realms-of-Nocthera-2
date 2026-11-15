export type MenuPrincipalId =
  | 'conquistas'
  | 'colecao'
  | 'buscar'
  | 'producao'
  | 'mochila'
  | 'resgate'
  | 'ranking'
  | 'checkin'
  | 'anuncios'
  | 'bestiario'
  | 'leilao';

export type MenuPrincipalAssetKey =
  | 'menu-conquistas'
  | 'menu-colecao'
  | 'menu-buscar'
  | 'menu-producao'
  | 'menu-mochila'
  | 'menu-resgate'
  | 'menu-ranking'
  | 'menu-checkin'
  | 'menu-anuncios'
  | 'menu-bestiario'
  | 'menu-leilao';

export interface MenuPrincipalItem {
  id: MenuPrincipalId;
  nome: string;
  assetKey: MenuPrincipalAssetKey;
}

export const MENU_PRINCIPAL: readonly MenuPrincipalItem[] = [
  {
    id: 'conquistas',
    nome: 'Conquistas',
    assetKey: 'menu-conquistas',
  },
  {
    id: 'colecao',
    nome: 'Coleção',
    assetKey: 'menu-colecao',
  },
  {
    id: 'buscar',
    nome: 'Buscar',
    assetKey: 'menu-buscar',
  },
  {
    id: 'producao',
    nome: 'Produção',
    assetKey: 'menu-producao',
  },
  {
    id: 'mochila',
    nome: 'Mochila',
    assetKey: 'menu-mochila',
  },
  {
    id: 'resgate',
    nome: 'Resgate',
    assetKey: 'menu-resgate',
  },
  {
    id: 'ranking',
    nome: 'Ranking',
    assetKey: 'menu-ranking',
  },
  {
    id: 'checkin',
    nome: 'Check-in',
    assetKey: 'menu-checkin',
  },
  {
    id: 'anuncios',
    nome: 'Anúncios',
    assetKey: 'menu-anuncios',
  },
  {
    id: 'bestiario',
    nome: 'Bestiário',
    assetKey: 'menu-bestiario',
  },
  {
    id: 'leilao',
    nome: 'Leilão',
    assetKey: 'menu-leilao',
  },
] as const;
