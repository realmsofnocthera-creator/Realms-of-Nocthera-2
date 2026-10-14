import type { AcaoMonstro } from '@/rules/monsters';
import type { Attributes } from '@/rules/attributes';
import type { DebuffAtivo } from './efeitosDebuffs';

/**
 * Mecânicas únicas dos chefes da Provação do Guerreiro (Yuri, 14/10/2026). Cada chefe tem uma mecânica própria,
 * inspirada na carta de Tarô dele; como o combate é automático, elas funcionam por contagem de ataques, condições
 * e gatilhos. Todos os números ficam em `MECANICAS_PARAMETROS` para o Yuri ajustar.
 */
export type MecanicaChefeId =
  | 'caosImprevisivel' // Astaroth, o Louco
  | 'convergenciaArcana' // Zephyron, o Mago
  | 'investidaImparavel' // Thundrak, o Carro
  | 'furiaContida' // Gorvath, a Força
  | 'balancaDoJulgamento'; // Veredar, a Justiça

export const MECANICAS_PARAMETROS = {
  caosImprevisivel: {
    aCada: 3,
    ataqueDevastadorPercentual: 220,
    explosaoElementalPercentual: 170,
    recuperacaoCuraPercentualHpMax: 12,
    recuperacaoDanoPercentual: 40,
  },
  convergenciaArcana: {
    /** Ataques do chefe para completar os 3 acúmulos de energia. */
    aCada: 3,
    explosivoPercentual: 190,
    debilitanteDanoPercentual: 130,
    debilitanteEnfraquecimentoPercentual: 20,
    debilitanteLentidaoPercentual: 20,
    debilitanteRodadas: 2,
  },
  investidaImparavel: {
    aCada: 4,
    danoPercentual: 240,
    danoInterrompidoPercentual: 110,
    reducaoDefesaPercentual: 25,
    reducaoDefesaRodadas: 2,
  },
  furiaContida: {
    /** Fúria ganha por 1% da vida máxima perdida pelo chefe. */
    furiaPorPercentualDeVida: 3,
    limiteDaFuria: 100,
    frenesiRodadas: 2,
    frenesiBonusDanoPercentual: 40,
    vulneravelRodadas: 2,
    vulneravelBonusDanoRecebidoPercentual: 25,
  },
  balancaDoJulgamento: {
    aCada: 3,
    /** Fatia ofensiva (Força, Inteligência e Arcano contra Vigor e Vitalidade) acima da qual a build é punida. */
    limiteOfensivoPercentual: 70,
    /** Fatia ofensiva abaixo da qual a build é considerada excessivamente defensiva. */
    limiteDefensivoPercentual: 40,
    sentencaOfensivaEnfraquecimentoPercentual: 25,
    sentencaDefensivaReducaoDefesaPercentual: 25,
    sentencaRodadas: 2,
    equilibrioDanoPercentual: 150,
  },
} as const;

export interface EstadoMecanicaChefe {
  id: MecanicaChefeId;
  /** Ataques que o chefe já fez (base dos "a cada N turnos"). */
  ataques: number;
  /** Gorvath: fúria acumulada, rodadas de frenesi e rodadas de vulnerabilidade que faltam. */
  furia: number;
  frenesiRestante: number;
  vulneravelRestante: number;
}

export function criarEstadoMecanica(id: MecanicaChefeId): EstadoMecanicaChefe {
  return { id, ataques: 0, furia: 0, frenesiRestante: 0, vulneravelRestante: 0 };
}

export interface ContextoMecanica {
  /** Sorteio em [0, 100), determinístico pela semente, por índice. */
  sorteio: (indice: number) => number;
  /** O personagem que o chefe ataca. */
  alvo: { atributos: Attributes };
  /** Debuffs que o personagem colocou no chefe. */
  debuffsDoChefe?: readonly DebuffAtivo[];
}

const TIPOS_QUE_INTERROMPEM = new Set(['enfraquecimento', 'lentidao', 'exaustao', 'distracao', 'sono', 'loucura', 'paralisia']);

/** A investida do Thundrak é interrompida por um efeito de controle ou de redução de ataque no chefe. */
export function investidaInterrompida(debuffsDoChefe: readonly DebuffAtivo[] | undefined): boolean {
  return (debuffsDoChefe ?? []).some((d) => TIPOS_QUE_INTERROMPEM.has(d.tipo) && d.rodadasRestantes > 0);
}

/** Fatia ofensiva do personagem em % (Força, Inteligência e Arcano contra Vigor e Vitalidade). */
export function fatiaOfensivaPercentual(a: Attributes): number {
  const ofensivo = a.forca + a.inteligencia + a.arcano;
  const defensivo = a.vigor + a.vitalidade;
  const total = ofensivo + defensivo;
  return total > 0 ? (ofensivo / total) * 100 : 50;
}

const ELEMENTOS_DA_EXPLOSAO = ['fogo', 'gelo', 'relampago'] as const;

/**
 * Chamada em cada ataque do chefe: conta o ataque e devolve a ação especial desta vez (ou undefined para o ataque
 * básico). O sorteio vem da semente, então o mesmo combate sempre dá o mesmo resultado.
 */
export function escolherAcaoMecanica(estado: EstadoMecanicaChefe, ctx: ContextoMecanica): AcaoMonstro | undefined {
  estado.ataques += 1;
  switch (estado.id) {
    case 'caosImprevisivel': {
      const p = MECANICAS_PARAMETROS.caosImprevisivel;
      if (estado.ataques % p.aCada !== 0) return undefined;
      const escolha = Math.floor((ctx.sorteio(0) / 100) * 3);
      if (escolha === 0) return { nome: 'Golpe Devastador', efeito: { percentualDano: p.ataqueDevastadorPercentual } };
      if (escolha === 1) {
        const elemento = ELEMENTOS_DA_EXPLOSAO[Math.floor((ctx.sorteio(1) / 100) * ELEMENTOS_DA_EXPLOSAO.length)];
        return { nome: 'Explosão Elemental', efeito: { percentualDano: p.explosaoElementalPercentual, elemento } };
      }
      return { nome: 'Recuperação Caótica', efeito: { percentualDano: p.recuperacaoDanoPercentual, curaPercentualHpMax: p.recuperacaoCuraPercentualHpMax } };
    }
    case 'convergenciaArcana': {
      const p = MECANICAS_PARAMETROS.convergenciaArcana;
      if (estado.ataques % p.aCada !== 0) return undefined;
      const combinacao = Math.floor((ctx.sorteio(0) / 100) * 4);
      if (combinacao === 0) return { nome: 'Convergência: Fogo e Relâmpago', efeito: { percentualDano: p.explosivoPercentual, elemento: 'fogo' } };
      if (combinacao === 1) {
        return {
          nome: 'Convergência: Gelo e Sombrio',
          efeito: {
            percentualDano: p.debilitanteDanoPercentual,
            elemento: 'gelo',
            efeitosNoAlvo: [
              { tipo: 'enfraquecimento', percentual: p.debilitanteEnfraquecimentoPercentual, rodadas: p.debilitanteRodadas },
              { tipo: 'lentidao', percentual: p.debilitanteLentidaoPercentual, rodadas: p.debilitanteRodadas },
            ],
          },
        };
      }
      // PROPOSTAS (o Yuri deu só dois exemplos): Terra e Vento reduzem a defesa; Sagrado e Sombrio ignoram parte da defesa
      if (combinacao === 2) {
        return { nome: 'Convergência: Terra e Vento', efeito: { percentualDano: p.debilitanteDanoPercentual, elemento: 'terra', efeitosNoAlvo: [{ tipo: 'reducaoDefesa', percentual: 25, rodadas: p.debilitanteRodadas }] } };
      }
      return { nome: 'Convergência: Sagrado e Sombrio', efeito: { percentualDano: p.explosivoPercentual, elemento: 'sagrado', ignorarDefesaPercentual: 30 } };
    }
    case 'investidaImparavel': {
      const p = MECANICAS_PARAMETROS.investidaImparavel;
      if (estado.ataques % p.aCada !== 0) return undefined;
      if (investidaInterrompida(ctx.debuffsDoChefe)) {
        return { nome: 'Investida Interrompida', efeito: { percentualDano: p.danoInterrompidoPercentual } };
      }
      return {
        nome: 'Investida Imparável',
        efeito: {
          percentualDano: p.danoPercentual,
          efeitosNoAlvo: [{ tipo: 'reducaoDefesa', percentual: p.reducaoDefesaPercentual, rodadas: p.reducaoDefesaRodadas }],
        },
      };
    }
    case 'balancaDoJulgamento': {
      const p = MECANICAS_PARAMETROS.balancaDoJulgamento;
      if (estado.ataques % p.aCada !== 0) return undefined;
      const fatia = fatiaOfensivaPercentual(ctx.alvo.atributos);
      if (fatia > p.limiteOfensivoPercentual) {
        return {
          nome: 'Sentença: Excesso de Ataque',
          efeito: { percentualDano: p.equilibrioDanoPercentual, efeitosNoAlvo: [{ tipo: 'enfraquecimento', percentual: p.sentencaOfensivaEnfraquecimentoPercentual, rodadas: p.sentencaRodadas }] },
        };
      }
      if (fatia < p.limiteDefensivoPercentual) {
        return {
          nome: 'Sentença: Excesso de Defesa',
          efeito: { percentualDano: p.equilibrioDanoPercentual, efeitosNoAlvo: [{ tipo: 'reducaoDefesa', percentual: p.sentencaDefensivaReducaoDefesaPercentual, rodadas: p.sentencaRodadas }] },
        };
      }
      return { nome: 'Sentença: Equilíbrio', efeito: { percentualDano: p.equilibrioDanoPercentual } };
    }
    default:
      return undefined;
  }
}

/** Bônus de dano (%) que a mecânica dá ao chefe que ataca (Gorvath em frenesi). */
export function bonusDanoDaMecanica(estado: EstadoMecanicaChefe | undefined): number {
  if (!estado) return 0;
  return estado.id === 'furiaContida' && estado.frenesiRestante > 0 ? MECANICAS_PARAMETROS.furiaContida.frenesiBonusDanoPercentual : 0;
}

/** Bônus de dano (%) que quem ataca o chefe ganha (Gorvath vulnerável depois do frenesi). */
export function bonusDanoContraAMecanica(estado: EstadoMecanicaChefe | undefined): number {
  if (!estado) return 0;
  return estado.id === 'furiaContida' && estado.vulneravelRestante > 0 ? MECANICAS_PARAMETROS.furiaContida.vulneravelBonusDanoRecebidoPercentual : 0;
}

/**
 * Chamada no fim de cada rodada, depois que os dois lados agiram. `danoSofridoDoChefe` é a vida mais o Sobreescudo
 * que o chefe perdeu nesta rodada. Devolve as mensagens do que mudou (aparecem no replay).
 */
export function atualizarMecanicaNoFimDaRodada(
  estado: EstadoMecanicaChefe,
  info: { nomeDoChefe: string; danoSofridoDoChefe: number; hpMaxDoChefe: number }
): string[] {
  const mensagens: string[] = [];
  if (estado.id !== 'furiaContida') return mensagens;
  const p = MECANICAS_PARAMETROS.furiaContida;
  if (estado.frenesiRestante > 0) {
    estado.frenesiRestante -= 1;
    if (estado.frenesiRestante === 0) {
      estado.furia = 0;
      estado.vulneravelRestante = p.vulneravelRodadas;
      mensagens.push(`${info.nomeDoChefe} sai do frenesi, sem fôlego: fica vulnerável!`);
    }
    return mensagens;
  }
  if (estado.vulneravelRestante > 0) {
    estado.vulneravelRestante -= 1;
    return mensagens;
  }
  const percentualPerdido = info.hpMaxDoChefe > 0 ? (info.danoSofridoDoChefe / info.hpMaxDoChefe) * 100 : 0;
  estado.furia = Math.min(p.limiteDaFuria, estado.furia + Math.floor(percentualPerdido * p.furiaPorPercentualDeVida));
  if (estado.furia >= p.limiteDaFuria) {
    estado.frenesiRestante = p.frenesiRodadas;
    mensagens.push(`${info.nomeDoChefe} explode em frenesi!`);
  }
  return mensagens;
}
