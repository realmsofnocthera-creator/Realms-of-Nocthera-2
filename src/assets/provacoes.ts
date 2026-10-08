import { ProvacaoAssetKey } from '@/rules/provacoes';
import provacaoTesteEquipeImg from './images/provacoes/provacao-teste-equipe.png';
import provacaoDungeonsImg from './images/provacoes/provacao-dungeons.png';
import provacaoCacadaImg from './images/provacoes/provacao-cacada.png';
import provacaoChefeMundialImg from './images/provacoes/provacao-chefe-mundial.png';
import provacaoBatalhaSangrentaImg from './images/provacoes/provacao-batalha-sangrenta.png';
import provacaoTorreCelestialImg from './images/provacoes/provacao-torre-celestial.png';
import provacaoGuerreiroImg from './images/provacoes/provacao-guerreiro.png';

type ImportedAsset = string | { src: string };

function resolveAssetSrc(imported: ImportedAsset, fallback: string): string {
  if (!imported) return fallback;
  if (typeof imported === 'string') return imported;
  if (typeof imported === 'object' && typeof imported.src === 'string') {
    return imported.src;
  }
  return fallback;
}

export const PROVACOES_IMAGES: Record<ProvacaoAssetKey, string> = {
  'provacao-teste-equipe': resolveAssetSrc(
    provacaoTesteEquipeImg,
    '/images/provacoes/provacao-teste-equipe.png'
  ),
  'provacao-dungeons': resolveAssetSrc(
    provacaoDungeonsImg,
    '/images/provacoes/provacao-dungeons.png'
  ),
  'provacao-cacada': resolveAssetSrc(
    provacaoCacadaImg,
    '/images/provacoes/provacao-cacada.png'
  ),
  'provacao-chefe-mundial': resolveAssetSrc(
    provacaoChefeMundialImg,
    '/images/provacoes/provacao-chefe-mundial.png'
  ),
  'provacao-batalha-sangrenta': resolveAssetSrc(
    provacaoBatalhaSangrentaImg,
    '/images/provacoes/provacao-batalha-sangrenta.png'
  ),
  'provacao-torre-celestial': resolveAssetSrc(
    provacaoTorreCelestialImg,
    '/images/provacoes/provacao-torre-celestial.png'
  ),
  'provacao-guerreiro': resolveAssetSrc(
    provacaoGuerreiroImg,
    '/images/provacoes/provacao-guerreiro.png'
  ),
};
