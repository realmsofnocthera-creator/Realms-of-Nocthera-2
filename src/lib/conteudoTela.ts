import { ID_DE_CONTEUDO } from '@/rules/conteudo';
import type { ResumoConteudo, ResumoVersao } from '@/server/persistencia/tipos';

/** Textos da seção de conteúdo do Painel do Mestre (sem React). */

export type Situacao = 'rascunho' | 'no-ar' | 'mudancas';

/** Em que pé está o item: só rascunho, no ar e igual ao rascunho, ou no ar com mudanças por publicar. */
export function situacaoDoConteudo(c: Pick<ResumoConteudo, 'versaoPublicada' | 'hashPublicado' | 'hashRascunho'>): { situacao: Situacao; texto: string } {
  if (c.versaoPublicada === null) return { situacao: 'rascunho', texto: 'Só rascunho: ainda não está no jogo' };
  if (c.hashPublicado === c.hashRascunho) return { situacao: 'no-ar', texto: `No jogo: versão ${c.versaoPublicada}` };
  return { situacao: 'mudancas', texto: `No jogo: versão ${c.versaoPublicada} · rascunho com mudanças por publicar` };
}

/** Uma linha do histórico. */
export function descreverVersao(v: Pick<ResumoVersao, 'versao' | 'origem' | 'revertidaDe'>, noAr: number | null): string {
  const base = v.origem === 'reversao' && v.revertidaDe !== null ? `Versão ${v.versao} · voltou para a versão ${v.revertidaDe}` : `Versão ${v.versao} · publicada`;
  return v.versao === noAr ? `${base} · no jogo` : base;
}

/** Sugere o identificador a partir do nome: "Vila de Althor" → "vila-de-althor". */
export function sugerirIdentificador(nome: string): string {
  const id = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return ID_DE_CONTEUDO.test(id) ? id : '';
}
