import type { CharacterDocument } from '@/server/characterService';
import { atributosDoEmblema, atributosDosEmblemas, CUSTO_DA_FUSAO, EmblemaItem, nivelDasHabilidades, SLOTS_EMBLEMA } from '@/game/emblemas';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { EMBLEMA_RARIDADE_MAP, EMBLEMA_RARIDADES } from '@/rules/emblemas';
import { TIPO_EMBLEMA_MAP, TipoEmblema } from '@/rules/emblemasCatalogo';

/** Lógica da aba Emblemas da ficha (espaços, inventário agrupado por tipo e habilidades que valem), sem React. */

type Personagem = Pick<CharacterDocument, 'emblemasItens' | 'emblemasEquipados'>;

export const COR_ESTRELA_VERMELHA = '#FF4D4D';

/** Estrelas do emblema em texto: ★, ★★, ★★★ e, no Mítico, a 4ª é a estrela vermelha. */
export function estrelasEmTexto(estrelas: number): string {
  return '★'.repeat(Math.max(0, Math.min(4, estrelas)));
}

export interface SlotEmblemaTela {
  indice: number;
  /** Null = espaço vazio. */
  emblema: (EmblemaItem & { nome: string; raridadeNome: string; cor: string }) | null;
}

function infoDoItem(item: EmblemaItem) {
  const tipo = TIPO_EMBLEMA_MAP[item.tipo];
  const raridade = EMBLEMA_RARIDADE_MAP[tipo.raridade];
  return { ...item, nome: tipo.nome, raridadeNome: raridade.nome, cor: raridade.cor };
}

/** Os 4 espaços de emblema, na ordem em que foram equipados. */
export function slotsDeEmblema(c: Personagem): SlotEmblemaTela[] {
  const itens = c.emblemasItens ?? [];
  return Array.from({ length: SLOTS_EMBLEMA }, (_, indice) => {
    const id = (c.emblemasEquipados ?? [])[indice];
    const item = id ? itens.find((i) => i.id === id) : undefined;
    return { indice, emblema: item && TIPO_EMBLEMA_MAP[item.tipo] ? infoDoItem(item) : null };
  });
}

export interface GrupoEstrelaTela {
  estrelas: number;
  /** Quantos emblemas deste tipo e estrela o personagem tem. */
  total: number;
  /** Quantos estão equipados. */
  equipados: number;
  /** Ids dos emblemas livres (fora dos espaços), para equipar. */
  livres: string[];
  /** Ids dos equipados, para desequipar. */
  idsEquipados: string[];
  /** Quantos emblemas livres a fusão consome (null na estrela máxima). */
  custoDaFusao: number | null;
  podeFundir: boolean;
}

export interface GrupoEmblemaTela {
  tipo: TipoEmblema;
  nome: string;
  raridadeNome: string;
  cor: string;
  porEstrela: GrupoEstrelaTela[];
}

/** O inventário de emblemas agrupado por tipo (do mais raro ao mais comum) e, dentro do tipo, por estrela. */
export function inventarioDeEmblemas(c: Personagem): GrupoEmblemaTela[] {
  const itens = (c.emblemasItens ?? []).filter((i) => TIPO_EMBLEMA_MAP[i.tipo]);
  const equipados = new Set(c.emblemasEquipados ?? []);
  const ordemRaridade = [...EMBLEMA_RARIDADES].reverse().map((r) => r.id);
  const tipos = [...new Set(itens.map((i) => i.tipo))].map((id) => TIPO_EMBLEMA_MAP[id]);
  tipos.sort((a, b) => ordemRaridade.indexOf(a.raridade) - ordemRaridade.indexOf(b.raridade) || a.nome.localeCompare(b.nome));
  return tipos.map((tipo) => {
    const da = itens.filter((i) => i.tipo === tipo.id);
    const porEstrela: GrupoEstrelaTela[] = [];
    for (let e = tipo.estrelasMax; e >= 1; e--) {
      const doNivel = da.filter((i) => i.estrelas === e);
      if (doNivel.length === 0) continue;
      const livres = doNivel.filter((i) => !equipados.has(i.id)).map((i) => i.id);
      const custo = e < tipo.estrelasMax ? CUSTO_DA_FUSAO[e] : null;
      porEstrela.push({
        estrelas: e,
        total: doNivel.length,
        equipados: doNivel.length - livres.length,
        livres,
        idsEquipados: doNivel.filter((i) => equipados.has(i.id)).map((i) => i.id),
        custoDaFusao: custo,
        podeFundir: custo !== null && livres.length >= custo,
      });
    }
    const raridade = EMBLEMA_RARIDADE_MAP[tipo.raridade];
    return { tipo, nome: tipo.nome, raridadeNome: raridade.nome, cor: raridade.cor, porEstrela };
  });
}

export interface HabilidadeEmAcaoTela {
  tipoNome: string;
  nome: string;
  descricao: string;
  nivel: number;
  cor: string;
}

/** As habilidades que valem agora, com o nível (1 a 4) de cada uma. */
export function habilidadesEmAcao(c: Personagem): HabilidadeEmAcaoTela[] {
  const equipados = (c.emblemasEquipados ?? [])
    .map((id) => (c.emblemasItens ?? []).find((i) => i.id === id))
    .filter((i): i is EmblemaItem => !!i && !!TIPO_EMBLEMA_MAP[i.tipo]);
  return nivelDasHabilidades(equipados).map((n) => {
    const tipo = TIPO_EMBLEMA_MAP[n.tipo];
    return { tipoNome: tipo.nome, nome: n.habilidade.nome, descricao: n.habilidade.descricao, nivel: n.nivel, cor: EMBLEMA_RARIDADE_MAP[tipo.raridade].cor };
  });
}

/** Os atributos que o emblema soma na estrela dada, em texto: "Força +2, Sorte +2, Agilidade +2". */
export function atributosDoEmblemaEmTexto(item: Pick<EmblemaItem, 'tipo' | 'estrelas'>): string {
  const a = atributosDoEmblema(item);
  return ATTRIBUTES.filter((n) => a[n] > 0).map((n) => `${ATTRIBUTE_DISPLAY_NAMES[n]} +${a[n]}`).join(', ');
}

/** O que os emblemas equipados somam nos atributos, em texto ("Força +6, Sorte +6"); vazio se não houver nada equipado. */
export function atributosDosEquipadosEmTexto(c: Personagem): string {
  const equipados = (c.emblemasEquipados ?? [])
    .map((id) => (c.emblemasItens ?? []).find((i) => i.id === id))
    .filter((i): i is EmblemaItem => !!i && !!TIPO_EMBLEMA_MAP[i.tipo]);
  const soma = atributosDosEmblemas(equipados);
  return ATTRIBUTES.filter((n) => soma[n] > 0).map((n) => `${ATTRIBUTE_DISPLAY_NAMES[n]} +${soma[n]}`).join(', ');
}
