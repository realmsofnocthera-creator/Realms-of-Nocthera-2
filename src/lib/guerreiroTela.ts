import type { CharacterDocument } from '@/server/characterService';
import {
  CHANCE_EMBLEMA_POR_DIFICULDADE,
  conferirEntradaGuerreiro,
  GUERREIRO,
  NIVEL_GUERREIRO,
} from '@/game/guerreiro';
import { CHEFES_GUERREIRO } from '@/rules/guerreiroChefes';
import { EMBLEMA_RARIDADES, EMBLEMA_RARIDADE_MAP, EmblemaRaridade } from '@/rules/emblemas';

/** Lógica da tela da Provação do Guerreiro (dificuldades, estado de cada chefe e emblemas), sem React. */

type Personagem = Pick<CharacterDocument, 'nivel' | 'guerreiroTentativas' | 'guerreiroVencidas' | 'emblemas'>;

export type EstadoChefeGuerreiro = 'disponivel' | 'bloqueado' | 'tentativaUsada';

export interface ChanceEmblemaTela {
  raridade: EmblemaRaridade;
  nome: string;
  cor: string;
  percentual: number;
}

export interface DificuldadeGuerreiroTela {
  dificuldade: number;
  nome: string;
  carta: string;
  mecanicaNome: string;
  mecanicaDescricao: string;
  estado: EstadoChefeGuerreiro;
  /** Texto do que impede a luta agora (nível, chefe anterior ou tentativa do dia). */
  aviso: string | null;
  vencido: boolean;
  chances: ChanceEmblemaTela[];
}

export function dificuldadesDoGuerreiro(c: Personagem, agora: Date = new Date()): DificuldadeGuerreiroTela[] {
  return CHEFES_GUERREIRO.map((chefe) => {
    const d = chefe.dificuldade;
    const entrada = conferirEntradaGuerreiro(d, c.nivel, c.guerreiroTentativas, c.guerreiroVencidas, agora);
    let estado: EstadoChefeGuerreiro = 'disponivel';
    let aviso: string | null = null;
    if (!entrada.ok) {
      if (entrada.motivo === 'nivelInsuficiente') {
        estado = 'bloqueado';
        aviso = `Requer nível ${NIVEL_GUERREIRO}`;
      } else if (entrada.motivo === 'dificuldadeBloqueada') {
        estado = 'bloqueado';
        aviso = `Vença ${CHEFES_GUERREIRO[d - 2]?.nome ?? 'o chefe anterior'}`;
      } else if (entrada.motivo === 'semTentativa') {
        estado = 'tentativaUsada';
        aviso = 'Tentativa de hoje já usada';
      }
    }
    const tabela = CHANCE_EMBLEMA_POR_DIFICULDADE[d] ?? {};
    return {
      dificuldade: d,
      nome: chefe.nome,
      carta: chefe.carta,
      mecanicaNome: chefe.mecanicaNome,
      mecanicaDescricao: chefe.mecanicaDescricao,
      estado,
      aviso,
      vencido: (c.guerreiroVencidas ?? []).includes(d),
      chances: EMBLEMA_RARIDADES.filter((r) => (tabela[r.id] ?? 0) > 0).map((r) => ({
        raridade: r.id,
        nome: r.nome,
        cor: r.cor,
        percentual: tabela[r.id] ?? 0,
      })),
    };
  });
}

export interface EmblemaTela {
  raridade: EmblemaRaridade;
  nome: string;
  cor: string;
  quantidade: number;
}

/** Os emblemas do personagem, do mais raro para o mais comum (só os que ele tem). */
export function emblemasDoPersonagem(emblemas: Record<string, number> | undefined): EmblemaTela[] {
  return [...EMBLEMA_RARIDADES]
    .reverse()
    .filter((r) => (emblemas?.[r.id] ?? 0) > 0)
    .map((r) => ({ raridade: r.id, nome: EMBLEMA_RARIDADE_MAP[r.id].nome, cor: r.cor, quantidade: emblemas?.[r.id] ?? 0 }));
}

export const EMBLEMAS_POR_VITORIA = GUERREIRO.emblemasPorVitoria;
