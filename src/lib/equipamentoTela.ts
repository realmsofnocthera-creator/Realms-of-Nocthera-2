import type { CharacterDocument } from '@/server/characterService';
import {
  ESPACOS_ARMADURA,
  EspacoArmadura,
  ESPACOS_ARMADURA_MAP,
  fixoDaPeca,
  nivelDoXpArmadura,
} from '@/rules/armaduras';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { CATEGORIAS_ARMA_MAP, RARIDADES_ARMA, RARIDADES_ARMA_MAP, RaridadeArma } from '@/rules/armas';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { ATTRIBUTES } from '@/rules/attributes';
import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import { COR_RARIDADE_ARMA, textoModificador } from '@/lib/forjaTela';
import { NOME_ELEMENTO } from '@/lib/cacadaTela';
import { calcularFichaEquipamento } from '@/game/equipamento';
import { HABILIDADES_ARMADURA_APLICADAS } from '@/game/habilidadesArmaduraEfeitos';
import type { ArmaPersonagem } from '@/game/forja';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';

/**
 * Lógica da aba Equipamentos da ficha do personagem (espaços, itens para escolher e resumo dos bônus), sem React.
 * Tudo o que a tela mostra sai da mesma ficha de combate (`calcularFichaEquipamento`) que o servidor usa.
 */

type Personagem = Pick<CharacterDocument, 'armas' | 'armaduras' | 'equipamento'>;

export type SlotEquipamento = 'arma' | EspacoArmadura;

export const SLOTS_EQUIPAMENTO: readonly { id: SlotEquipamento; nome: string }[] = [
  { id: 'arma', nome: 'Arma' },
  ...ESPACOS_ARMADURA.map((e) => ({ id: e.id as SlotEquipamento, nome: e.nome })),
];

export interface ItemEquipamentoTela {
  /** Id do item do personagem (de `armas` ou `armaduras`). */
  id: string;
  slot: SlotEquipamento;
  nome: string;
  cor: string;
  raridade: RaridadeArma;
  raridadeNome: string;
  /** Linha curta para a lista: o que o item dá. */
  resumo: string;
  /** Detalhe de uma linha só para cartões pequenos (o dano da arma ou o nível da peça). */
  curto: string;
  /** Detalhes do item, uma linha cada. */
  linhas: string[];
  equipado: boolean;
}

export interface SlotTela {
  id: SlotEquipamento;
  nome: string;
  equipado: ItemEquipamentoTela | null;
  /** Quantos itens o personagem tem para este espaço. */
  disponiveis: number;
}

const nomeStatus = (s: keyof typeof EFEITOS_STATUS) => EFEITOS_STATUS[s].nome;

export function armaParaTela(a: ArmaPersonagem, equipada: boolean): ItemEquipamentoTela | null {
  const base = ARMAS_BASE_MAP[a.baseId];
  if (!base) return null;
  const def = CATEGORIAS_ARMA_MAP[a.categoria];
  const ficha = calcularFichaEquipamento({ armaId: a.id, armadura: {} }, [a]).arma!;
  const atributoDoDano = def.tipoDano === 'fisico' ? 'Força' : 'Inteligência';
  const linhas = [
    `${def.nome} · ${def.tipoDano === 'fisico' ? 'Dano físico' : 'Dano mágico'}${def.subtipoFisico ? ` (${def.subtipoFisico === 'corte' ? 'corte' : 'perfuração'})` : ''}`,
    `Dano fixo ${ficha.danoFixo} (soma em ${atributoDoDano})`,
    `${ATTRIBUTE_DISPLAY_NAMES[a.atributo]} +${ficha.pontos}`,
    `Bônus: ${textoModificador(def.bonus.alvo, def.bonus.percentual)}`,
    `Penalidade: ${textoModificador(def.penalidade.alvo, def.penalidade.percentual)}`,
  ];
  if (base.elementos.length > 0) linhas.push(`Elemento: ${base.elementos.map((e) => NOME_ELEMENTO[e]).join(' e ')}`);
  if (base.status.length > 0) linhas.push(`Status: ${base.status.map(nomeStatus).join(', ')}`);
  return {
    id: a.id,
    slot: 'arma',
    nome: base.nomes[a.categoria],
    cor: COR_RARIDADE_ARMA[base.raridade],
    raridade: base.raridade,
    raridadeNome: RARIDADES_ARMA_MAP[base.raridade].nome,
    resumo: `${def.nome} · Dano ${ficha.danoFixo} · ${ATTRIBUTE_DISPLAY_NAMES[a.atributo]} +${ficha.pontos}`,
    curto: `Dano ${ficha.danoFixo}`,
    linhas,
    equipado: equipada,
  };
}

const NOME_FIXO = { vida: 'Vida', defesa: 'Defesa', agilidade: 'Agilidade' } as const;

export function pecaParaTela(a: ArmaduraPersonagem, equipada: boolean): ItemEquipamentoTela | null {
  const p = PECAS_ARMADURA_MAP[a.pecaId];
  if (!p) return null;
  const def = ESPACOS_ARMADURA_MAP[p.espaco];
  const nivel = nivelDoXpArmadura(a.xp);
  const fixo = `${NOME_FIXO[def.fixo]} ${fixoDaPeca(p.estrela, p.espaco, nivel)}`;
  const linhas = [
    `${def.nome} · Nível ${nivel}/30`,
    fixo,
    `${ATTRIBUTE_DISPLAY_NAMES[a.atributo]} +${a.pontos}`,
    ...p.habilidades.map((h) => `${HABILIDADES_ARMADURA_MAP[h.id]?.nome ?? h.id} Nv. ${h.nivel}`),
  ];
  return {
    id: a.id,
    slot: p.espaco,
    nome: p.nome,
    cor: COR_RARIDADE_ARMA[p.raridade],
    raridade: p.raridade,
    raridadeNome: RARIDADES_ARMA_MAP[p.raridade].nome,
    resumo: `${fixo} · ${ATTRIBUTE_DISPLAY_NAMES[a.atributo]} +${a.pontos} · Nv. ${nivel}`,
    curto: `Nível ${nivel}/30`,
    linhas,
    equipado: equipada,
  };
}

const ordemRaridade = (r: RaridadeArma) => RARIDADES_ARMA.findIndex((x) => x.id === r);

/** Todos os itens do personagem para o espaço: o equipado primeiro, depois do mais raro para o mais comum. */
export function opcoesDoSlot(c: Personagem, slot: SlotEquipamento): ItemEquipamentoTela[] {
  const eq = c.equipamento;
  const itens: (ItemEquipamentoTela | null)[] =
    slot === 'arma'
      ? (c.armas ?? []).map((a) => armaParaTela(a, eq?.armaId === a.id))
      : (c.armaduras ?? [])
          .filter((a) => PECAS_ARMADURA_MAP[a.pecaId]?.espaco === slot)
          .map((a) => pecaParaTela(a, eq?.armadura?.[slot] === a.id));
  return itens
    .filter((i): i is ItemEquipamentoTela => i !== null)
    .sort((x, y) => Number(y.equipado) - Number(x.equipado) || ordemRaridade(y.raridade) - ordemRaridade(x.raridade) || x.nome.localeCompare(y.nome));
}

/** Os 6 espaços (arma e as 5 peças) com o que está equipado em cada um. */
export function slotsDaTela(c: Personagem): SlotTela[] {
  return SLOTS_EQUIPAMENTO.map((s) => {
    const opcoes = opcoesDoSlot(c, s.id);
    return { id: s.id, nome: s.nome, equipado: opcoes.find((o) => o.equipado) ?? null, disponiveis: opcoes.length };
  });
}

export interface ResumoEquipamentoTela {
  /** Nada equipado. */
  vazio: boolean;
  hp: number;
  defesa: number;
  /** Atributos que o equipamento soma (só os que mudam; Agilidade já com a % da arma). */
  atributos: { nome: string; valor: string }[];
  percentuais: { rotulo: string; valor: string }[];
  elementos: string[];
  status: string[];
  /** `aplicada`: o combate já usa o efeito desta habilidade; as outras só somam na ficha por enquanto. */
  habilidades: { id: string; nome: string; nivel: number; nivelMaximo: number; aplicada: boolean }[];
}

const sinal = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

export function resumoDoEquipamento(c: Pick<CharacterDocument, 'armas' | 'armaduras' | 'equipamento' | 'bonusEquipamento' | 'mitigacaoEquipamento'>): ResumoEquipamentoTela {
  const ficha = calcularFichaEquipamento(c.equipamento, c.armas, c.armaduras);
  const vazio = !ficha.arma && ficha.hpExtra === 0 && ficha.mitigacaoExtra === 0 && Object.keys(ficha.habilidades).length === 0 && ficha.atributos.agilidade === 0;
  const bonus = c.bonusEquipamento;
  const atributos = ATTRIBUTES.flatMap((a) => {
    const v = bonus ? bonus[a] : ficha.atributos[a];
    return v !== 0 ? [{ nome: ATTRIBUTE_DISPLAY_NAMES[a], valor: sinal(v) }] : [];
  });
  // A % de Agilidade da categoria já está no bônus de Agilidade dos atributos; não repete aqui
  const p = ficha.percentuais;
  const linhasPct: { rotulo: string; valor: number; unidade: string }[] = [
    { rotulo: 'Dano físico', valor: p.danoFisico, unidade: '%' },
    { rotulo: 'Dano mágico', valor: p.danoMagico, unidade: '%' },
    { rotulo: 'Defesa', valor: p.defesa, unidade: '%' },
    { rotulo: 'Chance de crítico', valor: p.chanceCritico, unidade: ' pts' },
    { rotulo: 'Chance de efeitos', valor: p.chanceEfeitos, unidade: ' pts' },
  ];
  return {
    vazio,
    hp: ficha.hpExtra,
    defesa: c.mitigacaoEquipamento ?? 0,
    atributos,
    percentuais: linhasPct.filter((l) => l.valor !== 0).map((l) => ({ rotulo: l.rotulo, valor: `${sinal(l.valor)}${l.unidade}` })),
    elementos: (ficha.arma?.elementos ?? []).map((e) => NOME_ELEMENTO[e]),
    status: (ficha.arma?.status ?? []).map(nomeStatus),
    habilidades: Object.entries(ficha.habilidades)
      .map(([id, nivel]) => ({
        id,
        nome: HABILIDADES_ARMADURA_MAP[id]?.nome ?? id,
        nivel,
        nivelMaximo: HABILIDADES_ARMADURA_MAP[id]?.nivelMaximo ?? nivel,
        aplicada: HABILIDADES_ARMADURA_APLICADAS.has(id),
      }))
      .sort((x, y) => y.nivel - x.nivel || x.nome.localeCompare(y.nome)),
  };
}
