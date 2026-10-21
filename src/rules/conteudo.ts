import type { PermissaoMestre } from '@/rules/mestre';
import { validarMapa, type MapaDados, type ResultadoValidacao } from '@/rules/mapa';
import { validarTileset } from '@/rules/tileset';
import { validarMonstro } from '@/rules/monstroConteudo';
import { validarArma } from '@/rules/armaConteudo';
import { validarArmadura } from '@/rules/armaduraConteudo';
import { validarEmblema } from '@/rules/emblemaConteudo';
import { validarAnuncio } from '@/rules/anuncio';
import { validarCena } from '@/rules/cena';
import { validarMissao, type MissaoDados } from '@/rules/missao';
import { bytesGuardados } from '@/rules/mapaComprimido';

/**
 * Conteúdo editável pelo Painel do Mestre (3.5.2.2): cada item tem um rascunho e versões publicadas numeradas.
 * Publicar cria uma versão nova; voltar atrás publica de novo uma versão antiga como versão nova (o histórico só cresce).
 * O jogo lê apenas a versão publicada.
 */
export const TIPOS_DE_CONTEUDO = ['mapa', 'tileset', 'monstro', 'arma', 'armadura', 'emblema', 'anuncio', 'cena', 'missao'] as const;
export type TipoDeConteudo = (typeof TIPOS_DE_CONTEUDO)[number];

export const NOME_DO_TIPO: Readonly<Record<TipoDeConteudo, string>> = {
  mapa: 'Mapa',
  tileset: 'Tileset',
  monstro: 'Monstro',
  arma: 'Arma',
  armadura: 'Armadura',
  emblema: 'Emblema',
  anuncio: 'Anúncio',
  cena: 'Cena',
  missao: 'Missão',
};

/** Permissão para criar e editar o rascunho de cada tipo; publicar e voltar atrás pedem 'conteudo.publicar'. */
export const PERMISSAO_DE_EDICAO: Readonly<Record<TipoDeConteudo, PermissaoMestre>> = {
  mapa: 'mapas.editar',
  tileset: 'mapas.editar',
  monstro: 'conteudo.editar',
  arma: 'conteudo.editar',
  armadura: 'conteudo.editar',
  emblema: 'conteudo.editar',
  anuncio: 'conteudo.editar',
  cena: 'mapas.editar',
  missao: 'mapas.editar',
};

/** Identificador do item: minúsculas, números e hífen (ex.: "vila-inicial"). Fica fixo depois de criado. */
export const ID_DE_CONTEUDO = /^[a-z0-9][a-z0-9-]{1,47}$/;
export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 60;
/** Teto do conteúdo em JSON: cabe com folga num documento do banco (1 MiB). */
export const TAMANHO_MAXIMO_EM_BYTES = 600_000;
/** O mapa é medido pela forma que vai ao banco (comprimida, se grande); o documento do banco guarda no máximo 1 MiB. */
export const TAMANHO_MAXIMO_DO_MAPA_EM_BYTES = 800_000;

/** Tipos de catálogo: o jogo inteiro lê a lista publicada (itens que o painel edita por cima do código). */
export const TIPOS_DO_CATALOGO = ['arma', 'armadura', 'emblema'] as const;

/** Lista publicada que o Menu lê (anúncios vigentes). */
export const TIPO_DOS_ANUNCIOS = 'anuncio' as const;

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
  arma: validarArma,
  armadura: validarArmadura,
  emblema: validarEmblema,
  anuncio: validarAnuncio,
  cena: validarCena,
  missao: validarMissao,
};

/** Um conteúdo que outro usa. `soExistir`: basta existir (não precisa estar publicado). `podeSerDoCodigo`: o monstro pode ser do código. */
export interface ReferenciaDeConteudo {
  tipo: TipoDeConteudo;
  id: string;
  soExistir?: boolean;
  podeSerDoCodigo?: boolean;
}

/**
 * Outros conteúdos que este usa (já validado). O mapa aponta para os seus tilesets (têm de estar publicados), para os
 * mapas de destino das portas (basta existirem: dois mapas que se ligam não conseguiriam ser publicados um antes do
 * outro) e para os monstros das áreas de monstros (do código ou do banco).
 */
export function referenciasDoConteudo(tipo: TipoDeConteudo, dados: unknown): ReferenciaDeConteudo[] {
  if (tipo !== 'mapa' && tipo !== 'missao') return [];
  const refs = new Map<string, ReferenciaDeConteudo>();
  const juntar = (ref: ReferenciaDeConteudo) => {
    const chave = `${ref.tipo}:${ref.id}`;
    const antes = refs.get(chave);
    // a exigência mais forte vence: "precisa estar publicado" ganha de "basta existir"
    if (!antes || (antes.soExistir && !ref.soExistir)) refs.set(chave, ref);
  };
  if (tipo === 'missao') {
    const m = dados as MissaoDados;
    for (const o of m.objetivos ?? []) {
      if (o.cenaId) juntar({ tipo: 'cena', id: o.cenaId, soExistir: true });
      if (o.mapa) juntar({ tipo: 'mapa', id: o.mapa, soExistir: true });
      if (o.monstroId) juntar({ tipo: 'monstro', id: o.monstroId, podeSerDoCodigo: true });
    }
    for (const id of m.requisitos?.missoes ?? []) juntar({ tipo: 'missao', id, soExistir: true });
    return [...refs.values()];
  }
  const mapa = dados as MapaDados;
  for (const id of mapa.tilesets) juntar({ tipo: 'tileset', id });
  for (const o of mapa.objetos ?? []) {
    if (o.tipo === 'porta' && o.destino) juntar({ tipo: 'mapa', id: o.destino.mapa, soExistir: true });
    if ((o.tipo === 'cena' || o.tipo === 'npc') && o.cenaId) juntar({ tipo: 'cena', id: o.cenaId });
    if (o.tipo === 'cacada' && o.monstroId) juntar({ tipo: 'monstro', id: o.monstroId, podeSerDoCodigo: true });
    // missões se referem a mapas e mapas a missões: basta existir, senão um não seria publicado antes do outro
    if (o.missaoId) juntar({ tipo: 'missao', id: o.missaoId, soExistir: true });
    if (o.condicao?.missaoAtiva) juntar({ tipo: 'missao', id: o.condicao.missaoAtiva, soExistir: true });
    if (o.condicao?.missaoConcluida) juntar({ tipo: 'missao', id: o.condicao.missaoConcluida, soExistir: true });
    if (o.condicao?.cenaVista) juntar({ tipo: 'cena', id: o.condicao.cenaVista, soExistir: true });
  }
  return [...refs.values()];
}

/** Valida o conteúdo pelo schema do tipo e pelo tamanho; devolve a cópia limpa. */
export function validarConteudo(tipo: TipoDeConteudo, bruto: unknown): ResultadoValidacao<unknown> {
  const resultado = VALIDADORES[tipo](bruto);
  if (!resultado.ok) return resultado;
  const bytes = tipo === 'mapa' ? bytesGuardados(resultado.dados) : new TextEncoder().encode(JSON.stringify(resultado.dados)).length;
  const maximo = tipo === 'mapa' ? TAMANHO_MAXIMO_DO_MAPA_EM_BYTES : TAMANHO_MAXIMO_EM_BYTES;
  if (bytes > maximo) {
    return { ok: false, erros: [`O conteúdo ficou grande demais (${bytes} bytes; o máximo é ${maximo}).${tipo === 'mapa' ? ' Reduza o mapa ou repita mais os mesmos tiles.' : ''}`] };
  }
  return resultado;
}
