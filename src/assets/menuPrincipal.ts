import { MenuPrincipalAssetKey } from '@/rules/menuPrincipal';
import menuConquistasImg from './images/menu/menu-conquistas.png';
import menuColecaoImg from './images/menu/menu-colecao.webp';
import menuBuscarImg from './images/menu/menu-buscar.jpg';
import menuProducaoImg from './images/menu/menu-producao.jpg';
import menuMochilaImg from './images/menu/menu-mochila.webp';
import menuResgateImg from './images/menu/menu-resgate.jpg';
import menuRankingImg from './images/menu/menu-ranking.jpg';
import menuCheckinImg from './images/menu/menu-checkin.jpg';
import menuAnunciosImg from './images/menu/menu-anuncios.jpg';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const MENU_PRINCIPAL_IMAGES: Record<MenuPrincipalAssetKey, string> = {
  'menu-conquistas': srcDaImagem(menuConquistasImg),
  'menu-colecao': srcDaImagem(menuColecaoImg),
  'menu-buscar': srcDaImagem(menuBuscarImg),
  'menu-producao': srcDaImagem(menuProducaoImg),
  'menu-mochila': srcDaImagem(menuMochilaImg),
  'menu-resgate': srcDaImagem(menuResgateImg),
  'menu-ranking': srcDaImagem(menuRankingImg),
  'menu-checkin': srcDaImagem(menuCheckinImg),
  'menu-anuncios': srcDaImagem(menuAnunciosImg),
};
