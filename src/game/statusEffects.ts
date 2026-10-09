import {
  BASE_PERCENTUAL_EFEITO,
  DANO_MINIMO_EFEITO,
  DIVISOR_PRECISAO_SORTEIO,
  EFEITOS_STATUS,
  EfeitoStatus,
  ESCALA_PRECISAO_SORTEIO,
  HASH_ATAQUE_MULT,
  HASH_MIX_MULT,
  HASH_RODADA_MULT,
  HASH_SEED_MULT,
} from '@/rules/statusEffects';

export interface EfeitoAtivo {
  id: EfeitoStatus;
  rodadasRestantes: number;
}

export type ResultadoTentativaEfeito =
  | 'nao_ativou'
  | 'aplicado'
  | 'renovado'
  | 'instantaneo'
  | 'controle';

export interface EventoEfeito {
  tipo: 'aplicado' | 'renovado' | 'instantaneo' | 'controle' | 'imune' | 'dano' | 'expirado' | 'removido';
  efeito: EfeitoStatus;
  dano?: number;
  rodadasRestantes?: number;
  /** Quem sofre o efeito, quando não é o personagem (ex.: o monstro com Sangramento Forçado). */
  alvo?: string;
}

/**
 * Clona um Map de efeitos ativos sem mutar o original nem seus objetos internos.
 */
function clonarMapaEfeitos(
  efeitos: Map<EfeitoStatus, EfeitoAtivo>
): Map<EfeitoStatus, EfeitoAtivo> {
  const copia = new Map<EfeitoStatus, EfeitoAtivo>();
  for (const [id, ativo] of efeitos.entries()) {
    copia.set(id, { ...ativo });
  }
  return copia;
}

/**
 * Tenta aplicar um efeito de status a partir de um sorteio em [0, 100):
 * - Ativa somente se `sorteio < chanceAtivacao`; a resistência do alvo (1.4.3) reduz essa chance em % relativo.
 * - Se for 'instantaneo', retorna 'instantaneo' sem guardar nada no Map.
 * - Se for 'dot' e não existir no Map, cria com `rodadasRestantes = duracaoRodadas` ('aplicado').
 * - Se for 'dot' e já existir no Map, redefine `rodadasRestantes = duracaoRodadas` sem empilhar ('renovado').
 * - Não muta o Map recebido.
 */
export function tentarAplicarEfeito(
  efeitos: Map<EfeitoStatus, EfeitoAtivo>,
  id: EfeitoStatus,
  sorteio: number,
  reducaoChancePercentual = 0
): {
  efeitos: Map<EfeitoStatus, EfeitoAtivo>;
  resultado: ResultadoTentativaEfeito;
} {
  const novoMapa = clonarMapaEfeitos(efeitos);
  const definicao = EFEITOS_STATUS[id];

  const chanceEfetiva = definicao
    ? (definicao.chanceAtivacao * (BASE_PERCENTUAL_EFEITO - Math.min(BASE_PERCENTUAL_EFEITO, Math.max(0, reducaoChancePercentual)))) /
      BASE_PERCENTUAL_EFEITO
    : 0;

  if (!definicao || sorteio >= chanceEfetiva) {
    return {
      efeitos: novoMapa,
      resultado: 'nao_ativou',
    };
  }

  if (definicao.tipo === 'instantaneo') {
    return {
      efeitos: novoMapa,
      resultado: 'instantaneo',
    };
  }

  if (definicao.tipo === 'controle') {
    return {
      efeitos: novoMapa,
      resultado: 'controle',
    };
  }

  if (definicao.tipo === 'dot') {
    const duracao = definicao.duracaoRodadas ?? DANO_MINIMO_EFEITO;
    const jaExistia = novoMapa.has(id);
    novoMapa.set(id, {
      id,
      rodadasRestantes: duracao,
    });

    return {
      efeitos: novoMapa,
      resultado: jaExistia ? 'renovado' : 'aplicado',
    };
  }

  return {
    efeitos: novoMapa,
    resultado: 'nao_ativou',
  };
}

/**
 * Calcula o dano de um efeito de status baseado no percentual do HP máximo,
 * garantindo no mínimo 1 de dano.
 */
export function calcularDanoEfeito(hpMax: number, percentualHpMax: number): number {
  return Math.max(
    DANO_MINIMO_EFEITO,
    Math.floor((hpMax * percentualHpMax) / BASE_PERCENTUAL_EFEITO)
  );
}

/**
 * Processa o tick de fim de rodada para todos os efeitos 'dot' ativos:
 * - Calcula o dano de cada efeito 'dot' ativo, registra evento 'dano' e decrementa `rodadasRestantes`.
 * - Se `rodadasRestantes` chegar a 0, remove o efeito do Map e registra evento 'expirado'.
 * - Retorna um novo Map sem mutar o Map recebido.
 */
export function processarTickEfeitos(
  efeitos: Map<EfeitoStatus, EfeitoAtivo>,
  hpMax: number
): {
  efeitos: Map<EfeitoStatus, EfeitoAtivo>;
  eventos: EventoEfeito[];
  danoTotal: number;
} {
  const novoMapa = new Map<EfeitoStatus, EfeitoAtivo>();
  const eventos: EventoEfeito[] = [];
  let danoTotal = 0;

  for (const [id, ativo] of efeitos.entries()) {
    const definicao = EFEITOS_STATUS[id];
    if (!definicao || definicao.tipo !== 'dot') {
      continue;
    }

    const dano = calcularDanoEfeito(hpMax, definicao.percentualHpMax);
    const novasRodadas = ativo.rodadasRestantes - DANO_MINIMO_EFEITO;
    danoTotal += dano;

    eventos.push({
      tipo: 'dano',
      efeito: id,
      dano,
      rodadasRestantes: novasRodadas,
    });

    if (novasRodadas <= 0) {
      eventos.push({
        tipo: 'expirado',
        efeito: id,
        rodadasRestantes: 0,
      });
    } else {
      novoMapa.set(id, {
        id,
        rodadasRestantes: novasRodadas,
      });
    }
  }

  return {
    efeitos: novoMapa,
    eventos,
    danoTotal,
  };
}

/**
 * Remove efeitos ativos priorizando os de maior `rodadasRestantes`, ou 'todos'.
 * Não muta o Map recebido.
 */
export function removerEfeitos(
  efeitos: Map<EfeitoStatus, EfeitoAtivo>,
  quantidade: number | 'todos'
): {
  efeitos: Map<EfeitoStatus, EfeitoAtivo>;
  removidos: EfeitoStatus[];
} {
  const novoMapa = clonarMapaEfeitos(efeitos);
  if (novoMapa.size === 0) {
    return {
      efeitos: novoMapa,
      removidos: [],
    };
  }

  const ordenadosPorDuracao = Array.from(novoMapa.values()).sort(
    (a, b) => b.rodadasRestantes - a.rodadasRestantes
  );

  if (quantidade === 'todos') {
    const removidos = ordenadosPorDuracao.map((item) => item.id);
    return {
      efeitos: new Map<EfeitoStatus, EfeitoAtivo>(),
      removidos,
    };
  }

  if (quantidade <= 0) {
    return {
      efeitos: novoMapa,
      removidos: [],
    };
  }

  const alvosParaRemover = ordenadosPorDuracao.slice(0, quantidade);
  const removidos: EfeitoStatus[] = [];

  for (const alvo of alvosParaRemover) {
    novoMapa.delete(alvo.id);
    removidos.push(alvo.id);
  }

  return {
    efeitos: novoMapa,
    removidos,
  };
}

/**
 * Gerador puro e determinístico de sorteio para efeitos de status em [0, 100),
 * derivado exclusivamente de (seed, rodada, indiceAtaque) sem consumir o RNG de iniciativa/ouro.
 */
export function sorteioStatus(
  seed: number,
  rodada: number,
  indiceAtaque: number
): number {
  let h =
    Math.imul(Math.floor(seed) | 0, HASH_SEED_MULT) +
    Math.imul(Math.floor(rodada) | 0, HASH_RODADA_MULT) +
    Math.imul(Math.floor(indiceAtaque) | 0, HASH_ATAQUE_MULT);

  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, HASH_MIX_MULT);
  h = (h ^ (h >>> 16)) >>> 0;

  return (h % ESCALA_PRECISAO_SORTEIO) / DIVISOR_PRECISAO_SORTEIO;
}

/**
 * Formata um EventoEfeito em texto legível para exibição no relatório do combate.
 */
export function formatarEventoEfeito(
  evento: EventoEfeito,
  nomeMonstro: string = 'monstro'
): string {
  const nomeEfeito = EFEITOS_STATUS[evento.efeito]?.nome ?? evento.efeito;
  const artigoDefinido = evento.efeito === 'podridaoEscarlate' ? 'a' : 'o';
  const artigoMaiusculo = evento.efeito === 'podridaoEscarlate' ? 'A' : 'O';

  // Efeito que o jogador colocou no monstro (ex.: Sangramento Forçado)
  if (evento.alvo) {
    switch (evento.tipo) {
      case 'aplicado':
        return `Você aplicou ${nomeEfeito} em ${evento.alvo}`;
      case 'renovado':
        return `Você renovou ${artigoDefinido} ${nomeEfeito} em ${evento.alvo}`;
      case 'instantaneo':
      case 'dano':
        return `${nomeEfeito} causa ${evento.dano ?? 0} de dano em ${evento.alvo}`;
      case 'controle':
        return `Você aplicou ${nomeEfeito} em ${evento.alvo}${evento.dano ? ` (${evento.dano} de dano)` : ''}`;
      case 'imune':
        return `${evento.alvo} é imune a ${nomeEfeito}`;
      case 'expirado':
        return `${artigoMaiusculo} ${nomeEfeito} em ${evento.alvo} se dissipou`;
      case 'removido':
        return `${artigoMaiusculo} ${nomeEfeito} em ${evento.alvo} foi removido`;
    }
  }

  switch (evento.tipo) {
    case 'aplicado':
      if (evento.efeito === 'veneno') {
        return `O ${nomeMonstro} envenenou você`;
      }
      return `O ${nomeMonstro} aplicou ${nomeEfeito} em você`;
    case 'renovado':
      return `O ${nomeMonstro} renovou ${artigoDefinido} ${nomeEfeito}`;
    case 'instantaneo':
      return `${nomeEfeito} causa ${evento.dano ?? 0} de dano`;
    case 'controle':
      return `O ${nomeMonstro} aplicou ${nomeEfeito} em você${evento.dano ? ` (${evento.dano} de dano)` : ''}`;
    case 'imune':
      return `Você é imune a ${nomeEfeito}`;
    case 'dano':
      return `${nomeEfeito} causa ${evento.dano ?? 0} de dano (restam ${evento.rodadasRestantes ?? 0} rodadas)`;
    case 'expirado':
      return `${artigoMaiusculo} ${nomeEfeito} se dissipou`;
    case 'removido':
      return `${artigoMaiusculo} ${nomeEfeito} foi removido`;
  }
}
