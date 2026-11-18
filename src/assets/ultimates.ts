import { CLASSES } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';

/**
 * As ultimates das 6 classes e das 12 subclasses (vídeos do Yuri, 1080 x 1920 reduzidos a 540 x 960, H.264 sem som). Cada uma
 * tem dois vídeos: a **cinematográfica completa** (fundo, efeitos, personagem e o corte da cara; de 4,7 a 6,5 s) e só o
 * **corte da cara** (1,7 s, sobre fundo escuro). Os arquivos ficam em `public/videos/ultimates/<id da habilidade>-<tipo>-v1.mp4`
 * (a versão no nome existe porque ficam em cache por um ano). Para gerar de novo: `scripts/ultimates/converter.py`.
 */
export const PASTA_DAS_ULTIMATES = '/videos/ultimates/';

/** Como a ultimate aparece na luta: a cinematográfica toma a tela inteira; o corte da cara aparece sobre a luta. */
export type ModoDaUltimate = 'cinematica' | 'corte';
export const MODO_DA_ULTIMATE: ModoDaUltimate = 'cinematica';

/** O id da habilidade (o mesmo do kit) de cada ultimate que tem vídeo. */
export const IDS_DAS_ULTIMATES: readonly string[] = [
  ...CLASSES.map((c) => c.progressao.ultimate.id),
  ...Object.values(TEXTOS_SUBCLASSE).map((t) => t.ultimate.id),
];

/** O nome de cada ultimate (como aparece na luta) para o seu id. */
const ID_PELO_NOME: Readonly<Record<string, string>> = Object.fromEntries([
  ...CLASSES.map((c) => [c.progressao.ultimate.nome, c.progressao.ultimate.id]),
  ...Object.values(TEXTOS_SUBCLASSE).map((t) => [t.ultimate.nome, t.ultimate.id]),
]);

/** O id da ultimate pelo nome da habilidade usada (undefined se não for uma ultimate). */
export function idDaUltimate(nomeDaHabilidade: string): string | undefined {
  return ID_PELO_NOME[nomeDaHabilidade];
}

export function videoDaUltimate(id: string, modo: ModoDaUltimate): string {
  return `${PASTA_DAS_ULTIMATES}${id}-${modo}-v1.mp4`;
}
