import type { Elemento } from '@/rules/elements';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';

/** Quanto dura cada quadro da luta e em que instante dele o golpe acerta (em ms): normal, ×2 e a câmera lenta do último golpe. */
export function temposDoQuadro(rapido: boolean, lenta: boolean): { duracao: number; impacto: number } {
  if (lenta) return { duracao: 2300, impacto: 920 };
  return rapido ? { duracao: 640, impacto: 256 } : { duracao: 1300, impacto: 520 };
}

/** O efeito de golpe (a folha de quadros em `public/images/cacada/fx`) de uma ação. */
export type EfeitoDeGolpe = 'corte' | 'perfuracao' | 'impacto' | 'magico';

export const QUADROS_DO_EFEITO: Readonly<Record<EfeitoDeGolpe | 'critico' | 'cura' | 'escudo', number>> = {
  corte: 6, perfuracao: 6, impacto: 6, magico: 7, critico: 8, cura: 7, escudo: 6,
};

export function efeitoDaAcao(acao: Pick<AcaoDaLuta, 'tipoGolpe' | 'elemento' | 'habilidade'>): EfeitoDeGolpe {
  if (acao.tipoGolpe === 'magico' || (acao.elemento && acao.tipoGolpe !== 'contusao' && acao.tipoGolpe !== 'perfuracao' && acao.tipoGolpe !== 'corte')) return 'magico';
  if (acao.tipoGolpe === 'perfuracao') return 'perfuracao';
  if (acao.tipoGolpe === 'contusao') return 'impacto';
  return 'corte';
}

/** O filtro que pinta o efeito (desenhado em laranja) na cor do elemento do golpe. */
export function filtroDoElemento(elemento?: Elemento): string {
  switch (elemento) {
    case 'gelo': return 'hue-rotate(165deg) saturate(1.1) brightness(1.1)';
    case 'relampago': return 'hue-rotate(22deg) saturate(1.3) brightness(1.25)';
    case 'terra': return 'hue-rotate(72deg) saturate(.75)';
    case 'vento': return 'hue-rotate(118deg) saturate(.9) brightness(1.1)';
    case 'sagrado': return 'saturate(.35) brightness(1.5)';
    case 'sombrio': return 'hue-rotate(250deg) saturate(1.1) brightness(.85)';
    default: return 'none';
  }
}

/** O tamanho (px) do número de dano: cresce com o quanto ele tira da vida do alvo, e o crítico é bem maior. */
export function tamanhoDoNumero(dano: number, vidaMaxima: number, critico: boolean): number {
  const fracao = vidaMaxima > 0 ? Math.min(1, dano / vidaMaxima) : 0;
  const base = 38 + Math.round(fracao * 56);
  return critico ? Math.max(62, Math.round(base * 1.5)) : base;
}

/** Quantas faíscas saem do impacto. */
export function faiscasDoImpacto(dano: number, vidaMaxima: number, critico: boolean): number {
  const fracao = vidaMaxima > 0 ? Math.min(1, dano / vidaMaxima) : 0;
  return Math.min(22, 6 + Math.round(fracao * 24) + (critico ? 8 : 0));
}

/** O golpe merece tremer a tela? (crítico, ou tirou mais de 12% da vida do alvo). */
export function tremeATela(dano: number, vidaMaxima: number, critico: boolean): boolean {
  return critico || (vidaMaxima > 0 && dano / vidaMaxima >= 0.12);
}

/** Um pseudo-aleatório estável (0 a 1) a partir de um número: o mesmo golpe sempre sai igual. */
export function sorteioEstavel(semente: number): number {
  const x = Math.sin(semente * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
