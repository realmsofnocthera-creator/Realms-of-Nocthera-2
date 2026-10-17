import { origemDaImagem, type TilesetDados } from '@/rules/tileset';
import type { ConteudoDocumento } from '@/server/persistencia/tipos';
import { chamar } from '@/components/mestre/comum';

export interface TilesetCarregado {
  id: string;
  nome: string;
  dados: TilesetDados;
  imagem: HTMLImageElement;
}

export function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem do tileset.'));
    img.src = src;
  });
}

/** Abre o tileset (rascunho) pelo painel e carrega a imagem. */
export async function carregarTileset(tokenFresco: () => Promise<string>, id: string): Promise<TilesetCarregado> {
  const r = await chamar(tokenFresco, `/api/mestre/conteudo/tileset/${id}`);
  if (!r.ok) throw new Error(String(r.dados.error ?? `Não foi possível abrir o tileset ${id}.`));
  const conteudo = r.dados.conteudo as ConteudoDocumento;
  const dados = conteudo.rascunho as TilesetDados;
  return { id, nome: conteudo.nome, dados, imagem: await carregarImagem(origemDaImagem(dados)) };
}
