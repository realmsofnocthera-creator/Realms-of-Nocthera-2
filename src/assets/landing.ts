/**
 * Artes da página inicial. Cada arte nova entra trocando o `src` (ou preenchendo um que está `null`).
 * Enquanto a arte não existe, a página usa a arte atual como substituta.
 * Ver o briefing "GUIA_DE_ESTILO_E_BRIEFING_INICIAL" para tamanho e descrição de cada uma.
 */
export interface CamadaDoTopo {
  id: string;
  /** Caminho em /public; null = ainda não existe. */
  src: string | null;
  /** 0 = parada; 1 = anda junto com a rolagem. Camadas da frente andam mais. */
  velocidade: number;
}

export const CAMADAS_DO_TOPO: readonly CamadaDoTopo[] = [
  { id: 'ceu', src: '/images/landing-bg.webp', velocidade: 0.05 },
  { id: 'fundo', src: null, velocidade: 0.12 },
  { id: 'meio', src: null, velocidade: 0.2 },
  { id: 'frente', src: null, velocidade: 0.32 },
];

/** Logo em pixel (256×64). Sem a arte, o título aparece escrito na fonte pixel. */
export const LOGO_DA_PAGINA_INICIAL: string | null = null;
/** Herói de costas (128×192) no topo. */
export const HEROI_DO_TOPO: string | null = null;
