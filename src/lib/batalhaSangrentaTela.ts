import type { CharacterDocument } from '@/server/characterService';
import {
  BATALHA_SANGRENTA,
  CHEFES_ESPECIAIS,
  conferirEntradaBatalha,
  DIFICULDADES_BATALHA,
  dificuldadeLiberada,
  DificuldadeBatalha,
  NIVEL_BATALHA_SANGRENTA,
  tentativasRestantes,
} from '@/game/batalhaSangrenta';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { SUBCLASSES } from '@/rules/subclasses';

/** Lógica da tela da Batalha Sangrenta (dificuldades, tentativas e textos), sem React. */

type Personagem = Pick<CharacterDocument, 'nivel' | 'batalhaSangrenta' | 'batalhaSangrentaVencidas'>;

export interface DificuldadeTela {
  id: DificuldadeBatalha;
  nome: string;
  estrela: number;
  chefes: string[];
  fragmentos: string;
  extraSubclasse: string | null;
  vencida: boolean;
  liberada: boolean;
  /** Por que não dá para entrar agora (nível, dificuldade anterior ou fim das tentativas). */
  bloqueio: string | null;
  /** Os 10 Diamantes ainda estão disponíveis nesta dificuldade. */
  diamantesPendentes: boolean;
}

export function tentativasDeHoje(c: Pick<CharacterDocument, 'batalhaSangrenta'>, agora: Date = new Date()): number {
  return tentativasRestantes(c.batalhaSangrenta, agora);
}

export function dificuldadesDaBatalha(c: Personagem, agora: Date = new Date()): DificuldadeTela[] {
  return DIFICULDADES_BATALHA.map((d, i) => {
    const vencidas = c.batalhaSangrentaVencidas ?? [];
    const liberada = c.nivel >= NIVEL_BATALHA_SANGRENTA && dificuldadeLiberada(d.id, vencidas);
    const anterior = i > 0 ? DIFICULDADES_BATALHA[i - 1].nome : null;
    const entrada = conferirEntradaBatalha(d.id, c.nivel, c.batalhaSangrenta, vencidas, agora);
    let bloqueio: string | null = null;
    if (!entrada.ok) {
      bloqueio =
        entrada.motivo === 'nivelInsuficiente'
          ? `Requer nível ${NIVEL_BATALHA_SANGRENTA}`
          : entrada.motivo === 'dificuldadeBloqueada'
            ? `Vença a dificuldade ${anterior}`
            : entrada.motivo === 'semTentativas'
              ? 'Sem tentativas hoje'
              : 'Indisponível';
    }
    return {
      id: d.id,
      nome: d.nome,
      estrela: d.estrela,
      chefes: CHEFES_ESPECIAIS[d.id].slice(0, d.chefes).map((id) => CHEFES_ESPECIAIS_MAP[id]?.nome ?? id),
      fragmentos: `${d.fragmentos.min} a ${d.fragmentos.max}`,
      extraSubclasse: d.fragmentosSubclasse
        ? `${d.fragmentosSubclasse.chancePercentual}% de chance de ${d.fragmentosSubclasse.min} a ${d.fragmentosSubclasse.max} fragmentos de uma subclasse sorteada`
        : null,
      vencida: vencidas.includes(d.id),
      liberada,
      bloqueio,
      diamantesPendentes: !vencidas.includes(d.id),
    };
  });
}

export function nomeDaSubclasse(id: string): string {
  return SUBCLASSES.find((s) => s.id === id)?.nome ?? id;
}

export const REGRAS_RESUMO = `${BATALHA_SANGRENTA.ondasComuns} monstros comuns e o(s) chefe(s) Especial(is); o HP passa de uma luta para a outra. Vitória: fragmentos de alma e ${BATALHA_SANGRENTA.ouroDaVitoria} de ouro (${BATALHA_SANGRENTA.diamantesDaPrimeiraVitoria} Diamantes na primeira vez em cada dificuldade). Derrota: ${BATALHA_SANGRENTA.ouroDaDerrota} de ouro.`;
