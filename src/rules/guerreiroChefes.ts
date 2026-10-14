import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { MecanicaChefeId } from '@/game/combate/mecanicasChefe';

/**
 * Os 10 chefes da Provação do Guerreiro (lista do Yuri, 14/10/2026), um por dificuldade e cada um com uma mecânica
 * única inspirada numa carta de Tarô. Os nomes de Vaelkar, Azrakar, Nyméria e Dreadmor foram trocados (Thundrak,
 * Veredar, Selvara e Kolossar), a aprovar. A categoria corporal e o elemento são PROPOSTAS.
 */
export interface ChefeGuerreiro {
  dificuldade: number;
  id: string;
  nome: string;
  carta: string;
  mecanicaNome: string;
  mecanicaDescricao: string;
  /** Mecânica já implementada no motor; sem ela o chefe ainda não está disponível. */
  mecanica?: MecanicaChefeId;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

export const CHEFES_GUERREIRO: readonly ChefeGuerreiro[] = [
  {
    dificuldade: 1, id: 'astaroth-louco', nome: 'Astaroth, o Louco', carta: 'O Louco',
    mecanicaNome: 'Caos Imprevisível',
    mecanicaDescricao: 'A cada 3 turnos sorteia uma entre três ações: um ataque devastador, uma explosão elemental ou uma recuperação parcial de vida.',
    mecanica: 'caosImprevisivel', categoriaCorporal: 'organicoDesprotegido', tipoDano: 'fisico',
  },
  {
    dificuldade: 2, id: 'zephyron-mago', nome: 'Zephyron, o Mago', carta: 'O Mago',
    mecanicaNome: 'Convergência Arcana',
    mecanicaDescricao: 'Acumula energia mágica; ao completar três acúmulos, lança uma habilidade que combina dois elementos (fogo e raio explodem; gelo e trevas aplicam lentidão e enfraquecimento).',
    mecanica: 'convergenciaArcana', categoriaCorporal: 'organicoDesprotegido', elementoAtaque: 'relampago', tipoDano: 'magico',
  },
  {
    dificuldade: 3, id: 'thundrak-carro', nome: 'Thundrak, o Carro', carta: 'O Carro',
    mecanicaNome: 'Investida Imparável',
    mecanicaDescricao: 'A cada 4 turnos investe: dano elevado e redução de defesa. Um efeito de interrupção ou de redução de ataque no chefe diminui o impacto.',
    mecanica: 'investidaImparavel', categoriaCorporal: 'blindadoPesado', tipoDano: 'fisico',
  },
  {
    dificuldade: 4, id: 'gorvath-forca', nome: 'Gorvath, a Força', carta: 'A Força',
    mecanicaNome: 'Fúria Contida',
    mecanicaDescricao: 'Acumula fúria ao sofrer dano. No limite entra em frenesi (mais ataque por 2 turnos); se o personagem sobreviver, a fúria zera e ele fica vulnerável.',
    mecanica: 'furiaContida', categoriaCorporal: 'feral', tipoDano: 'fisico',
  },
  {
    dificuldade: 5, id: 'veredar-justica', nome: 'Veredar, a Justiça', carta: 'A Justiça',
    mecanicaNome: 'Balança do Julgamento',
    mecanicaDescricao: 'A cada 3 turnos avalia a build e aplica uma sentença: ataque extremo sofre redução de ataque; defesa extrema sofre penalidade de resistência.',
    mecanica: 'balancaDoJulgamento', categoriaCorporal: 'blindagemMedia', tipoDano: 'fisico',
  },
  {
    dificuldade: 6, id: 'selvara-roda-da-fortuna', nome: 'Selvara, a Roda da Fortuna', carta: 'A Roda da Fortuna',
    mecanicaNome: 'Destino Giratório',
    mecanicaDescricao: 'A cada 2 turnos a roda escolhe um efeito: Fortuna (o chefe perde defesa), Infortúnio (o personagem perde atributos) ou Reversão (cura e dano se invertem).',
    categoriaCorporal: 'eterio', tipoDano: 'magico',
  },
  {
    dificuldade: 7, id: 'nekrath-morte', nome: 'Nekrath, a Morte', carta: 'A Morte',
    mecanicaNome: 'Ceifador de Almas',
    mecanicaDescricao: 'Cada 20% da vida máxima que o personagem perde cria uma alma espectral; com 3 almas o chefe recupera vida e fortalece o próximo ataque.',
    categoriaCorporal: 'sombrio', elementoAtaque: 'sombrio', tipoDano: 'fisico',
  },
  {
    dificuldade: 8, id: 'belzareth-diabo', nome: 'Belzareth, o Diabo', carta: 'O Diabo',
    mecanicaNome: 'Pacto Profano',
    mecanicaDescricao: 'No início da luta recebe uma maldição aleatória que muda as regras: cura reduzida, dano de retorno nos críticos ou parte do dano convertida em escudo.',
    categoriaCorporal: 'aberrante', elementoAtaque: 'fogo', tipoDano: 'magico',
  },
  {
    dificuldade: 9, id: 'kolossar-torre', nome: 'Kolossar, a Torre', carta: 'A Torre',
    mecanicaNome: 'Colapso Estrutural',
    mecanicaDescricao: 'Três partes vulneráveis (núcleo, braços e couraça), uma exposta por fase. Sem dano suficiente na parte exposta em 3 turnos, executa um colapso de dano massivo.',
    categoriaCorporal: 'rochoso', tipoDano: 'fisico',
  },
  {
    dificuldade: 10, id: 'aetherion-mundo', nome: 'Aetherion, o Mundo', carta: 'O Mundo',
    mecanicaNome: 'Ciclo da Existência',
    mecanicaDescricao: 'Alterna quatro estados: Criação (escudo), Expansão (mais ataque), Declínio (desgaste) e Renascimento (recupera vida e reinicia o ciclo).',
    categoriaCorporal: 'eterio', elementoAtaque: 'sagrado', tipoDano: 'magico',
  },
];

export const CHEFE_GUERREIRO_POR_DIFICULDADE: Readonly<Record<number, ChefeGuerreiro>> = Object.fromEntries(
  CHEFES_GUERREIRO.map((c) => [c.dificuldade, c])
);
