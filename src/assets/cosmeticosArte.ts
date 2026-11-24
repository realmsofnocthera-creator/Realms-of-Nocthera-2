import manifesto from './cosmeticosManifesto.json';
import { ANIMACAO_DO_HEROI, type AnimacaoDoHeroi } from '@/lib/cacadaArte';

/**
 * As artes dos cosméticos pagos (pixel art do Yuri): skins, auras, efeitos de entrada em combate e molduras animadas. Cada uma é uma tira horizontal de quadros em
 * `public/images/loja/cosmeticos/`, gerada por `scripts/loja/cosmeticos.py`. A chave de cada arte é o id do cosmético sem o tipo (`aura-epico-sombrio` → `epico-sombrio`).
 */
const PASTA = '/images/loja/cosmeticos';

/** A altura (em px da arte) que o herói tem nas folhas de aura e de efeito: a arte de 192 px foi desenhada para um herói de cerca de 100 px de altura, com os pés em `pes`. */
export const ALTURA_DE_REFERENCIA = 100;

export interface FolhaDeCosmetico {
  src: string;
  quadros: number;
  fps: number;
  /** O lado de cada quadro, em px da arte. */
  lado: number;
}

/** A arte de uma camada dupla (aura, efeito de entrada): uma tira para desenhar ATRÁS do herói e outra NA FRENTE dele. */
export interface ArteEmCamadas {
  atras: FolhaDeCosmetico;
  frente: FolhaDeCosmetico;
  quadros: number;
  fps: number;
  lado: number;
  /** Onde ficam os pés do personagem dentro do quadro, em px da arte. */
  pes: readonly [number, number];
  /** Só o efeito de entrada: o quadro em que o herói aparece. */
  revelacao?: number;
}

type EntradaDeCamadas = { quadros: number; fps: number; lado: number; pes: number[]; loop: boolean; revelacao?: number };
type Tipos = typeof manifesto;
const tem = (o: object, k: unknown): k is string => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const chave = (id: unknown): string | undefined => (typeof id === 'string' ? id.replace(/^[a-z]+-/, '') : undefined);

function emCamadas(prefixo: 'aura' | 'efeito', e: EntradaDeCamadas, k: string): ArteEmCamadas {
  const folha = (c: 'atras' | 'frente'): FolhaDeCosmetico => ({ src: `${PASTA}/${prefixo}-${k}-${c}.webp`, quadros: e.quadros, fps: e.fps, lado: e.lado });
  return { atras: folha('atras'), frente: folha('frente'), quadros: e.quadros, fps: e.fps, lado: e.lado, pes: [e.pes[0], e.pes[1]], ...(e.revelacao !== undefined ? { revelacao: e.revelacao } : {}) };
}

function montar(prefixo: 'aura' | 'efeito', tabela: Record<string, EntradaDeCamadas>): Readonly<Record<string, ArteEmCamadas>> {
  return Object.fromEntries(Object.entries(tabela).map(([k, e]) => [`${prefixo}-${k}`, emCamadas(prefixo, e, k)]));
}

export const ARTE_DAS_AURAS: Readonly<Record<string, ArteEmCamadas>> = montar('aura', (manifesto as Tipos).auras as Record<string, EntradaDeCamadas>);
export const ARTE_DOS_EFEITOS: Readonly<Record<string, ArteEmCamadas>> = montar('efeito', (manifesto as Tipos).efeitos as Record<string, EntradaDeCamadas>);

export const arteDaAura = (id: unknown): ArteEmCamadas | undefined => (tem(ARTE_DAS_AURAS, id) ? ARTE_DAS_AURAS[id] : undefined);
export const arteDoEfeito = (id: unknown): ArteEmCamadas | undefined => (tem(ARTE_DOS_EFEITOS, id) ? ARTE_DOS_EFEITOS[id] : undefined);

export interface ArteDaMoldura extends FolhaDeCosmetico {
  /** O diâmetro do buraco do rosto, em px da arte (o buraco fica no centro do quadro). */
  buraco: number;
}

export const ARTE_DAS_MOLDURAS: Readonly<Record<string, ArteDaMoldura>> = Object.fromEntries(
  Object.entries((manifesto as Tipos).molduras).map(([k, m]) => [`moldura-${k}`, { src: `${PASTA}/moldura-${k}.webp`, quadros: m.quadros, fps: m.fps, lado: m.lado, buraco: m.buraco }])
);
export const arteDaMoldura = (id: unknown): ArteDaMoldura | undefined => (tem(ARTE_DAS_MOLDURAS, id) ? ARTE_DAS_MOLDURAS[id] : undefined);

export interface ArteDaSkin {
  /** A classe do herói a que esta skin pertence (a arte foi desenhada em cima dela). */
  classe: string;
  frente: AnimacaoDoHeroi;
  costas: AnimacaoDoHeroi;
}

type LadoDaSkin = { idle: { quadros: number; largura: number; altura: number; ms: number[] }; ataque: { quadros: number; largura: number; altura: number; ms: number[] } };

function montarSkin(k: string, classe: string, lados: { frente: LadoDaSkin; costas: LadoDaSkin }): ArteDaSkin {
  const lado = (l: 'frente' | 'costas'): AnimacaoDoHeroi => {
    const m = lados[l];
    return {
      parado: { src: `${PASTA}/skin-${k}-${l}-idle.webp`, quadros: m.idle.quadros, ms: m.idle.ms },
      ataque: { src: `${PASTA}/skin-${k}-${l}-ataque.webp`, quadros: m.ataque.quadros, ms: m.ataque.ms },
      largura: m.idle.largura,
      altura: m.idle.altura,
      proporcao: m.idle.largura / m.idle.altura,
      // os tempos do ataque são os mesmos do herói da classe: o golpe acerta no mesmo instante
      impacto: ANIMACAO_DO_HEROI[classe][l].impacto,
    };
  };
  return { classe, frente: lado('frente'), costas: lado('costas') };
}

/** As skins feitas até agora: todas em cima do Samurai. */
export const ARTE_DAS_SKINS: Readonly<Record<string, ArteDaSkin>> = Object.fromEntries(
  Object.entries((manifesto as Tipos).skins).map(([k, v]) => [`skin-${k}`, montarSkin(k, 'samurai', v as unknown as { frente: LadoDaSkin; costas: LadoDaSkin })])
);
export const arteDaSkin = (id: unknown): ArteDaSkin | undefined => (tem(ARTE_DAS_SKINS, id) ? ARTE_DAS_SKINS[id] : undefined);

export { chave as chaveDoCosmetico };
