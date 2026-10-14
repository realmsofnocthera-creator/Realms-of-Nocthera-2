import type { CharacterDocument } from '@/server/characterService';
import { DADOS_CACADA_MAP, ESTRELAS_CACADA, MONSTROS_CACADA_DADOS, MONSTROS_CACADA_MAP, RanqueCacada } from '@/rules/cacada';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { RARIDADE_MAP, RaridadeMaterial } from '@/rules/raridades';
import { estadoDaEstrela, ranqueLiberado } from '@/game/cacada';
import type { Elemento } from '@/rules/elements';

/** Lógica das telas da Caçada (ranque → estrelas → catálogo), sem React. */

type Personagem = Pick<CharacterDocument, 'nivel' | 'cacadaChavesVencidas'>;

export const NOME_ELEMENTO: Readonly<Record<Elemento, string>> = {
  fogo: 'Fogo', gelo: 'Gelo', relampago: 'Relâmpago', terra: 'Terra', vento: 'Vento', sagrado: 'Sagrado', sombrio: 'Sombrio',
};

export const COR_RARIDADE: Readonly<Record<RaridadeMaterial, string>> = {
  comum: '#B8B8B8', raro: '#5FCB6A', muitoRaro: '#5AA7F0', epico: '#C27BF0', lendario: '#F3B13C',
};

export interface RanqueTela {
  ranque: RanqueCacada;
  nome: string;
  faixa: string;
  liberado: boolean;
  requisito: string;
}

export function ranquesDaCacada(c: Personagem): RanqueTela[] {
  return [
    { ranque: 'baixo', nome: 'Ranque Baixo', faixa: '1★ a 5★', liberado: ranqueLiberado('baixo', c.nivel, c.cacadaChavesVencidas), requisito: 'Nível 2' },
    { ranque: 'alto', nome: 'Ranque Alto', faixa: '6★ a 9★', liberado: ranqueLiberado('alto', c.nivel, c.cacadaChavesVencidas), requisito: 'Nível 20 e o monstro-chave da 5★' },
  ];
}

export interface EstrelaTela {
  estrela: number;
  nivelMinimo: number;
  liberada: boolean;
  bloqueio: string | null;
  chaveVencida: boolean;
  quantidadeMonstros: number;
  chave: string | null;
}

export function estrelasDoRanque(c: Personagem, ranque: RanqueCacada): EstrelaTela[] {
  return ESTRELAS_CACADA.filter((e) => e.ranque === ranque).map((e) => {
    const estado = estadoDaEstrela(e.estrela, c.nivel, c.cacadaChavesVencidas);
    const monstros = MONSTROS_CACADA_DADOS.filter((m) => m.estrela === e.estrela);
    return {
      estrela: e.estrela,
      nivelMinimo: e.nivelMinimo,
      liberada: estado.liberada,
      bloqueio: estado.liberada
        ? null
        : estado.motivo === 'nivelInsuficiente'
          ? `Requer nível ${e.nivelMinimo}`
          : `Vença o monstro-chave da ${e.estrela - 1}★`,
      chaveVencida: (c.cacadaChavesVencidas ?? []).includes(e.estrela),
      quantidadeMonstros: monstros.length,
      chave: monstros.find((m) => m.chave)?.nome ?? null,
    };
  });
}

export interface DropTela {
  id: string;
  nome: string;
  raridade: RaridadeMaterial;
  raridadeNome: string;
  chance: string;
  cor: string;
}

export function dropsTela(ids: readonly string[]): DropTela[] {
  return ids
    .map((id) => MATERIAIS_MAP[id])
    .filter(Boolean)
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      raridade: m.raridade,
      raridadeNome: RARIDADE_MAP[m.raridade].nome,
      chance: m.raridade === 'comum' ? 'Garantido' : `${RARIDADE_MAP[m.raridade].chancePercentual}%`,
      cor: COR_RARIDADE[m.raridade],
    }));
}

export interface MonstroTela {
  id: string;
  nome: string;
  chave: boolean;
  tipo: string;
  descricao: string;
  nivel: number;
  elemento: string | null;
  fracoA: string[];
  drops: DropTela[];
}

export function monstrosDaEstrela(estrela: number): MonstroTela[] {
  return MONSTROS_CACADA_DADOS.filter((m) => m.estrela === estrela).map((d) => ({
    id: d.id,
    nome: d.nome,
    chave: d.chave === true,
    tipo: [d.tipo, d.regiao].filter(Boolean).join(' · '),
    descricao: d.descricao,
    nivel: MONSTROS_CACADA_MAP[d.id].nivel,
    elemento: d.elementoAtaque ? NOME_ELEMENTO[d.elementoAtaque] : null,
    fracoA: (d.fracoA ?? []).map((e) => NOME_ELEMENTO[e]),
    drops: dropsTela(d.drops),
  }));
}

export function estrelaDoMonstro(id: string): number | null {
  return DADOS_CACADA_MAP[id]?.estrela ?? null;
}
