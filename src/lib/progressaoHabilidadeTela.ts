import type { CharacterDocument } from '@/server/characterService';
import { getClassById } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { SUBCLASSES } from '@/rules/subclasses';
import {
  ASCENSAO_CUSTO_FRAGMENTOS,
  ASCENSAO_MAXIMA,
  ASCENSAO_REFORCO_NECESSARIO,
  bonusDoNivelReforcoDecimos,
  bonusNivelHabilidadePercentual,
  bonusReforcoPercentual,
  EspacoAscensao,
  PASSOS_ASCENSAO,
  REFORCO_NIVEL_MAXIMO,
  ROTULO_ESPACO_ASCENSAO,
} from '@/rules/progressaoHabilidade';
import { proximaAscensao, proximoNivelReforco } from '@/game/progressaoHabilidade';

/** Lógica das telas de Reforço e Ascensão de Habilidade (2.2.1 e 2.2.2), sem React. */

type Personagem = Pick<
  CharacterDocument,
  'classeId' | 'subclasseAtualId' | 'reforcoHabilidade' | 'ascensaoHabilidade' | 'essenciaHabilidade' | 'fragmentosAscensao'
>;

const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export interface EstadoReforco {
  nivel: number;
  nivelMaximo: number;
  bonusAtual: string;
  /** Quanto o próximo nível soma (ex.: "+0,5%"); null no nível máximo. */
  bonusProximoNivel: string | null;
  custo: number | null;
  habilitado: boolean;
  aviso: string | null;
}

export function estadoDoReforco(c: Personagem): EstadoReforco {
  const nivel = Math.max(0, c.reforcoHabilidade ?? 0);
  const proximo = proximoNivelReforco(nivel, c.essenciaHabilidade);
  return {
    nivel,
    nivelMaximo: REFORCO_NIVEL_MAXIMO,
    bonusAtual: `+${fmtPct(bonusReforcoPercentual(nivel))}`,
    bonusProximoNivel: proximo ? `+${fmtPct(bonusDoNivelReforcoDecimos(proximo.nivel) / 10)}` : null,
    custo: proximo?.custo ?? null,
    habilitado: !!proximo && !proximo.motivo,
    aviso: !proximo
      ? 'Reforço no nível máximo'
      : proximo.motivo === 'essenciaInsuficiente'
        ? 'Essência de habilidade insuficiente'
        : null,
  };
}

export type EstadoPassoAscensao = 'comprado' | 'proximo' | 'bloqueado';

export interface PassoDaLinha {
  ascensao: number;
  espaco: EspacoAscensao;
  rotulo: string;
  nivelHabilidade: number;
  bonus: string;
  estado: EstadoPassoAscensao;
}

/** A1 a A10, com o estado de cada passo para o personagem. */
export function linhaDaAscensao(c: Personagem): PassoDaLinha[] {
  const atual = Math.max(0, c.ascensaoHabilidade ?? 0);
  return PASSOS_ASCENSAO.map((p) => ({
    ascensao: p.ascensao,
    espaco: p.espaco,
    rotulo: ROTULO_ESPACO_ASCENSAO[p.espaco],
    nivelHabilidade: p.nivelHabilidade,
    bonus: `+${bonusNivelHabilidadePercentual(p.nivelHabilidade)}%`,
    estado: p.ascensao <= atual ? 'comprado' : p.ascensao === atual + 1 ? 'proximo' : 'bloqueado',
  }));
}

/** Nomes das habilidades que o passo melhora: a da classe e, se houver, a da subclasse no mesmo espaço. */
export function habilidadesDoEspaco(c: Personagem, espaco: EspacoAscensao): string[] {
  const nomes: string[] = [];
  const classe = getClassById(c.classeId);
  if (classe) nomes.push(classe.progressao[espaco].nome);
  const sub = c.subclasseAtualId ? SUBCLASSES.find((s) => s.id === c.subclasseAtualId) : undefined;
  const texto = sub ? TEXTOS_SUBCLASSE[sub.id] : undefined;
  if (sub && texto) {
    const chave = { ataqueBasico: 'basico', habilidadeEspecial: 'especial', passivaI: 'passiva', ultimate: 'ultimate' } as const;
    if (espaco !== 'passivaII') nomes.push(`${texto[chave[espaco]].nome} (${sub.nome})`);
  }
  return nomes;
}

export interface AcaoAscensao {
  ascensao: number | null;
  custo: number;
  habilitada: boolean;
  aviso: string | null;
}

export function acaoDaAscensao(c: Personagem): AcaoAscensao {
  const proxima = proximaAscensao(c.ascensaoHabilidade, c.reforcoHabilidade, c.fragmentosAscensao);
  if (!proxima) return { ascensao: null, custo: 0, habilitada: false, aviso: 'Ascensão completa (A10)' };
  return {
    ascensao: proxima.ascensao,
    custo: ASCENSAO_CUSTO_FRAGMENTOS,
    habilitada: !proxima.motivo,
    aviso:
      proxima.motivo === 'reforcoIncompleto'
        ? `Libera com o Reforço de Habilidade no nível ${ASCENSAO_REFORCO_NECESSARIO}`
        : proxima.motivo === 'fragmentosInsuficientes'
          ? 'Fragmentos de ascensão insuficientes'
          : null,
  };
}

export const ASCENSAO_TOTAL = ASCENSAO_MAXIMA;
