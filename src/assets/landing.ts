/**
 * Artes da página inicial. Cada arte nova entra trocando o `src` (ou preenchendo um que está `null`).
 * Enquanto a arte não existe, a página usa a arte atual como substituta.
 * Ver o briefing "GUIA_DE_ESTILO_E_BRIEFING_INICIAL" para tamanho e descrição de cada uma.
 */
export interface CamadaDoTopo {
  id: string;
  /** Caminho em /public; null = ainda não existe. */
  src: string | null;
  /** Mesma arte em AVIF (bem mais leve; navegadores antigos usam o `src`). */
  srcAvif?: string;
  /** 0 = parada; 1 = anda junto com a rolagem. Camadas da frente andam mais. */
  velocidade: number;
  /** Posição da arte quando a tela corta (formato do object-position do CSS). */
  posicao?: string;
  /** true = arte em grade de pixels (ampliação sem suavizar); false = arte grande, suavizada. */
  pixel?: boolean;
}

export const CAMADAS_DO_TOPO: readonly CamadaDoTopo[] = [
  { id: 'ceu', src: '/images/landing-topo.webp', srcAvif: '/images/landing-topo.avif', velocidade: 0.08, posicao: '22% 70%', pixel: false },
  { id: 'fundo', src: null, velocidade: 0.12 },
  { id: 'meio', src: null, velocidade: 0.2 },
  { id: 'frente', src: null, velocidade: 0.32 },
];

/** Logo (dragão e título, em dourado). Sem a arte, o título aparece escrito na fonte pixel. */
export const LOGO_DA_PAGINA_INICIAL: string | null = '/images/landing-logo.webp';
/** Herói de costas (128×192) no topo. */
export const HEROI_DO_TOPO: string | null = null;
