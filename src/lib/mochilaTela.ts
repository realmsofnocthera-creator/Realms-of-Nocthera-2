import type { CharacterDocument } from '@/server/characterService';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP, type TipoMaterialMundo } from '@/rules/materiaisArmas';
import { ORBES_ARMADURA_MAP } from '@/rules/armaduras';
import { PECAS_ARMADURA } from '@/rules/armadurasCatalogo';
import { ARMAS_BASE } from '@/rules/armasCatalogo';
import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { RARIDADE_MAP, type RaridadeMaterial } from '@/rules/raridades';
import { CUSTOMIZACAO } from '@/rules/armas';
import { BILHETE_DE_MELHORIA } from '@/game/forja';
import { COR_RARIDADE } from '@/lib/cacadaTela';

/** Lógica da tela da Mochila (abas, saldos e detalhe de cada item), sem React. */

export type CategoriaMochila = 'monstros' | 'mundo' | 'orbes' | 'especiais';

export const CATEGORIAS_MOCHILA: readonly { id: CategoriaMochila; nome: string; vazio: string }[] = [
  { id: 'monstros', nome: 'Monstros', vazio: 'Nenhum material de monstro. Eles caem na Caçada.' },
  { id: 'mundo', nome: 'Mundo', vazio: 'Nenhum material de mundo ainda.' },
  { id: 'orbes', nome: 'Orbes', vazio: 'Nenhum orbe de armadura. Eles caem na Caçada.' },
  { id: 'especiais', nome: 'Especiais', vazio: 'Nenhum item especial ainda.' },
];

const ORDEM_RARIDADE: readonly RaridadeMaterial[] = ['lendario', 'epico', 'muitoRaro', 'raro', 'comum'];
const COR_ESPECIAL = '#E6C775';

export interface ItemMochila {
  id: string;
  nome: string;
  categoria: CategoriaMochila;
  quantidade: number;
  /** Linha pequena sob o nome (raridade e origem). */
  subtitulo: string;
  cor: string;
  raridade?: RaridadeMaterial;
}

function paraItem(id: string, quantidade: number): ItemMochila | null {
  const monstro = MATERIAIS_MAP[id];
  if (monstro) {
    return {
      id, quantidade, categoria: 'monstros', nome: monstro.nome, raridade: monstro.raridade, cor: COR_RARIDADE[monstro.raridade],
      subtitulo: `${RARIDADE_MAP[monstro.raridade].nome} · ${monstro.estrelaOrigem}★`,
    };
  }
  const mundo = MATERIAIS_MUNDO_MAP[id];
  if (mundo) {
    return {
      id, quantidade, categoria: 'mundo', nome: mundo.nome, raridade: mundo.raridade, cor: COR_RARIDADE[mundo.raridade],
      subtitulo: `${RARIDADE_MAP[mundo.raridade].nome} · ${NOME_TIPO_MUNDO[mundo.tipo]}`,
    };
  }
  const orbe = ORBES_ARMADURA_MAP[id];
  if (orbe) {
    return {
      id, quantidade, categoria: 'orbes', nome: orbe.nome, raridade: orbe.raridade, cor: COR_RARIDADE[orbe.raridade],
      subtitulo: `${RARIDADE_MAP[orbe.raridade].nome} · ${orbe.xp} XP`,
    };
  }
  if (id === BILHETE_DE_MELHORIA.id) {
    return { id, quantidade, categoria: 'especiais', nome: BILHETE_DE_MELHORIA.nome, cor: COR_ESPECIAL, subtitulo: 'Customização de armas Míticas' };
  }
  return null;
}

const NOME_TIPO_MUNDO: Readonly<Record<TipoMaterialMundo, string>> = { osso: 'Osso', minerio: 'Minério', planta: 'Planta', diverso: 'Diverso' };

/** Itens do inventário por aba, do mais raro para o mais comum (e por nome). Ids desconhecidos ficam de fora. */
export function itensDaMochila(inventario: Record<string, number> | undefined): Record<CategoriaMochila, ItemMochila[]> {
  const abas: Record<CategoriaMochila, ItemMochila[]> = { monstros: [], mundo: [], orbes: [], especiais: [] };
  for (const [id, q] of Object.entries(inventario ?? {})) {
    if (!(q > 0)) continue;
    const item = paraItem(id, q);
    if (item) abas[item.categoria].push(item);
  }
  const posicao = (i: ItemMochila) => (i.raridade ? ORDEM_RARIDADE.indexOf(i.raridade) : -1);
  for (const lista of Object.values(abas)) lista.sort((a, b) => posicao(a) - posicao(b) || a.nome.localeCompare(b.nome));
  return abas;
}

export interface SaldoMochila {
  id: 'ouro' | 'diamantes' | 'fragmentosAlma' | 'essenciaHabilidade' | 'fragmentosAscensao' | 'essenciaDeSoberano';
  rotulo: string;
  valor: string;
}

const formatar = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR');

/** Faixa de saldos do topo da Mochila. */
export function saldosDaMochila(
  c: Pick<CharacterDocument, 'ouro' | 'diamantes' | 'fragmentosAlma' | 'essenciaHabilidade' | 'fragmentosAscensao'> & Partial<Pick<CharacterDocument, 'essenciaDeSoberano'>>
): SaldoMochila[] {
  return [
    { id: 'ouro', rotulo: 'Ouro', valor: formatar(c.ouro) },
    { id: 'diamantes', rotulo: 'Diamantes', valor: formatar(c.diamantes) },
    { id: 'fragmentosAlma', rotulo: 'Fragmentos de alma', valor: formatar(c.fragmentosAlma) },
    { id: 'essenciaHabilidade', rotulo: 'Essência de habilidade', valor: formatar(c.essenciaHabilidade) },
    { id: 'fragmentosAscensao', rotulo: 'Fragmentos de ascensão', valor: formatar(c.fragmentosAscensao) },
    { id: 'essenciaDeSoberano', rotulo: 'Essência de Soberano', valor: formatar(c.essenciaDeSoberano) },
  ];
}

export interface ResumoEmblemasMochila {
  total: number;
  equipados: number;
  texto: string;
}

/** Contador de emblemas guardados e equipados (eles são equipados e fundidos pela aba Emblemas da ficha). */
export function resumoDosEmblemas(c: Pick<CharacterDocument, 'emblemasItens' | 'emblemasEquipados'>): ResumoEmblemasMochila {
  const total = c.emblemasItens?.length ?? 0;
  const equipados = c.emblemasEquipados?.length ?? 0;
  const texto = total === 0 ? 'Nenhum emblema ainda. Eles caem na Provação do Guerreiro.' : `${total} ${total === 1 ? 'emblema' : 'emblemas'} · ${equipados} ${equipados === 1 ? 'equipado' : 'equipados'}`;
  return { total, equipados, texto };
}

// ---- detalhe do item (toque) ----

export interface DetalheItem {
  id: string;
  nome: string;
  categoria: CategoriaMochila;
  cor: string;
  /** Pares rótulo/valor mostrados no quadro. */
  linhas: { rotulo: string; valor: string }[];
}

let usoCache: { receitasArma: Map<string, number>; receitasArmadura: Map<string, number>; diversosArma: Map<RaridadeMaterial, number>; diversosArmadura: Map<RaridadeMaterial, number> } | null = null;

function usosNasReceitas() {
  if (usoCache) return usoCache;
  const conta = (m: Map<string, number>, id: string) => m.set(id, (m.get(id) ?? 0) + 1);
  const contaR = (m: Map<RaridadeMaterial, number>, r: RaridadeMaterial) => m.set(r, (m.get(r) ?? 0) + 1);
  const c = { receitasArma: new Map<string, number>(), receitasArmadura: new Map<string, number>(), diversosArma: new Map<RaridadeMaterial, number>(), diversosArmadura: new Map<RaridadeMaterial, number>() };
  for (const a of ARMAS_BASE) {
    for (const i of [...a.receita.materiaisMonstro, ...a.receita.materiaisMundo]) conta(c.receitasArma, i.id);
    if (a.receita.diversos) contaR(c.diversosArma, a.receita.diversos.raridade);
  }
  for (const p of PECAS_ARMADURA) {
    for (const i of [...p.receita.materiaisMonstro, ...p.receita.materiaisMundo]) conta(c.receitasArmadura, i.id);
    if (p.receita.diversos) contaR(c.diversosArmadura, p.receita.diversos.raridade);
  }
  usoCache = c;
  return c;
}

function textoDeUso(armas: number, armaduras: number): string {
  const partes: string[] = [];
  if (armas > 0) partes.push(`${armas} ${armas === 1 ? 'receita' : 'receitas'} de arma`);
  if (armaduras > 0) partes.push(`${armaduras} ${armaduras === 1 ? 'receita' : 'receitas'} de armadura`);
  return partes.length > 0 ? partes.join(' e ') : 'Nenhuma receita ainda';
}

function chanceDaRaridade(r: RaridadeMaterial): string {
  return r === 'comum' ? 'Garantido' : `${RARIDADE_MAP[r].chancePercentual}% por vitória`;
}

const MAXIMO_MONSTROS_NO_DETALHE = 4;

/** O que o item é, de onde vem e onde é usado. `null` para ids que a Mochila não mostra. */
export function detalheDoItem(id: string): DetalheItem | null {
  const item = paraItem(id, 0);
  if (!item) return null;
  const linhas: DetalheItem['linhas'] = [];
  const uso = usosNasReceitas();

  if (item.categoria === 'monstros') {
    const material = MATERIAIS_MAP[id];
    linhas.push({ rotulo: 'Raridade', valor: RARIDADE_MAP[material.raridade].nome });
    const donos = MONSTROS_CACADA_DADOS.filter((m) => m.drops.includes(id));
    const nomes = donos.slice(0, MAXIMO_MONSTROS_NO_DETALHE).map((m) => m.nome);
    const resto = donos.length - nomes.length;
    linhas.push({ rotulo: 'Cai de', valor: nomes.length > 0 ? nomes.join(', ') + (resto > 0 ? ` e mais ${resto}` : '') : 'Sem origem registrada' });
    linhas.push({ rotulo: 'Chance', valor: chanceDaRaridade(material.raridade) });
    linhas.push({ rotulo: 'Usado em', valor: textoDeUso(uso.receitasArma.get(id) ?? 0, uso.receitasArmadura.get(id) ?? 0) });
  } else if (item.categoria === 'mundo') {
    const material = MATERIAIS_MUNDO_MAP[id];
    linhas.push({ rotulo: 'Raridade', valor: RARIDADE_MAP[material.raridade].nome });
    linhas.push({ rotulo: 'Tipo', valor: NOME_TIPO_MUNDO[material.tipo] });
    linhas.push({
      rotulo: 'Onde conseguir',
      valor: material.tipo === 'diverso'
        ? `Cai de qualquer monstro da Caçada com material ${RARIDADE_MAP[material.raridade].nome.toLowerCase()} (1% por vitória, um dos dois diversos)`
        : 'Ainda sem fonte no jogo: será coletado no mapa quando o Modo História entrar',
    });
    const armas = (uso.receitasArma.get(id) ?? 0) + (material.tipo === 'diverso' ? uso.diversosArma.get(material.raridade) ?? 0 : 0);
    const armaduras = (uso.receitasArmadura.get(id) ?? 0) + (material.tipo === 'diverso' ? uso.diversosArmadura.get(material.raridade) ?? 0 : 0);
    linhas.push({ rotulo: 'Usado em', valor: textoDeUso(armas, armaduras) });
  } else if (item.categoria === 'orbes') {
    const orbe = ORBES_ARMADURA_MAP[id];
    linhas.push({ rotulo: 'Raridade', valor: RARIDADE_MAP[orbe.raridade].nome });
    linhas.push({ rotulo: 'Efeito', valor: `Dá ${orbe.xp} XP a uma peça de armadura em Melhorar armadura` });
    linhas.push({ rotulo: 'Chance', valor: `${chanceDaRaridade(orbe.raridade)}, em monstros com material desta raridade ou maior` });
  } else {
    linhas.push({ rotulo: 'Efeito', valor: 'Cada ponto de customização de uma arma Mítica custa ouro e 1 Bilhete' });
    linhas.push({ rotulo: 'Chance', valor: `${CUSTOMIZACAO.chanceBilhete9EstrelasPercentual}% por vitória contra monstros 9★` });
  }
  return { id, nome: item.nome, categoria: item.categoria, cor: item.cor, linhas };
}
