import { ProvacaoAssetKey } from '@/rules/provacoes';
import provacaoTesteEquipeImg from './images/provacoes/provacao-teste-equipe.webp';
import provacaoDungeonsImg from './images/provacoes/provacao-dungeons.webp';
import provacaoCacadaImg from './images/provacoes/provacao-cacada.webp';
import provacaoChefeMundialImg from './images/provacoes/provacao-chefe-mundial.webp';
import provacaoBatalhaSangrentaImg from './images/provacoes/provacao-batalha-sangrenta.webp';
import provacaoTorreCelestialImg from './images/provacoes/provacao-torre-celestial.webp';
import provacaoGuerreiroImg from './images/provacoes/provacao-guerreiro.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const PROVACOES_IMAGES: Record<ProvacaoAssetKey, string> = {
  'provacao-teste-equipe': srcDaImagem(provacaoTesteEquipeImg),
  'provacao-dungeons': srcDaImagem(provacaoDungeonsImg),
  'provacao-cacada': srcDaImagem(provacaoCacadaImg),
  'provacao-chefe-mundial': srcDaImagem(provacaoChefeMundialImg),
  'provacao-batalha-sangrenta': srcDaImagem(provacaoBatalhaSangrentaImg),
  'provacao-torre-celestial': srcDaImagem(provacaoTorreCelestialImg),
  'provacao-guerreiro': srcDaImagem(provacaoGuerreiroImg),
};
