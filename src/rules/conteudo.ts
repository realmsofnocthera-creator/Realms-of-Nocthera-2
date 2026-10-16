import type { PermissaoMestre } from '@/rules/mestre';
import { validarMapa, type MapaDados, type ResultadoValidacao } from '@/rules/mapa';
import { validarTileset } from '@/rules/tileset';
import { validarMonstro } from '@/rules/monstroConteudo';

/**
 * Conteúdo editável pelo Painel do Mestre (3.5.2.2): cada item tem um rascunho e versões publicadas numeradas.
 * Publicar cria uma versão nova; voltar atrás publica de novo uma versão antiga como versão nova (o histórico só cresce).
 * O jogo lê apenas a versão publicada.
 */
export const TIPOS_DE_CONTEUDO = ['mapa', 'tileset', 'monstro'] as const;
export type TipoDeConteudo = (typeof TIPOS_DE_CONTEUDO)[number];

export const NOME_DO_TIPO: Readonly<Record<TipoDeConteudo, string>> = {
  mapa: 'Mapa',
  tileset: 'Tileset',
  monstro: 'Monstro',
};

/** Permissão para criar e editar o rascunho de cada tipo; publicar e voltar atrás pedem 'conteudo.publicar'. */
export const PERMISSAO_DE_EDICAO: Readonly<Record<TipoDeConteudo, PermissaoMestre>> = {
  mapa: 'mapas.editar',
  tileset: 'mapas.editar',
  monstro: 'conteudo.editar',
};

/** Identificador do item: minúsculas, números e hífen (ex.: "vila-inicial"). Fica fixo depois de criado. */
export const ID_DE_CONTEUDO = /^[a-z0-9][a-z0-9-]{1,47}$/;
export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 60;
/** Teto do conteúdo em JSON: cabe com folga num documento do banco (1 MiB). */
export const TAMANHO_MAXIMO_EM_BYTES = 600_000;

export function ehTipoDeConteudo(valor: unknown): valor is TipoDeConteudo {
  return typeof valor === 'string' && (TIPOS_DE_CONTEUDO as readonly string[]).includes(valor);
}

export function chaveDoConteudo(tipo: TipoDeConteudo, id: string): string {
  return `${tipo}__${id}`;
}

const VALIDADORES: Readonly<Record<TipoDeConteudo, (bruto: unknown) => ResultadoValidacao<unknown>>> = {
  mapa: validarMapa,
  tileset: validarTileset,
  monstro: validarMonstro,
};

/** Outros conteúdos que este usa (já validado): o mapa aponta para os seus tilesets. */
export function referenciasDoConteudo(tipo: TipoDeConteudo, dados: unknown): { tipo: TipoDeConteudo; id: string }[] {
  if (tipo === 'mapa') return (dados as MapaDados).tilesets.map((id) => ({ tipo: 'tileset' as const, id }));
  return [];
}

/** Valida o conteúdo pelo schema do tipo e pelo tamanho; devolve a cópia limpa. */
export function validarConteudo(tipo: TipoDeConteudo, bruto: unknown): ResultadoValidacao<unknown> {
  const resultado = VALIDADORES[tipo](bruto);
  if (!resultado.ok) return resultado;
  const bytes = new TextEncoder().encode(JSON.stringify(resultado.dados)).length;
  if (bytes > TAMANHO_MAXIMO_EM_BYTES) {
    return { ok: false, erros: [`O conteúdo ficou grande demais (${bytes} bytes; o máximo é ${TAMANHO_MAXIMO_EM_BYTES}).`] };
  }
  return resultado;
}
