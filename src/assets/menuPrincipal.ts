import { MenuPrincipalAssetKey } from '@/rules/menuPrincipal';
import menuConquistasImg from './images/menu/menu-conquistas.png';
import menuColecaoImg from './images/menu/menu-colecao.png';
import menuBuscarImg from './images/menu/menu-buscar.jpg';
import menuProducaoImg from './images/menu/menu-producao.jpg';
import menuMochilaImg from './images/menu/menu-mochila.png';
import menuResgateImg from './images/menu/menu-resgate.jpg';
import menuRankingImg from './images/menu/menu-ranking.jpg';
import menuCheckinImg from './images/menu/menu-checkin.jpg';
import menuAnunciosImg from './images/menu/menu-anuncios.jpg';

type ImportedAsset = string | { src: string };

function resolveAssetSrc(imported: ImportedAsset, fallback: string): string {
  if (!imported) return fallback;
  if (typeof imported === 'string') return imported;
  if (typeof imported === 'object' && typeof imported.src === 'string') {
    return imported.src;
  }
  return fallback;
}

export const MENU_PRINCIPAL_IMAGES: Record<MenuPrincipalAssetKey, string> = {
  'menu-conquistas': resolveAssetSrc(menuConquistasImg, '/images/menu/menu-conquistas.png'),
  'menu-colecao': resolveAssetSrc(menuColecaoImg, '/images/menu/menu-colecao.png'),
  'menu-buscar': resolveAssetSrc(menuBuscarImg, '/images/menu/menu-buscar.jpg'),
  'menu-producao': resolveAssetSrc(menuProducaoImg, '/images/menu/menu-producao.jpg'),
  'menu-mochila': resolveAssetSrc(menuMochilaImg, '/images/menu/menu-mochila.png'),
  'menu-resgate': resolveAssetSrc(menuResgateImg, '/images/menu/menu-resgate.jpg'),
  'menu-ranking': resolveAssetSrc(menuRankingImg, '/images/menu/menu-ranking.jpg'),
  'menu-checkin': resolveAssetSrc(menuCheckinImg, '/images/menu/menu-checkin.jpg'),
  'menu-anuncios': resolveAssetSrc(menuAnunciosImg, '/images/menu/menu-anuncios.jpg'),
};
