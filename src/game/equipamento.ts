import { ATTRIBUTES, AttributeName, Attributes } from '@/rules/attributes';
import {
  ESPACOS_ARMADURA,
  EspacoArmadura,
  fixoDaPeca,
  nivelDoXpArmadura,
  somarHabilidades,
} from '@/rules/armaduras';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { CATEGORIAS_ARMA_MAP, CUSTOMIZACAO, ModificadorArma, atributoDoDanoFixo, danoFixoDaArma } from '@/rules/armas';
import type { Elemento } from '@/rules/elements';
import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';
import type { EfeitoStatus } from '@/rules/statusEffects';
import { somarEfeitosEstaticos } from './habilidadesArmaduraEfeitos';
import type { ArmaPersonagem } from './forja';
import type { ArmaduraPersonagem } from './armaduraForja';
import { atributosDosEmblemas, EmblemaItem } from './emblemas';

/**
 * Equipamento do personagem (decidido pelo Yuri em 13/10/2026): uma arma e uma peça em cada um dos 5 espaços de
 * armadura, equipados na ficha do personagem. Funções puras: a ficha de combate (`calcularFichaEquipamento`) é
 * a única porta pela qual o equipamento entra nos atributos e no combate; o motor não conhece armas nem peças.
 */

export interface EquipamentoPersonagem {
  /** Id da arma equipada (de `armas`), ou null. */
  armaId: string | null;
  /** Id da peça equipada em cada espaço (de `armaduras`). */
  armadura: Partial<Record<EspacoArmadura, string>>;
}

export const EQUIPAMENTO_VAZIO: EquipamentoPersonagem = { armaId: null, armadura: {} };

export type MotivoBloqueioEquipar = 'itemNaoEncontrado' | 'espacoInvalido';

export const MENSAGEM_BLOQUEIO_EQUIPAR: Readonly<Record<MotivoBloqueioEquipar, string>> = {
  itemNaoEncontrado: 'Item não encontrado no seu inventário de equipamentos.',
  espacoInvalido: 'Espaço de armadura inválido.',
};

export type ResultadoEquipar = { ok: true; equipamento: EquipamentoPersonagem } | { ok: false; motivo: MotivoBloqueioEquipar };

const ESPACOS = ESPACOS_ARMADURA.map((e) => e.id);

/** Lê o equipamento gravado, descartando o que não existe mais ou está no espaço errado (dados antigos ou corrompidos). */
export function lerEquipamentoPersonagem(
  valor: unknown,
  armas: readonly Pick<ArmaPersonagem, 'id'>[],
  armaduras: readonly Pick<ArmaduraPersonagem, 'id' | 'pecaId'>[]
): EquipamentoPersonagem {
  if (!valor || typeof valor !== 'object') return { armaId: null, armadura: {} };
  const v = valor as Record<string, unknown>;
  const armaId = typeof v.armaId === 'string' && armas.some((a) => a.id === v.armaId) ? v.armaId : null;
  const armadura: Partial<Record<EspacoArmadura, string>> = {};
  const gravada = v.armadura && typeof v.armadura === 'object' ? (v.armadura as Record<string, unknown>) : {};
  for (const espaco of ESPACOS) {
    const id = gravada[espaco];
    const peca = typeof id === 'string' ? armaduras.find((a) => a.id === id) : undefined;
    if (peca && PECAS_ARMADURA_MAP[peca.pecaId]?.espaco === espaco) armadura[espaco] = peca.id;
  }
  return { armaId, armadura };
}

export function equiparArma(
  atual: EquipamentoPersonagem,
  armas: readonly Pick<ArmaPersonagem, 'id'>[],
  armaId: unknown
): ResultadoEquipar {
  if (typeof armaId !== 'string' || !armas.some((a) => a.id === armaId)) return { ok: false, motivo: 'itemNaoEncontrado' };
  return { ok: true, equipamento: { ...atual, armaId } };
}

export function desequiparArma(atual: EquipamentoPersonagem): EquipamentoPersonagem {
  return { ...atual, armaId: null };
}

/** Equipa a peça no espaço dela (o espaço sai do catálogo); a peça que estava lá volta para a lista. */
export function equiparPeca(
  atual: EquipamentoPersonagem,
  armaduras: readonly Pick<ArmaduraPersonagem, 'id' | 'pecaId'>[],
  armaduraId: unknown
): ResultadoEquipar {
  const peca = typeof armaduraId === 'string' ? armaduras.find((a) => a.id === armaduraId) : undefined;
  const def = peca ? PECAS_ARMADURA_MAP[peca.pecaId] : undefined;
  if (!peca || !def) return { ok: false, motivo: 'itemNaoEncontrado' };
  return { ok: true, equipamento: { ...atual, armadura: { ...atual.armadura, [def.espaco]: peca.id } } };
}

export function desequiparEspaco(atual: EquipamentoPersonagem, espaco: unknown): ResultadoEquipar {
  if (typeof espaco !== 'string' || !ESPACOS.includes(espaco as EspacoArmadura)) return { ok: false, motivo: 'espacoInvalido' };
  const armadura = { ...atual.armadura };
  delete armadura[espaco as EspacoArmadura];
  return { ok: true, equipamento: { ...atual, armadura } };
}

// ---------------------------------------------------------------------------
// Ficha de combate do equipamento
// ---------------------------------------------------------------------------

export interface PercentuaisEquipamento {
  danoFisico: number;
  danoMagico: number;
  agilidade: number;
  /** Pontos percentuais somados à chance de crítico. */
  chanceCritico: number;
  defesa: number;
  /** Pontos percentuais somados à chance de aplicar status (arma e habilidades). */
  chanceEfeitos: number;
}

export interface ArmaEquipada {
  armaId: string;
  baseId: string;
  nome: string;
  categoria: ArmaPersonagem['categoria'];
  tipoDano: 'fisico' | 'magico';
  subtipoFisico?: 'corte' | 'perfuracao';
  /** Dano fixo já com a Customização (vira Força nas armas físicas e Inteligência nas mágicas). */
  danoFixo: number;
  atributo: AttributeName;
  /** Pontos do atributo sorteado, com a Customização. */
  pontos: number;
  elementos: readonly Elemento[];
  status: readonly EfeitoStatus[];
}

export interface FichaEquipamento {
  /** Pontos somados em cada atributo (dano fixo da arma, atributo sorteado, Agilidade das botas). */
  atributos: Attributes;
  /** HP somado pelas peças de Vida (elmo e luvas). */
  hpExtra: number;
  /** Mitigação física e mágica somada pelas peças de Defesa (peitoral e perneiras). */
  mitigacaoExtra: number;
  percentuais: PercentuaisEquipamento;
  arma: ArmaEquipada | null;
  /** Habilidades de armadura somadas entre as peças, limitadas ao nível máximo de cada uma. */
  habilidades: Record<string, number>;
  /** HP máximo em % do total (Reforço de Vida). */
  hpPercentual: number;
  /** Menos dano recebido por elemento, em % (valor positivo = resistência). */
  resistenciaElemental: Partial<Record<Elemento, number>>;
}

function zerarAtributos(): Attributes {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Attributes;
}

function somarModificador(p: PercentuaisEquipamento, m: ModificadorArma): void {
  const campo = {
    danoFisico: 'danoFisico',
    danoMagico: 'danoMagico',
    agilidade: 'agilidade',
    chanceCritico: 'chanceCritico',
    defesa: 'defesa',
    chanceEfeitos: 'chanceEfeitos',
  } as const;
  p[campo[m.alvo]] += m.percentual;
}

export function calcularFichaEquipamento(
  equipamento: EquipamentoPersonagem | undefined,
  armas: readonly ArmaPersonagem[] = [],
  armaduras: readonly ArmaduraPersonagem[] = [],
  /** Emblemas equipados: somam os atributos deles (as habilidades entram à parte). */
  emblemasEquipados: readonly EmblemaItem[] = []
): FichaEquipamento {
  const ficha: FichaEquipamento = {
    atributos: zerarAtributos(),
    hpExtra: 0,
    mitigacaoExtra: 0,
    percentuais: { danoFisico: 0, danoMagico: 0, agilidade: 0, chanceCritico: 0, defesa: 0, chanceEfeitos: 0 },
    arma: null,
    habilidades: {},
    hpPercentual: 0,
    resistenciaElemental: {},
  };
  const doEmblema = atributosDosEmblemas(emblemasEquipados);
  for (const a of ATTRIBUTES) ficha.atributos[a] += doEmblema[a];
  if (!equipamento) return ficha;

  // Peças primeiro: as habilidades delas (somadas) mexem no dano fixo da arma e nos percentuais
  const pecasEquipadas: { habilidades: { id: string; nivel: number }[] }[] = [];
  for (const espaco of ESPACOS) {
    const id = equipamento.armadura[espaco];
    const peca = id ? armaduras.find((a) => a.id === id) : undefined;
    const def = peca ? PECAS_ARMADURA_MAP[peca.pecaId] : undefined;
    if (!peca || !def || def.espaco !== espaco) continue;
    const fixo = fixoDaPeca(def.estrela, espaco, nivelDoXpArmadura(peca.xp));
    const tipo = ESPACOS_ARMADURA.find((e) => e.id === espaco)!.fixo;
    if (tipo === 'vida') ficha.hpExtra += fixo;
    else if (tipo === 'defesa') ficha.mitigacaoExtra += fixo;
    else ficha.atributos.agilidade += fixo;
    ficha.atributos[peca.atributo] += peca.pontos;
    pecasEquipadas.push({ habilidades: def.habilidades.map((h) => ({ id: h.id, nivel: h.nivel })) });
  }
  ficha.habilidades = somarHabilidades(pecasEquipadas, (id) => HABILIDADES_ARMADURA_MAP[id]?.nivelMaximo ?? 0);
  const efeitos = somarEfeitosEstaticos(ficha.habilidades);
  ficha.mitigacaoExtra += efeitos.mitigacaoFixa;
  ficha.percentuais.defesa += efeitos.mitigacaoPercentual;
  ficha.percentuais.agilidade += efeitos.agilidadePercentual;
  ficha.hpPercentual = efeitos.hpPercentual;
  ficha.resistenciaElemental = efeitos.resistenciaElemental;

  const arma = equipamento.armaId ? armas.find((a) => a.id === equipamento.armaId) : undefined;
  const base = arma ? ARMAS_BASE_MAP[arma.baseId] : undefined;
  if (arma && base) {
    const def = CATEGORIAS_ARMA_MAP[arma.categoria];
    const custom = arma.customizacao ?? {};
    const danoBase = danoFixoDaArma(base.estrela, base.posicao, base.semElementoNemStatus === true);
    const semElementoNemStatus = base.elementos.length === 0 && base.status.length === 0;
    const bonusDanoFixo =
      (custom.dano ?? 0) * CUSTOMIZACAO.danoPercentualPorPonto +
      efeitos.danoFixoArmaPercentual +
      (semElementoNemStatus ? efeitos.danoFixoArmaSemElementoPercentual : 0);
    const danoFixo = Math.round((danoBase * (100 + bonusDanoFixo)) / 100);
    const pontos = arma.pontos + (custom.atributo ?? 0) * CUSTOMIZACAO.atributoPorPonto;
    ficha.atributos[atributoDoDanoFixo(arma.categoria)] += danoFixo;
    ficha.atributos[arma.atributo] += pontos;
    somarModificador(ficha.percentuais, def.bonus);
    somarModificador(ficha.percentuais, def.penalidade);
    // Customização "Mais status": +0,5 ponto percentual na chance do status, só em arma que tem status
    if (base.status.length > 0) ficha.percentuais.chanceEfeitos += (custom.status ?? 0) * CUSTOMIZACAO.statusPontosPercentuaisPorPonto;
    ficha.arma = {
      armaId: arma.id,
      baseId: arma.baseId,
      nome: base.nomes[arma.categoria],
      categoria: arma.categoria,
      tipoDano: def.tipoDano,
      ...(def.subtipoFisico ? { subtipoFisico: def.subtipoFisico } : {}),
      danoFixo,
      atributo: arma.atributo,
      pontos,
      elementos: base.elementos,
      status: base.status,
    };
  }

  return ficha;
}

/** Atributos com o equipamento: soma os pontos e depois aplica a % de Agilidade da categoria da arma (sobre o total). */
export function aplicarEquipamentoAosAtributos(atributos: Attributes, ficha: FichaEquipamento): Attributes {
  const resultado = { ...atributos };
  for (const a of ATTRIBUTES) resultado[a] = atributos[a] + ficha.atributos[a];
  if (ficha.percentuais.agilidade !== 0) {
    resultado.agilidade = Math.max(0, Math.floor((resultado.agilidade * (100 + ficha.percentuais.agilidade)) / 100));
  }
  return resultado;
}

/** Mitigação do equipamento com a % de Defesa da categoria da arma (sobre o total das peças). */
export function mitigacaoDoEquipamento(ficha: FichaEquipamento): number {
  return Math.max(0, Math.floor((ficha.mitigacaoExtra * (100 + ficha.percentuais.defesa)) / 100));
}
