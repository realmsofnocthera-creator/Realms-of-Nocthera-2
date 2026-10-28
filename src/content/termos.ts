/**
 * Texto dos Termos de Uso (página /termos). Enquanto a lista estiver vazia, a página mostra "em elaboração".
 * Para publicar: preencha as seções abaixo (titulo + paragrafos) e troque VERSAO_DOS_TERMOS em src/rules/termos.ts.
 * O texto é jurídico e deve vir de quem responde pelo projeto; nada aqui foi escrito por conta própria.
 */
export interface SecaoDeTexto {
  titulo: string;
  paragrafos: readonly string[];
}

export const TERMOS_DE_USO: readonly SecaoDeTexto[] = [];
