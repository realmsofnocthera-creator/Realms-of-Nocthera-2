import molduraEsquerdaImg from './images/perfil/perfil-moldura-esquerda.png';
import fundoDireitaImg from './images/perfil/perfil-fundo-direita.png';

type ImportedImage = string | { src: string };

function resolveImgSrc(imported: ImportedImage, publicFallback: string): string {
  if (!imported) return publicFallback;
  if (typeof imported === 'string') return imported;
  if (typeof imported === 'object' && typeof imported.src === 'string') {
    return imported.src;
  }
  return publicFallback;
}

export const PERFIL_IMAGES = {
  molduraEsquerda: resolveImgSrc(
    molduraEsquerdaImg,
    '/images/perfil/perfil-moldura-esquerda.png'
  ),
  fundoDireita: resolveImgSrc(
    fundoDireitaImg,
    '/images/perfil/perfil-fundo-direita.png'
  ),
} as const;
