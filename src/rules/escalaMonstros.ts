import type { PerfilMonstro } from './cacada';

/**
 * Escala dos monstros (Balanceamento 2.3, v1.0 PROVISÓRIA): multiplicadores de vida (kh) e de ataque (kf) por nível e categoria, calibrados contra o
 * jogador de referência (metas de vitória: normal 66%, difícil 55%, boss 49%). HP_final = round(HP_atual × kh); ataque_final = round(ataque_atual × kf).
 * A tabela bruta tem ±3 pontos de ruído: a curva usada é suavizada (média 1-2-1 entre vizinhos; os níveis 1 e 2 e o 30 ficam como estão, para manter o
 * salto de tier) e os níveis sem monstro difícil são interpolados. Chefes Mundial e Semanal (vida de 1 bilhão) ficam fora.
 */
export type CategoriaDeEscala = 'normal' | 'dificil' | 'boss';

/** [nível, normal [kh, kf], difícil [kh, kf] | null, boss [kh, kf]] */
const BRUTA: readonly (readonly [number, readonly [number, number], readonly [number, number] | null, readonly [number, number]])[] = [
  [1, [0.8, 0.7], [1.2, 0.6], [1.1, 0.2]],
  [2, [5.3, 5.5], [7.2, 7.6], [8.9, 2.6]],
  [3, [5.1, 5.7], [7.7, 7.9], [9.5, 2.6]],
  [4, [5.3, 5.3], [8.2, 7.9], [8.7, 2.8]],
  [5, [4.2, 5.9], null, [10.2, 4.4]],
  [6, [4.3, 6.1], null, [10.0, 4.2]],
  [7, [4.1, 5.6], null, [9.7, 4.1]],
  [8, [4.0, 7.9], null, [8.9, 4.2]],
  [9, [4.3, 7.6], null, [7.8, 4.4]],
  [10, [4.4, 7.6], null, [7.8, 3.6]],
  [11, [4.3, 7.7], null, [8.7, 3.7]],
  [12, [6.9, 8.9], [8.9, 10.5], [12.1, 5.2]],
  [13, [5.6, 9.2], [9.1, 10.5], [12.1, 4.8]],
  [14, [6.4, 8.7], [9.3, 10.7], [12.1, 4.6]],
  [15, [6.7, 8.2], [9.3, 11.0], [12.4, 4.7]],
  [16, [6.7, 10.7], null, [14.7, 5.6]],
  [17, [7.2, 11.6], null, [13.8, 5.6]],
  [18, [8.0, 10.4], null, [15.1, 5.6]],
  [19, [8.2, 10.5], null, [15.7, 5.4]],
  [20, [7.7, 7.9], [16.4, 6.6], [29.0, 5.4]],
  [21, [6.6, 7.0], [16.8, 6.5], [19.6, 4.2]],
  [22, [6.7, 7.9], [16.8, 6.6], [20.9, 3.9]],
  [23, [6.3, 6.6], [9.7, 8.8], [22.8, 4.6]],
  [24, [6.9, 6.6], [10.0, 8.7], [23.3, 3.9]],
  [25, [6.0, 6.5], [8.2, 8.8], [18.3, 4.3]],
  [26, [4.6, 9.4], [6.9, 7.9], [9.3, 4.6]],
  [27, [4.3, 10.0], [6.9, 7.9], [9.1, 4.8]],
  [28, [3.9, 11.0], [7.0, 7.9], [9.3, 4.6]],
  [29, [4.6, 7.9], [7.0, 7.9], [9.7, 4.6]],
  [30, [5.0, 11.7], [7.7, 11.2], [12.9, 8.1]],
];

export const NIVEL_MAXIMO_DA_ESCALA = 30;

type Par = readonly [number, number];

/** A coluna da categoria, nível 1 a 30, com os buracos interpolados e a curva suavizada. */
function colunaSuavizada(indice: 1 | 2 | 3): Par[] {
  const pontos: (Par | null)[] = BRUTA.map((l) => l[indice] as Par | null);
  // interpola os níveis sem monstro (linha reta entre os vizinhos conhecidos; nas pontas, o valor mais próximo)
  const cheia: Par[] = pontos.map((p, i) => {
    if (p) return p;
    let a = i - 1;
    while (a >= 0 && !pontos[a]) a--;
    let b = i + 1;
    while (b < pontos.length && !pontos[b]) b++;
    const pa = a >= 0 ? pontos[a]! : null;
    const pb = b < pontos.length ? pontos[b]! : null;
    if (pa && pb) {
      const t = (i - a) / (b - a);
      return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t] as Par;
    }
    return (pa ?? pb)!;
  });
  return cheia.map((p, i) => {
    if (i < 2 || i === cheia.length - 1) return p; // níveis 1, 2 e 30 ficam como estão
    const x = cheia[i - 1];
    const z = cheia[i + 1];
    return [(x[0] + 2 * p[0] + z[0]) / 4, (x[1] + 2 * p[1] + z[1]) / 4] as Par;
  });
}

const CURVAS: Readonly<Record<CategoriaDeEscala, Par[]>> = {
  normal: colunaSuavizada(1),
  dificil: colunaSuavizada(2),
  boss: colunaSuavizada(3),
};

/**
 * Ajuste do começo do jogo: a tabela foi calibrada para o jogador de REFERÊNCIA (com equipamento), mas quem acabou de criar o personagem não tem nenhum.
 * Do nível 1 ao 8 os monstros valem esta fração da tabela (um personagem cru, sem equipamento, vence os de 1★); do nível 9 ao 14 a fração sobe aos poucos
 * até 1 (a tabela inteira, quando o jogador já tem equipamento e emblemas). Valores calibrados por simulação de personagens crus das 6 classes.
 */
export const AJUSTE_DE_INICIO: Record<CategoriaDeEscala, { kh: number; kf: number }> = {
  normal: { kh: 0.27, kf: 0.16 },
  dificil: { kh: 0.2, kf: 0.12 },
  boss: { kh: 0.18, kf: 0.09 },
};
export const NIVEL_ATE_O_AJUSTE_TOTAL = 8;
export const NIVEL_DA_TABELA_INTEIRA = 14;

/** O peso do ajuste de começo no nível (1 até o nível 8; cai em linha reta até 0 no nível 14). */
export function pesoDoAjusteDeInicio(nivel: number): number {
  if (nivel <= NIVEL_ATE_O_AJUSTE_TOTAL) return 1;
  if (nivel >= NIVEL_DA_TABELA_INTEIRA) return 0;
  return (NIVEL_DA_TABELA_INTEIRA - nivel) / (NIVEL_DA_TABELA_INTEIRA - NIVEL_ATE_O_AJUSTE_TOTAL);
}

/** Os multiplicadores no nível (pode ser fracionário, como o nível de referência da Torre: interpola entre os vizinhos). */
export function escalaDoNivel(nivel: number, categoria: CategoriaDeEscala): { kh: number; kf: number } {
  const curva = CURVAS[categoria];
  const n = Math.min(NIVEL_MAXIMO_DA_ESCALA, Math.max(1, Number.isFinite(nivel) ? nivel : 1));
  const baixo = Math.floor(n);
  const alto = Math.min(NIVEL_MAXIMO_DA_ESCALA, baixo + 1);
  const t = n - baixo;
  const a = curva[baixo - 1];
  const b = curva[alto - 1];
  const w = pesoDoAjusteDeInicio(n);
  const ini = AJUSTE_DE_INICIO[categoria];
  return {
    kh: (a[0] + (b[0] - a[0]) * t) * (1 - w * (1 - ini.kh)),
    kf: (a[1] + (b[1] - a[1]) * t) * (1 - w * (1 - ini.kf)),
  };
}

/** Normal = perfis normal e ágil; difícil = blindado e lento (o "—" da tabela interpola). Monstro-chave e chefes são `boss`. */
export function categoriaDeEscala(perfil: PerfilMonstro | undefined, chefe: boolean): CategoriaDeEscala {
  if (chefe) return 'boss';
  return perfil === 'blindado' || perfil === 'lento' ? 'dificil' : 'normal';
}

export const escalarVida = (hp: number, nivel: number, categoria: CategoriaDeEscala): number => Math.max(1, Math.round(hp * escalaDoNivel(nivel, categoria).kh));
export const escalarAtaque = (ataque: number, nivel: number, categoria: CategoriaDeEscala): number => Math.max(1, Math.round(ataque * escalaDoNivel(nivel, categoria).kf));
