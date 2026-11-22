import { MOLDURA_MAP } from '@/rules/molduras';

/** As artes das molduras (128 px; as 7 animadas têm também o loop `-anim`) e das faixas dos títulos (176 x 48), em `public/images`. Geradas por `scripts/molduras/converter.py`. */
export const srcDaMoldura = (id: string, animada = false): string => `/images/molduras/${id}${animada && MOLDURA_MAP[id]?.animada ? '-anim' : ''}.webp`;
export const srcDoTitulo = (id: string): string => `/images/titulos/${id}.webp`;

/** O buraco do avatar em cada moldura de 128 px: centro (64, 66) e raio 26. */
export const BURACO_DA_MOLDURA = { centroX: 64, centroY: 66, raio: 26, lado: 128 } as const;
