import type { CharacterDocument } from '@/server/characterService';
import { RARIDADES_ARMA, type RaridadeArma } from '@/rules/armas';
import { SLOTS_EQUIPAMENTO, slotsDaTela, type ItemEquipamentoTela, type SlotEquipamento } from '@/lib/equipamentoTela';

/** Os "Equipamentos principais" do perfil público: até 4 itens equipados que o jogador escolhe mostrar. */

export const SLOTS_DO_PERFIL = 4;

type Personagem = Pick<CharacterDocument, 'armas' | 'armaduras' | 'equipamento' | 'perfilEquipamentos'>;

export interface EquipamentoPerfil {
  /** Id do item do personagem (de `armas` ou `armaduras`). */
  id: string;
  slot: SlotEquipamento;
  slotNome: string;
  nome: string;
  cor: string;
  raridadeNome: string;
  /** O dano da arma ou o nível da peça. */
  curto: string;
}

const ordemRaridade = (r: RaridadeArma) => RARIDADES_ARMA.findIndex((x) => x.id === r);

/** Os itens equipados agora (a arma e as peças de armadura), na ordem dos espaços. */
export function itensEquipados(c: Personagem): ItemEquipamentoTela[] {
  return slotsDaTela(c).flatMap((s) => (s.equipado ? [s.equipado] : []));
}

function paraPerfil(i: ItemEquipamentoTela): EquipamentoPerfil {
  return {
    id: i.id,
    slot: i.slot,
    slotNome: SLOTS_EQUIPAMENTO.find((s) => s.id === i.slot)?.nome ?? '',
    nome: i.nome,
    cor: i.cor,
    raridadeNome: i.raridadeNome,
    curto: i.curto,
  };
}

/**
 * O que o perfil mostra. Se o jogador já escolheu, valem os itens escolhidos que ainda estão equipados (na ordem da
 * escolha). Se nunca escolheu, a seleção é automática: a arma e depois as peças mais raras.
 */
export function equipamentosDoPerfil(c: Personagem): EquipamentoPerfil[] {
  const equipados = itensEquipados(c);
  if (c.perfilEquipamentos === undefined) {
    const arma = equipados.filter((i) => i.slot === 'arma');
    const pecas = equipados.filter((i) => i.slot !== 'arma').sort((x, y) => ordemRaridade(y.raridade) - ordemRaridade(x.raridade) || x.nome.localeCompare(y.nome));
    return [...arma, ...pecas].slice(0, SLOTS_DO_PERFIL).map(paraPerfil);
  }
  const porId = new Map(equipados.map((i) => [i.id, i]));
  return c.perfilEquipamentos
    .slice(0, SLOTS_DO_PERFIL)
    .flatMap((id) => {
      const item = porId.get(id);
      return item ? [paraPerfil(item)] : [];
    });
}

export const MENSAGEM_ESCOLHA_DO_PERFIL = {
  invalida: 'Escolha até 4 itens equipados para mostrar no perfil.',
  naoEquipado: 'Só dá para mostrar no perfil os itens que estão equipados.',
} as const;

/** Confere a escolha do jogador: uma lista de até 4 itens diferentes, todos equipados agora. */
export function validarEscolhaDoPerfil(c: Personagem, itens: unknown): { ok: true; ids: string[] } | { ok: false; erro: string } {
  if (!Array.isArray(itens) || itens.length > SLOTS_DO_PERFIL || itens.some((i) => typeof i !== 'string' || i === '')) {
    return { ok: false, erro: MENSAGEM_ESCOLHA_DO_PERFIL.invalida };
  }
  const ids = itens as string[];
  if (new Set(ids).size !== ids.length) return { ok: false, erro: MENSAGEM_ESCOLHA_DO_PERFIL.invalida };
  const equipados = new Set(itensEquipados(c).map((i) => i.id));
  if (ids.some((id) => !equipados.has(id))) return { ok: false, erro: MENSAGEM_ESCOLHA_DO_PERFIL.naoEquipado };
  return { ok: true, ids };
}
