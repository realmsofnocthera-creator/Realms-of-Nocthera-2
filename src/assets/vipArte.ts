import manifesto from './vipArteManifesto.json';
import type { RecompensaDoVip } from '@/rules/vipRecompensas';
import { MOLDURA_MAP } from '@/rules/molduras';

/**
 * As artes das recompensas do VIP (pacote do Yuri, 24/11/2026), em `public/images/vip`, `public/images/molduras`, `public/images/titulos` e `public/videos/vip`
 * (geradas por `scripts/vip/converter.py`). Cada recompensa tem a sua prévia para a tela do VIP; títulos e molduras já se resgatam de verdade, e as skins, a aura,
 * o emblema, a decoração e os efeitos esperam o inventário de cosméticos.
 */
export type PreviaDaRecompensa =
  | { tipo: 'imagem'; src: string; largura: number; altura: number }
  | { tipo: 'folha'; src: string; quadros: number; largura: number; altura: number; ms: readonly number[] }
  | { tipo: 'video'; mp4: string; webm: string };

const M = manifesto as unknown as {
  skins: Record<string, Record<'frente' | 'costas', Record<'idle' | 'ataque', { quadros: number; largura: number; altura: number; ms: number[] }>>>;
  aura: Record<string, { quadros: number; largura: number; altura: number; ms: number[]; centro: number[] }>;
};

/** O título entregue por cada recompensa de título. */
const TITULO_DO_VIP: Readonly<Record<string, string>> = { 'vip-2-titulo': 'vip-adepto', 'vip-9-titulo': 'vip-especial', 'vip-10-titulo': 'vip-transcendente' };

export function previaDaRecompensa(x: Pick<RecompensaDoVip, 'id' | 'nivel' | 'tipo'>): PreviaDaRecompensa | null {
  const n = x.nivel;
  switch (x.tipo) {
    case 'moldura': {
      const id = `vip-${n}`;
      if (!MOLDURA_MAP[id]) return null;
      return { tipo: 'imagem', src: `/images/molduras/${id}${MOLDURA_MAP[id].animada ? '-anim' : ''}.webp`, largura: 128, altura: 128 };
    }
    case 'titulo': {
      const t = TITULO_DO_VIP[x.id];
      return t ? { tipo: 'imagem', src: `/images/titulos/${t}.webp`, largura: 176, altura: 48 } : null;
    }
    case 'skin': {
      const s = M.skins[String(n)]?.frente.idle;
      return s ? { tipo: 'folha', src: `/images/vip/skin-${n}-frente-idle.webp`, quadros: s.quadros, largura: s.largura, altura: s.altura, ms: s.ms } : null;
    }
    case 'aura': {
      const a = M.aura[String(n)];
      return a ? { tipo: 'folha', src: `/images/vip/aura-${n}.webp`, quadros: a.quadros, largura: a.largura, altura: a.altura, ms: a.ms } : null;
    }
    case 'efeito':
      return n === 6 || n === 10 ? { tipo: 'video', mp4: `/videos/vip/efeito-${n}.mp4`, webm: `/videos/vip/efeito-${n}.webm` } : null;
    case 'emblema':
      return n === 7 ? { tipo: 'imagem', src: '/images/vip/emblema-7.webp', largura: 16, altura: 16 } : null;
    case 'decoracao':
      return n === 8 ? { tipo: 'imagem', src: '/images/vip/decoracao-8-balao.webp', largura: 48, altura: 48 } : null;
  }
}

/** O retrato (480 x 720) de uma skin do VIP, para quando a tela de skins existir. */
export const retratoDaSkinVip = (nivel: number): string | null => (M.skins[String(nivel)] ? `/images/vip/skin-${nivel}-retrato.webp` : null);
