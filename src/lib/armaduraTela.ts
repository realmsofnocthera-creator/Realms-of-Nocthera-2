import type { CharacterDocument } from '@/server/characterService';
import { DADOS_CACADA_MAP } from '@/rules/cacada';
import {
  ESPACOS_ARMADURA_MAP,
  EspacoArmadura,
  EstiloArmadura,
  FAIXA_SORTEIO_ARMADURA,
  NIVEL_MAXIMO_ARMADURA,
  ORBES_ARMADURA,
  XP_TOTAL_ARMADURA,
  fixoDaPeca,
  nivelDoXpArmadura,
  xpAcumuladoAteNivel,
} from '@/rules/armaduras';
import { PECAS_ARMADURA, PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { RARIDADES_ARMA_MAP, RaridadeArma } from '@/rules/armas';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';
import { COR_RARIDADE } from '@/lib/cacadaTela';
import { COR_RARIDADE_ARMA, LinhaReceitaTela, linhasDaReceita } from '@/lib/forjaTela';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';

/** Lógica da tela "Melhorar armadura" (lista de conjuntos, detalhe da peça, orbes), sem React. */

type Personagem = Pick<CharacterDocument, 'inventario' | 'ouro' | 'armaduras'>;

export const NOME_ESTILO: Readonly<Record<EstiloArmadura, string>> = {
  fisico: 'Físico',
  veloz: 'Veloz',
  guardiao: 'Guardião',
  arcano: 'Arcano',
};

const NOME_FIXO = { vida: 'Vida', defesa: 'Defesa', agilidade: 'Agilidade' } as const;

/** Estado da peça para o personagem: tem alguma, dá para fabricar agora, ou falta material/ouro. */
export type EstadoPecaTela = 'tenho' | 'disponivel' | 'faltaMaterial';

export interface PecaTela {
  pecaId: string;
  espaco: EspacoArmadura;
  espacoNome: string;
  nome: string;
  raridade: RaridadeArma;
  estado: EstadoPecaTela;
  quantas: number;
}

export interface ConjuntoTela {
  conjuntoId: string;
  nome: string;
  estrela: number;
  raridade: RaridadeArma;
  raridadeNome: string;
  estilo: string;
  pecas: PecaTela[];
}

const minhas = (c: Pick<CharacterDocument, 'armaduras'>) => c.armaduras ?? [];

function estadoDaPeca(pecaId: string, c: Personagem): EstadoPecaTela {
  if (minhas(c).some((a) => a.pecaId === pecaId)) return 'tenho';
  const { materiais, diversos, ouro } = linhasDaReceita(PECAS_ARMADURA_MAP[pecaId].receita, c);
  return materiais.every((m) => m.ok) && (!diversos || diversos.ok) && ouro.ok ? 'disponivel' : 'faltaMaterial';
}

/** Os 82 conjuntos em ordem de estrela (o Mítico logo depois do Lendário do mesmo monstro). */
export function conjuntosDaTela(c: Personagem): ConjuntoTela[] {
  const lista: ConjuntoTela[] = [];
  for (const p of PECAS_ARMADURA) {
    let conj = lista.find((x) => x.conjuntoId === p.conjuntoId);
    if (!conj) {
      const monstro = DADOS_CACADA_MAP[p.monstroId].nome;
      conj = {
        conjuntoId: p.conjuntoId,
        nome: p.raridade === 'mitico' ? `${monstro} (Mítico)` : monstro,
        estrela: p.estrela,
        raridade: p.raridade,
        raridadeNome: RARIDADES_ARMA_MAP[p.raridade].nome,
        estilo: NOME_ESTILO[p.estilo],
        pecas: [],
      };
      lista.push(conj);
    }
    conj.pecas.push({
      pecaId: p.id,
      espaco: p.espaco,
      espacoNome: ESPACOS_ARMADURA_MAP[p.espaco].nome,
      nome: p.nome,
      raridade: p.raridade,
      estado: estadoDaPeca(p.id, c),
      quantas: minhas(c).filter((a) => a.pecaId === p.id).length,
    });
  }
  return lista.sort((a, b) => a.estrela - b.estrela);
}

export interface MinhaPecaTela {
  id: string;
  pecaId: string;
  nome: string;
  espacoNome: string;
  raridade: RaridadeArma;
  cor: string;
  atributo: string;
  pontos: number;
  reforjas: number;
  nivel: number;
  xp: number;
  /** XP dentro do nível atual e o que falta para o próximo (0/0 no nível 30). */
  xpNoNivel: number;
  xpDoNivel: number;
  fixo: string;
}

export function minhaPecaTela(a: ArmaduraPersonagem): MinhaPecaTela {
  const p = PECAS_ARMADURA_MAP[a.pecaId];
  const nivel = nivelDoXpArmadura(a.xp);
  const inicio = xpAcumuladoAteNivel(nivel);
  const fim = nivel >= NIVEL_MAXIMO_ARMADURA ? inicio : xpAcumuladoAteNivel(nivel + 1);
  const def = ESPACOS_ARMADURA_MAP[p.espaco];
  return {
    id: a.id,
    pecaId: p.id,
    nome: p.nome,
    espacoNome: def.nome,
    raridade: p.raridade,
    cor: COR_RARIDADE_ARMA[p.raridade],
    atributo: ATTRIBUTE_DISPLAY_NAMES[a.atributo],
    pontos: a.pontos,
    reforjas: a.reforjas,
    nivel,
    xp: a.xp,
    xpNoNivel: a.xp - inicio,
    xpDoNivel: fim - inicio,
    fixo: `${NOME_FIXO[def.fixo]} ${fixoDaPeca(p.estrela, p.espaco, nivel)}`,
  };
}

/** Aba "Minhas peças": do maior nível para o menor. */
export function minhasPecasTela(c: Pick<CharacterDocument, 'armaduras'>): MinhaPecaTela[] {
  return minhas(c)
    .filter((a) => PECAS_ARMADURA_MAP[a.pecaId])
    .map(minhaPecaTela)
    .sort((x, y) => y.nivel - x.nivel || x.nome.localeCompare(y.nome));
}

export interface HabilidadeTela {
  id: string;
  nome: string;
  nivel: number;
  efeito: string;
}

/**
 * Texto do efeito no nível. Os níveis acima do 1 costumam trazer só o valor ("+4%."); nesse caso mostra o
 * nível 1 completo antes, para o jogador entender a que o valor se refere.
 */
export function efeitoDoNivel(niveis: Readonly<Record<number, string>>, nivel: number): string {
  const texto = niveis[nivel] ?? '';
  const primeiro = niveis[1];
  if (nivel > 1 && primeiro && texto.length < 30 && /^[+−\-×\d]/.test(texto)) return `${primeiro} No Nv. ${nivel}: ${texto}`;
  return texto;
}

export interface DetalhePecaTela {
  pecaId: string;
  nome: string;
  conjunto: string;
  estrela: number;
  raridade: RaridadeArma;
  raridadeNome: string;
  cor: string;
  espacoNome: string;
  estilo: string;
  fixo: string;
  fixoNivel0: number;
  fixoNivel30: number;
  sorteio: string;
  habilidades: HabilidadeTela[];
  materiais: LinhaReceitaTela[];
  diversos: LinhaReceitaTela | null;
  ouro: { precisa: number; tem: number; ok: boolean };
  estado: EstadoPecaTela;
  podeFabricar: boolean;
  minhas: MinhaPecaTela[];
}

export function detalheDaPeca(pecaId: string, c: Personagem): DetalhePecaTela {
  const p = PECAS_ARMADURA_MAP[pecaId];
  const def = ESPACOS_ARMADURA_MAP[p.espaco];
  const { materiais, diversos, ouro } = linhasDaReceita(p.receita, c);
  const faixa = FAIXA_SORTEIO_ARMADURA[p.raridade];
  const podeFabricar = materiais.every((m) => m.ok) && (!diversos || diversos.ok) && ouro.ok;
  return {
    pecaId,
    nome: p.nome,
    conjunto: DADOS_CACADA_MAP[p.monstroId].nome,
    estrela: p.estrela,
    raridade: p.raridade,
    raridadeNome: RARIDADES_ARMA_MAP[p.raridade].nome,
    cor: COR_RARIDADE_ARMA[p.raridade],
    espacoNome: def.nome,
    estilo: NOME_ESTILO[p.estilo],
    fixo: NOME_FIXO[def.fixo],
    fixoNivel0: fixoDaPeca(p.estrela, p.espaco, 0),
    fixoNivel30: fixoDaPeca(p.estrela, p.espaco, NIVEL_MAXIMO_ARMADURA),
    sorteio: `Arcano, Vigor ou Vitalidade: ${faixa.min} a ${faixa.max} pontos`,
    habilidades: p.habilidades.map((h) => {
      const def_ = HABILIDADES_ARMADURA_MAP[h.id];
      return { id: h.id, nome: def_.nome, nivel: h.nivel, efeito: efeitoDoNivel(def_.niveis, h.nivel) };
    }),
    materiais,
    diversos,
    ouro,
    estado: estadoDaPeca(pecaId, c),
    podeFabricar,
    minhas: minhas(c).filter((a) => a.pecaId === pecaId).map(minhaPecaTela),
  };
}

export interface OrbeTela {
  id: string;
  nome: string;
  xp: number;
  cor: string;
  tenho: number;
}

/** Os 5 orbes de armadura com a quantidade no inventário. */
export function orbesDaTela(c: Pick<CharacterDocument, 'inventario'>): OrbeTela[] {
  return ORBES_ARMADURA.map((o) => ({ id: o.id, nome: o.nome, xp: o.xp, cor: COR_RARIDADE[o.raridade], tenho: c.inventario?.[o.id] ?? 0 }));
}

/** XP que os orbes escolhidos dão de fato à peça (o que passa do nível 30 se perde). */
export function xpDosOrbes(escolha: Readonly<Record<string, number>>, xpAtual: number): { total: number; aproveitado: number; nivelDepois: number } {
  const total = ORBES_ARMADURA.reduce((s, o) => s + o.xp * (escolha[o.id] ?? 0), 0);
  const depois = Math.min(XP_TOTAL_ARMADURA, xpAtual + total);
  return { total, aproveitado: depois - xpAtual, nivelDepois: nivelDoXpArmadura(depois) };
}

export const ESTRELAS_ARMADURA = [...new Set(PECAS_ARMADURA.map((p) => p.estrela))].sort((a, b) => a - b);
