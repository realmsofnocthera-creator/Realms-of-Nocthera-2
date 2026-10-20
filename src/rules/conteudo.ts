import type { PermissaoMestre } from '@/rules/mestre';
import { validarMapa, type MapaDados, type ResultadoValidacao } from '@/rules/mapa';
import { validarTileset } from '@/rules/tileset';
import { validarMonstro } from '@/rules/monstroConteudo';
import { validarArma } from '@/rules/armaConteudo';
import { validarArmadura } from '@/rules/armaduraConteudo';
import { validarEmblema } from '@/rules/emblemaConteudo';
import { validarAnuncio } from '@/rules/anuncio';
import { validarCena } from '@/rules/cena';

/**
 * Conteúdo editável pelo Painel do Mestre (3.5.2.2): cada item tem um rascunho e versões publicadas numeradas.
 * Publicar cria uma versão nova; voltar atrás publica de novo uma versão antiga como versão nova (o histórico só cresce).
 * O jogo lê apenas a versão publicada.
 */
export const TIPOS_DE_CONTEUDO = ['mapa', 'tileset', 'monstro', 'arma', 'armadura', 'emblema', 'anuncio', 'cena'] as const;
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
};

/** Identificador do item: minúsculas, números e hífen (ex.: "vila-inicial"). Fica fixo depois de criado. */
export const ID_DE_CONTEUDO = /^[a-z0-9][a-z0-9-]{1,47}$/;
export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 60;
/** Teto do conteúdo em JSON: cabe com folga num documento do banco (1 MiB). */
export const TAMANHO_MAXIMO_EM_BYTES = 600_000;

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
  if (tipo !== 'mapa') return [];
  const mapa = dados as MapaDados;
  const refs: ReferenciaDeConteudo[] = mapa.tilesets.map((id) => ({ tipo: 'tileset' as const, id }));
  const vistos = new Set<string>();
  for (const o of mapa.objetos ?? []) {
    if (o.tipo === 'porta' && o.destino && !vistos.has(`mapa:${o.destino.mapa}`)) {
      vistos.add(`mapa:${o.destino.mapa}`);
      refs.push({ tipo: 'mapa', id: o.destino.mapa, soExistir: true });
    }
    if ((o.tipo === 'cena' || o.tipo === 'npc') && o.cenaId && !vistos.has(`cena:${o.cenaId}`)) {
      vistos.add(`cena:${o.cenaId}`);
      refs.push({ tipo: 'cena', id: o.cenaId });
    }
    if (o.tipo === 'cacada' && o.monstroId && !vistos.has(`monstro:${o.monstroId}`)) {
      vistos.add(`monstro:${o.monstroId}`);
      refs.push({ tipo: 'monstro', id: o.monstroId, podeSerDoCodigo: true });
    }
  }
  return refs;
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
