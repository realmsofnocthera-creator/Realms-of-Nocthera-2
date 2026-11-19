import type { NomeDoEfeito } from '@/assets/efeitosPixelfx';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';

/** Quanto dura cada quadro da luta e em que instante dele o golpe acerta (em ms): normal, ×2 e a câmera lenta do último golpe. */
export function temposDoQuadro(rapido: boolean, lenta: boolean): { duracao: number; impacto: number } {
  if (lenta) return { duracao: 2300, impacto: 920 };
  return rapido ? { duracao: 640, impacto: 256 } : { duracao: 1300, impacto: 520 };
}

/** O efeito de golpe (do pixelfx) de uma ação: o elemento manda; sem elemento, vale o tipo de golpe; o padrão é o corte (ou a garra, no monstro). */
/**
 * O efeito do golpe: o elemento (se o golpe não for físico), o tipo do golpe, ou o golpe próprio do monstro (`golpeDoMonstro`,
 * a arma ou o jeito de atacar dele); sem nada disso, garra no monstro e corte no herói.
 */
export function efeitoDaAcao(acao: Pick<AcaoDaLuta, 'tipoGolpe' | 'elemento'> & { de?: 'jogador' | 'monstro' }, golpeDoMonstro?: NomeDoEfeito): NomeDoEfeito {
  const fisico = acao.tipoGolpe === 'corte' || acao.tipoGolpe === 'perfuracao' || acao.tipoGolpe === 'contusao';
  if (acao.elemento && !fisico) return acao.elemento === 'relampago' ? 'golpe-relampago' : (`magia-${acao.elemento}` as NomeDoEfeito);
  if (acao.tipoGolpe === 'perfuracao') return 'golpe-perfuracao';
  if (acao.tipoGolpe === 'contusao') return 'golpe-contusao';
  if (acao.tipoGolpe === 'magico') return 'magia-sagrado';
  return acao.de === 'monstro' ? golpeDoMonstro ?? 'golpe-garra' : 'golpe-corte';
}

/** O tamanho (px) do número de dano: cresce com o quanto ele tira da vida do alvo, e o crítico é bem maior. */
export function tamanhoDoNumero(dano: number, vidaMaxima: number, critico: boolean): number {
  const fracao = vidaMaxima > 0 ? Math.min(1, dano / vidaMaxima) : 0;
  const base = 38 + Math.round(fracao * 56);
  return critico ? Math.max(62, Math.round(base * 1.5)) : base;
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
