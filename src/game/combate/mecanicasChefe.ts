import type { AcaoMonstro } from '@/rules/monsters';
import type { Attributes } from '@/rules/attributes';
import type { AplicacaoDebuff, DebuffAtivo } from './efeitosDebuffs';

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
  | 'balancaDoJulgamento' // Veredar, a Justiça
  | 'destinoGiratorio' // Selvara, a Roda da Fortuna
  | 'ceifadorDeAlmas' // Nekrath, a Morte
  | 'pactoProfano' // Belzareth, o Diabo
  | 'colapsoEstrutural' // Kolossar, a Torre
  | 'cicloDaExistencia'; // Aetherion, o Mundo

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
  destinoGiratorio: {
    aCadaRodadas: 2,
    /** Fortuna: o chefe perde defesa. */
    fortunaReducaoDefesaPercentual: 30,
    /** Infortúnio: o personagem perde ataque e agilidade. */
    infortunioEnfraquecimentoPercentual: 20,
    infortunioExaustaoPercentual: 20,
    efeitoRodadas: 2,
    /** Reversão: a próxima cura do personagem vira dano (do mesmo tamanho); vale por até estas rodadas. */
    reversaoDuracaoRodadas: 4,
  },
  ceifadorDeAlmas: {
    /** Cada tanto da vida máxima do personagem perdida cria uma alma. */
    almaPorPercentualDaVidaPerdida: 20,
    almasParaCeifar: 3,
    curaPercentualHpMax: 15,
    ataqueFortalecidoBonusDanoPercentual: 50,
  },
  pactoProfano: {
    /** Pacto da Ruína: a cura que o personagem recebe cai este tanto. */
    curaReduzidaPercentual: 40,
    /** Pacto do Sangue: cada crítico do personagem devolve este tanto do dano dele a ele. */
    danoDeRetornoDoCriticoPercentual: 10,
    /** Pacto da Muralha: este tanto do dano que o chefe recebe vira Sobreescudo. */
    danoConvertidoEmEscudoPercentual: 25,
  },
  colapsoEstrutural: {
    rodadasPorFase: 3,
    /** Dano mínimo (% da vida máxima do chefe) na janela de cada parte exposta: núcleo, braços e couraça. */
    limiteNucleoPercentual: 8,
    limiteBracosPercentual: 6,
    limiteCouracaPercentual: 10,
    colapsoDanoPercentual: 350,
  },
  cicloDaExistencia: {
    rodadasPorEstado: 2,
    /** Criação: Sobreescudo (% da vida máxima do chefe) e menos dano recebido. */
    criacaoEscudoPercentualHpMax: 15,
    criacaoReducaoDanoRecebidoPercentual: 10,
    /** Expansão: mais dano causado. */
    expansaoBonusDanoPercentual: 30,
    /** Declínio: desgaste no personagem; o chefe fica exposto (janela de vulnerabilidade). */
    declinioExaustaoPercentual: 20,
    declinioReducaoDefesaPercentual: 15,
    declinioBonusDanoRecebidoPercentual: 25,
    declinioRodadas: 2,
    /** Renascimento: recupera vida e fica um pouco exposto. */
    renascimentoCuraPercentualHpMax: 12,
    renascimentoBonusDanoRecebidoPercentual: 15,
  },
} as const;

export interface EstadoMecanicaChefe {
  id: MecanicaChefeId;
  /** Ataques que o chefe já fez (base dos "a cada N turnos"). */
  ataques: number;
  /** Rodada que está valendo (começa em 1; sobe no fim de cada rodada). */
  rodada: number;
  /** Gorvath: fúria acumulada, rodadas de frenesi e rodadas de vulnerabilidade que faltam. */
  furia: number;
  frenesiRestante: number;
  vulneravelRestante: number;
  /** Selvara: rodadas que faltam para a Reversão expirar (0 = sem Reversão pendente). */
  reversaoRestante: number;
  /** Nekrath: vida do personagem perdida e ainda não contada em almas (em pontos), almas e ataque fortalecido. */
  perdaAcumulada: number;
  almas: number;
  proximoAtaqueFortalecido: boolean;
  ataqueFortalecidoAgora: boolean;
  /** Belzareth: o pacto sorteado (0 Ruína, 1 Sangue, 2 Muralha; -1 antes do sorteio). */
  pacto: number;
  /** Kolossar: parte exposta (0 núcleo, 1 braços, 2 couraça), rodadas e dano na fase, e colapso a caminho. */
  parte: number;
  rodadasNaFase: number;
  danoNaFase: number;
  colapsoPendente: boolean;
}

export function criarEstadoMecanica(id: MecanicaChefeId): EstadoMecanicaChefe {
  return {
    id,
    ataques: 0,
    rodada: 1,
    furia: 0,
    frenesiRestante: 0,
    vulneravelRestante: 0,
    reversaoRestante: 0,
    perdaAcumulada: 0,
    almas: 0,
    proximoAtaqueFortalecido: false,
    ataqueFortalecidoAgora: false,
    pacto: -1,
    parte: 0,
    rodadasNaFase: 0,
    danoNaFase: 0,
    colapsoPendente: false,
  };
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
    case 'ceifadorDeAlmas':
      // O ataque fortalecido vale só para o ataque seguinte à colheita
      estado.ataqueFortalecidoAgora = estado.proximoAtaqueFortalecido;
      estado.proximoAtaqueFortalecido = false;
      return undefined;
    case 'colapsoEstrutural':
      if (estado.colapsoPendente) {
        estado.colapsoPendente = false;
        return { nome: 'Colapso Estrutural', efeito: { percentualDano: MECANICAS_PARAMETROS.colapsoEstrutural.colapsoDanoPercentual } };
      }
      return undefined;
    default:
      return undefined;
  }
}

export const NOMES_DOS_ESTADOS_DO_CICLO = ['Criação', 'Expansão', 'Declínio', 'Renascimento'] as const;
export const NOMES_DAS_PARTES = ['o núcleo', 'os braços', 'a couraça'] as const;
export const NOMES_DOS_PACTOS = ['Pacto da Ruína', 'Pacto do Sangue', 'Pacto da Muralha'] as const;

/** O estado do Ciclo da Existência (0 Criação, 1 Expansão, 2 Declínio, 3 Renascimento) na rodada informada. */
export function estadoDoCiclo(rodada: number): number {
  return Math.floor((Math.max(1, rodada) - 1) / MECANICAS_PARAMETROS.cicloDaExistencia.rodadasPorEstado) % 4;
}

/** Bônus de dano (%) que a mecânica dá ao chefe que ataca (Gorvath em frenesi, Nekrath fortalecido, Aetherion em Expansão). */
export function bonusDanoDaMecanica(estado: EstadoMecanicaChefe | undefined): number {
  if (!estado) return 0;
  if (estado.id === 'furiaContida' && estado.frenesiRestante > 0) return MECANICAS_PARAMETROS.furiaContida.frenesiBonusDanoPercentual;
  if (estado.id === 'ceifadorDeAlmas' && estado.ataqueFortalecidoAgora) return MECANICAS_PARAMETROS.ceifadorDeAlmas.ataqueFortalecidoBonusDanoPercentual;
  if (estado.id === 'cicloDaExistencia' && estadoDoCiclo(estado.rodada) === 1) return MECANICAS_PARAMETROS.cicloDaExistencia.expansaoBonusDanoPercentual;
  return 0;
}

/** Bônus de dano (%) que quem ataca o chefe ganha (negativo = o chefe recebe menos dano). */
export function bonusDanoContraAMecanica(estado: EstadoMecanicaChefe | undefined): number {
  if (!estado) return 0;
  if (estado.id === 'furiaContida' && estado.vulneravelRestante > 0) return MECANICAS_PARAMETROS.furiaContida.vulneravelBonusDanoRecebidoPercentual;
  if (estado.id === 'cicloDaExistencia') {
    const p = MECANICAS_PARAMETROS.cicloDaExistencia;
    const ciclo = estadoDoCiclo(estado.rodada);
    if (ciclo === 0) return -p.criacaoReducaoDanoRecebidoPercentual;
    if (ciclo === 2) return p.declinioBonusDanoRecebidoPercentual;
    if (ciclo === 3) return p.renascimentoBonusDanoRecebidoPercentual;
  }
  return 0;
}

export interface InicioDaMecanica {
  mensagens: string[];
  debuffsNoPersonagem?: AplicacaoDebuff[];
}

/** Chamada uma vez, antes da primeira rodada (Belzareth sorteia o pacto da luta). */
export function iniciarMecanica(estado: EstadoMecanicaChefe, info: { nomeDoChefe: string; sorteio: (indice: number) => number }): InicioDaMecanica {
  if (estado.id !== 'pactoProfano') return { mensagens: [] };
  const p = MECANICAS_PARAMETROS.pactoProfano;
  estado.pacto = Math.min(2, Math.floor((info.sorteio(0) / 100) * 3));
  const mensagens = [`${info.nomeDoChefe} sela o ${NOMES_DOS_PACTOS[estado.pacto]}!`];
  if (estado.pacto === 0) {
    // Sem fim dentro da luta: a duração é maior que qualquer combate
    return { mensagens, debuffsNoPersonagem: [{ tipo: 'cicatrizacao', percentual: p.curaReduzidaPercentual, rodadas: 9999 }] };
  }
  return { mensagens };
}

export interface InfoDaRodada {
  rodada: number;
  chefe: { nome: string; hpMax: number };
  personagem: { nome: string; hpMax: number };
  /** Vida e Sobreescudo que o chefe perdeu nesta rodada. */
  danoSofridoDoChefe: number;
  /** Vida que o personagem perdeu nesta rodada (já somando a cura que ele recebeu, para a perda ser bruta). */
  perdaDeVidaDoPersonagem: number;
  curaRecebidaPeloPersonagem: number;
  /** Golpes críticos do personagem nesta rodada e o dano que causaram. */
  criticosDoPersonagem: { golpes: number; dano: number };
  sorteio: (indice: number) => number;
}

export interface EfeitosDaRodada {
  mensagens: string[];
  danoAoPersonagem?: number;
  curaDoChefe?: number;
  escudoDoChefe?: number;
  debuffsNoPersonagem?: AplicacaoDebuff[];
  debuffsNoChefe?: AplicacaoDebuff[];
}

/**
 * Chamada no fim de cada rodada, depois que os dois lados agiram. Muda o estado da mecânica e devolve o que
 * precisa acontecer na luta (dano, cura, escudo, debuffs) e as mensagens que aparecem no replay.
 */
export function atualizarMecanicaNoFimDaRodada(estado: EstadoMecanicaChefe, info: InfoDaRodada): EfeitosDaRodada {
  const efeitos: EfeitosDaRodada = { mensagens: [] };
  const nome = info.chefe.nome;
  switch (estado.id) {
    case 'furiaContida': {
      const p = MECANICAS_PARAMETROS.furiaContida;
      if (estado.frenesiRestante > 0) {
        estado.frenesiRestante -= 1;
        if (estado.frenesiRestante === 0) {
          estado.furia = 0;
          estado.vulneravelRestante = p.vulneravelRodadas;
          efeitos.mensagens.push(`${nome} sai do frenesi, sem fôlego: fica vulnerável!`);
        }
        break;
      }
      if (estado.vulneravelRestante > 0) {
        estado.vulneravelRestante -= 1;
        break;
      }
      const percentualPerdido = info.chefe.hpMax > 0 ? (info.danoSofridoDoChefe / info.chefe.hpMax) * 100 : 0;
      estado.furia = Math.min(p.limiteDaFuria, estado.furia + Math.floor(percentualPerdido * p.furiaPorPercentualDeVida));
      if (estado.furia >= p.limiteDaFuria) {
        estado.frenesiRestante = p.frenesiRodadas;
        efeitos.mensagens.push(`${nome} explode em frenesi!`);
      }
      break;
    }
    case 'destinoGiratorio': {
      const p = MECANICAS_PARAMETROS.destinoGiratorio;
      // Reversão pendente: a próxima cura do personagem vira dano do mesmo tamanho (ele perde o que ganharia, e mais o mesmo valor)
      if (estado.reversaoRestante > 0) {
        if (info.curaRecebidaPeloPersonagem > 0) {
          efeitos.danoAoPersonagem = Math.floor(info.curaRecebidaPeloPersonagem * 2);
          estado.reversaoRestante = 0;
          efeitos.mensagens.push(`Reversão! A cura de ${Math.round(info.curaRecebidaPeloPersonagem)} virou dano em ${info.personagem.nome}.`);
        } else {
          estado.reversaoRestante -= 1;
        }
      }
      if (info.rodada % p.aCadaRodadas === 0) {
        const escolha = Math.min(2, Math.floor((info.sorteio(0) / 100) * 3));
        if (escolha === 0) {
          efeitos.debuffsNoChefe = [{ tipo: 'reducaoDefesa', percentual: p.fortunaReducaoDefesaPercentual, rodadas: p.efeitoRodadas }];
          efeitos.mensagens.push(`A Roda gira: Fortuna! ${nome} perde defesa.`);
        } else if (escolha === 1) {
          efeitos.debuffsNoPersonagem = [
            { tipo: 'enfraquecimento', percentual: p.infortunioEnfraquecimentoPercentual, rodadas: p.efeitoRodadas },
            { tipo: 'exaustao', percentual: p.infortunioExaustaoPercentual, rodadas: p.efeitoRodadas },
          ];
          efeitos.mensagens.push(`A Roda gira: Infortúnio! ${info.personagem.nome} perde ataque e agilidade.`);
        } else {
          estado.reversaoRestante = p.reversaoDuracaoRodadas;
          efeitos.mensagens.push('A Roda gira: Reversão! A próxima cura virará dano.');
        }
      }
      break;
    }
    case 'ceifadorDeAlmas': {
      const p = MECANICAS_PARAMETROS.ceifadorDeAlmas;
      const limiar = (info.personagem.hpMax * p.almaPorPercentualDaVidaPerdida) / 100;
      estado.perdaAcumulada += info.perdaDeVidaDoPersonagem;
      while (limiar > 0 && estado.perdaAcumulada >= limiar && estado.almas < p.almasParaCeifar) {
        estado.perdaAcumulada -= limiar;
        estado.almas += 1;
        efeitos.mensagens.push(`${nome} colhe uma alma espectral (${estado.almas}/${p.almasParaCeifar}).`);
      }
      if (estado.almas >= p.almasParaCeifar) {
        estado.almas = 0;
        estado.proximoAtaqueFortalecido = true;
        efeitos.curaDoChefe = Math.floor((info.chefe.hpMax * p.curaPercentualHpMax) / 100);
        efeitos.mensagens.push(`${nome} ceifa as almas: recupera vida e seu próximo ataque será mais forte!`);
      }
      break;
    }
    case 'pactoProfano': {
      const p = MECANICAS_PARAMETROS.pactoProfano;
      if (estado.pacto === 1 && info.criticosDoPersonagem.golpes > 0) {
        const retorno = Math.floor((info.criticosDoPersonagem.dano * p.danoDeRetornoDoCriticoPercentual) / 100);
        if (retorno > 0) {
          efeitos.danoAoPersonagem = retorno;
          efeitos.mensagens.push(`Pacto do Sangue: o crítico devolve ${retorno} de dano a ${info.personagem.nome}.`);
        }
      }
      if (estado.pacto === 2) {
        const escudo = Math.floor((info.danoSofridoDoChefe * p.danoConvertidoEmEscudoPercentual) / 100);
        if (escudo > 0) {
          efeitos.escudoDoChefe = escudo;
          efeitos.mensagens.push(`Pacto da Muralha: ${nome} converte ${escudo} do dano em escudo.`);
        }
      }
      break;
    }
    case 'colapsoEstrutural': {
      const p = MECANICAS_PARAMETROS.colapsoEstrutural;
      if (info.rodada === 1) efeitos.mensagens.push(`${nome} expõe ${NOMES_DAS_PARTES[estado.parte]}!`);
      estado.rodadasNaFase += 1;
      estado.danoNaFase += info.danoSofridoDoChefe;
      if (estado.rodadasNaFase >= p.rodadasPorFase) {
        const limitePercentual = [p.limiteNucleoPercentual, p.limiteBracosPercentual, p.limiteCouracaPercentual][estado.parte];
        const limite = (info.chefe.hpMax * limitePercentual) / 100;
        if (estado.danoNaFase < limite) {
          estado.colapsoPendente = true;
          efeitos.mensagens.push(`${nome} não sofreu dano suficiente na parte exposta: o colapso vem aí!`);
        } else {
          efeitos.mensagens.push(`${nome} foi ferido o bastante na parte exposta: o colapso foi evitado.`);
        }
        estado.parte = (estado.parte + 1) % 3;
        estado.rodadasNaFase = 0;
        estado.danoNaFase = 0;
        efeitos.mensagens.push(`${nome} expõe ${NOMES_DAS_PARTES[estado.parte]}!`);
      }
      break;
    }
    case 'cicloDaExistencia': {
      const p = MECANICAS_PARAMETROS.cicloDaExistencia;
      const entrar = (ciclo: number) => {
        if (ciclo === 0) {
          efeitos.escudoDoChefe = Math.floor((info.chefe.hpMax * p.criacaoEscudoPercentualHpMax) / 100);
          efeitos.mensagens.push(`${nome} entra em Criação e se cobre de escudo.`);
        } else if (ciclo === 1) {
          efeitos.mensagens.push(`${nome} entra em Expansão: o ataque cresce.`);
        } else if (ciclo === 2) {
          efeitos.debuffsNoPersonagem = [
            { tipo: 'exaustao', percentual: p.declinioExaustaoPercentual, rodadas: p.declinioRodadas },
            { tipo: 'reducaoDefesa', percentual: p.declinioReducaoDefesaPercentual, rodadas: p.declinioRodadas },
          ];
          efeitos.mensagens.push(`${nome} entra em Declínio: o desgaste cai sobre ${info.personagem.nome}, mas ele fica exposto.`);
        } else {
          efeitos.curaDoChefe = Math.floor((info.chefe.hpMax * p.renascimentoCuraPercentualHpMax) / 100);
          efeitos.mensagens.push(`${nome} renasce e recupera vida; o ciclo recomeça.`);
        }
      };
      if (info.rodada === 1) entrar(estadoDoCiclo(1));
      if (estadoDoCiclo(info.rodada + 1) !== estadoDoCiclo(info.rodada)) entrar(estadoDoCiclo(info.rodada + 1));
      break;
    }
    default:
      break;
  }
  estado.rodada = info.rodada + 1;
  return efeitos;
}
