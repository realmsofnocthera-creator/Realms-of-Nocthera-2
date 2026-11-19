import { srcDaImagem } from '@/assets/srcDaImagem';
import fundo1 from './images/torre/fundo-1.webp';
import fundo2 from './images/torre/fundo-2.webp';
import fundo3 from './images/torre/fundo-3.webp';
import fundo4 from './images/torre/fundo-4.webp';
import pergaminho from './images/torre/pergaminho.webp';
import cenario1 from './images/torre/cenario-1.webp';
import cenario2 from './images/torre/cenario-2.webp';
import cenario3 from './images/torre/cenario-3.webp';
import cenario4 from './images/torre/cenario-4.webp';
import cenario5 from './images/torre/cenario-5.webp';
import cenario6 from './images/torre/cenario-6.webp';
import iconeCasa from './images/torre/icone-casa.webp';
import iconeCadeado from './images/torre/icone-cadeado.webp';
import iconeTorre from './images/torre/icone-torre.webp';
import iconeSigilo from './images/torre/icone-sigilo.webp';
import botaoVermelho from './images/torre/botao-vermelho.webp';
import botaoVermelhoEscuro from './images/torre/botao-vermelho-escuro.webp';
import botaoCinza from './images/torre/botao-cinza.webp';
import barraTitulo from './images/torre/barra-titulo.webp';
import molduraVazia from './images/torre/moldura-vazia.webp';
import molduraDestaque from './images/torre/moldura-destaque.webp';
import molduraPequena from './images/torre/moldura-pequena.webp';

/** Os 4 fundos da torre (do Yuri): ela sobe e o céu muda a cada quarto dos andares. */
export const FUNDOS_DA_TORRE: readonly string[] = [fundo1, fundo2, fundo3, fundo4].map(srcDaImagem);

/** As 6 miniaturas de cenário dos andares (uma a cada 50 andares). */
export const CENARIOS_DA_TORRE: readonly string[] = [cenario1, cenario2, cenario3, cenario4, cenario5, cenario6].map(srcDaImagem);

/** Peças de interface da Torre (folha do Yuri, fatiada por `scripts/torre/fatiar.py`). Ouro e cristais vêm do HUD e da Mochila. */
export const TORRE_UI = {
  pergaminho: srcDaImagem(pergaminho),
  iconeCasa: srcDaImagem(iconeCasa),
  iconeCadeado: srcDaImagem(iconeCadeado),
  iconeTorre: srcDaImagem(iconeTorre),
  iconeSigilo: srcDaImagem(iconeSigilo),
  botaoVermelho: srcDaImagem(botaoVermelho),
  botaoVermelhoEscuro: srcDaImagem(botaoVermelhoEscuro),
  botaoCinza: srcDaImagem(botaoCinza),
  barraTitulo: srcDaImagem(barraTitulo),
  molduraVazia: srcDaImagem(molduraVazia),
  molduraDestaque: srcDaImagem(molduraDestaque),
  molduraPequena: srcDaImagem(molduraPequena),
} as const;
