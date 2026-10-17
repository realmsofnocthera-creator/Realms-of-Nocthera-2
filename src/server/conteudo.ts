import { createHash } from 'node:crypto';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { validarMapa, type MapaDados } from '@/rules/mapa';
import { verificarMapa, type ProblemaDoMapa } from '@/rules/verificarMapa';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { MONSTERS_MAP } from '@/rules/monsters';
import {
  chaveDoConteudo,
  ehTipoDeConteudo,
  ID_DE_CONTEUDO,
  NOME_DO_TIPO,
  NOME_MAXIMO,
  NOME_MINIMO,
  PERMISSAO_DE_EDICAO,
  referenciasDoConteudo,
  validarConteudo,
  type TipoDeConteudo,
} from '@/rules/conteudo';
import { comRegistro, ErroMestre, exigir, motivoValido, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import type { ConteudoDocumento, ResumoConteudo, ResumoVersao, VersaoConteudo } from '@/server/persistencia/tipos';

/**
 * Conteúdo versionado do Painel do Mestre (3.5.2.2): rascunho → publicado, histórico e volta atrás.
 * Toda gravação passa pelo schema do tipo no servidor e fica no log administrativo antes de acontecer.
 * O log guarda o hash e os números de revisão e versão, não o conteúdo inteiro (que pode ser grande).
 */

export const LIMITE_DO_HISTORICO = 50;
/** O jogo lê o publicado com cache curto: uma publicação chega a todos em até 30 s. */
export const TTL_CACHE_PUBLICADO_MS = 30_000;

const ERRO_CONFLITO = 'Este conteúdo mudou desde que você abriu. Recarregue para ver a versão atual.';

function hashDe(dados: unknown): string {
  return createHash('sha256').update(JSON.stringify(dados)).digest('hex');
}

function tipoValido(tipo: unknown): TipoDeConteudo {
  if (!ehTipoDeConteudo(tipo)) throw new ErroMestre(400, 'Tipo de conteúdo desconhecido.');
  return tipo;
}

function idValido(id: unknown): string {
  if (typeof id !== 'string' || !ID_DE_CONTEUDO.test(id)) {
    throw new ErroMestre(400, 'Identificador inválido: use de 2 a 48 letras minúsculas, números e hífen (ex.: vila-inicial).');
  }
  return id;
}

function nomeValido(nome: unknown): string {
  const texto = typeof nome === 'string' ? nome.trim() : '';
  if (texto.length < NOME_MINIMO || texto.length > NOME_MAXIMO) {
    throw new ErroMestre(400, `O nome vai de ${NOME_MINIMO} a ${NOME_MAXIMO} caracteres.`);
  }
  return texto;
}

function inteiroValido(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) throw new ErroMestre(400, `Informe ${campo}.`);
  return valor;
}

function dadosValidos(tipo: TipoDeConteudo, bruto: unknown): unknown {
  const r = validarConteudo(tipo, bruto);
  if (!r.ok) throw new ErroMestre(400, `${NOME_DO_TIPO[tipo]} inválido: ${r.erros.join(' ')}`);
  return r.dados;
}

/**
 * As referências precisam existir para salvar, e estar publicadas para publicar (senão o jogo não teria o que mostrar).
 */
async function conferirReferencias(tipo: TipoDeConteudo, dados: unknown, exigirPublicadas: boolean): Promise<void> {
  for (const ref of referenciasDoConteudo(tipo, dados)) {
    if (ref.podeSerDoCodigo && ref.tipo === 'monstro' && (MONSTROS_CACADA_MAP[ref.id] || MONSTERS_MAP[ref.id] || CHEFES_ESPECIAIS_MAP[ref.id])) continue;
    const doc = await repositorio.lerConteudo(chaveDoConteudo(ref.tipo, ref.id));
    if (!doc) throw new ErroMestre(400, `${NOME_DO_TIPO[ref.tipo]} "${ref.id}" não existe.`);
    if (exigirPublicadas && !ref.soExistir && doc.versaoPublicada === null) {
      throw new ErroMestre(400, `Publique antes o ${NOME_DO_TIPO[ref.tipo].toLowerCase()} "${ref.id}": o jogo só usa o que está publicado.`);
    }
  }
}

/** Os outros mapas (rascunhos mais recentes e válidos), por id, para conferir destinos de portas e ligações. */
async function outrosMapas(exceto: string): Promise<Record<string, MapaDados>> {
  const resultado: Record<string, MapaDados> = {};
  for (const resumo of await repositorio.listarConteudos('mapa')) {
    if (resumo.id === exceto) continue;
    const doc = await repositorio.lerConteudo(resumo.chave);
    const v = doc ? validarMapa(doc.rascunho) : null;
    if (v?.ok) resultado[resumo.id] = v.dados;
  }
  return resultado;
}

/** Problemas do mapa para o painel: erros (impedem publicar) e avisos. */
export async function verificarMapaDoPainel(sessao: SessaoMestre, tipoBruto: unknown, idBruto: unknown): Promise<ProblemaDoMapa[]> {
  exigir(sessao, 'conteudo.ler');
  if (tipoValido(tipoBruto) !== 'mapa') throw new ErroMestre(400, 'A verificação vale só para mapas.');
  const id = idValido(idBruto);
  const doc = await lerOuFalhar('mapa', id);
  const v = validarMapa(doc.rascunho);
  if (!v.ok) throw new ErroMestre(400, `Mapa inválido: ${v.erros.join(' ')}`);
  return verificarMapa(id, v.dados, await outrosMapas(id));
}

async function lerOuFalhar(tipo: TipoDeConteudo, id: string): Promise<ConteudoDocumento> {
  const doc = await repositorio.lerConteudo(chaveDoConteudo(tipo, id));
  if (!doc) throw new ErroMestre(404, `${NOME_DO_TIPO[tipo]} não encontrado.`);
  return doc;
}

const retrato = (d: Pick<ResumoConteudo, 'revisao' | 'hashRascunho' | 'versaoPublicada' | 'hashPublicado'>) => ({
  revisao: d.revisao,
  hashRascunho: d.hashRascunho,
  versaoPublicada: d.versaoPublicada,
  hashPublicado: d.hashPublicado,
});

// ---- leitura no painel ----

export async function listarConteudos(sessao: SessaoMestre, tipoBruto: unknown): Promise<ResumoConteudo[]> {
  exigir(sessao, 'conteudo.ler');
  const tipo = tipoValido(tipoBruto);
  const itens = await repositorio.listarConteudos(tipo);
  return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface DetalheDoConteudo {
  conteudo: ConteudoDocumento;
  versoes: ResumoVersao[];
}

export async function lerConteudoDoPainel(sessao: SessaoMestre, tipoBruto: unknown, idBruto: unknown): Promise<DetalheDoConteudo> {
  exigir(sessao, 'conteudo.ler');
  const tipo = tipoValido(tipoBruto);
  const conteudo = await lerOuFalhar(tipo, idValido(idBruto));
  const versoes = await repositorio.listarVersoesConteudo(conteudo.chave, LIMITE_DO_HISTORICO);
  return { conteudo, versoes };
}

export async function lerVersaoDoPainel(sessao: SessaoMestre, tipoBruto: unknown, idBruto: unknown, versaoBruta: unknown): Promise<VersaoConteudo> {
  exigir(sessao, 'conteudo.ler');
  const tipo = tipoValido(tipoBruto);
  const id = idValido(idBruto);
  const numero = Number(versaoBruta);
  if (!Number.isInteger(numero) || numero < 1) throw new ErroMestre(400, 'Versão inválida.');
  const versao = await repositorio.lerVersaoConteudo(chaveDoConteudo(tipo, id), numero);
  if (!versao) throw new ErroMestre(404, 'Versão não encontrada.');
  return versao;
}

// ---- gravação ----

export interface PedidoDeCriacao {
  tipo: unknown;
  id: unknown;
  nome: unknown;
  dados: unknown;
}

/** Cria o item só com o rascunho (nada vai ao ar até publicar). */
export async function criarConteudo(sessao: SessaoMestre, pedido: PedidoDeCriacao, ip?: string): Promise<ConteudoDocumento> {
  const tipo = tipoValido(pedido.tipo);
  exigir(sessao, PERMISSAO_DE_EDICAO[tipo]);
  const id = idValido(pedido.id);
  const nome = nomeValido(pedido.nome);
  const dados = dadosValidos(tipo, pedido.dados);
  await conferirReferencias(tipo, dados, false);
  const agora = new Date().toISOString();
  const doc: ConteudoDocumento = {
    chave: chaveDoConteudo(tipo, id),
    tipo,
    id,
    nome,
    revisao: 1,
    rascunho: dados,
    hashRascunho: hashDe(dados),
    editadoEm: agora,
    editadoPor: sessao.uid,
    criadoEm: agora,
    criadoPor: sessao.uid,
    versaoPublicada: null,
    hashPublicado: null,
    ultimaVersao: 0,
  };
  if (await repositorio.lerConteudo(doc.chave)) throw new ErroMestre(409, 'Já existe um item com esse identificador.');
  const criado = await comRegistro(sessao, { acao: 'conteudo.criar', alvo: doc.chave, depois: { nome, ...retrato(doc) }, ip }, () =>
    repositorio.criarConteudo(doc)
  );
  if (!criado) throw new ErroMestre(409, 'Já existe um item com esse identificador.');
  return doc;
}

export interface PedidoDeRascunho {
  dados: unknown;
  revisao: unknown;
  nome?: unknown;
}

/** Salva o rascunho. `revisao` é a que a tela abriu: se outra pessoa salvou no meio, 409 e nada se perde. */
export async function salvarRascunho(
  sessao: SessaoMestre,
  tipoBruto: unknown,
  idBruto: unknown,
  pedido: PedidoDeRascunho,
  ip?: string
): Promise<ConteudoDocumento> {
  const tipo = tipoValido(tipoBruto);
  exigir(sessao, PERMISSAO_DE_EDICAO[tipo]);
  const atual = await lerOuFalhar(tipo, idValido(idBruto));
  const revisao = inteiroValido(pedido.revisao, 'a revisão que você abriu');
  if (revisao !== atual.revisao) throw new ErroMestre(409, ERRO_CONFLITO);
  const dados = dadosValidos(tipo, pedido.dados);
  await conferirReferencias(tipo, dados, false);
  const nome = pedido.nome === undefined ? undefined : nomeValido(pedido.nome);
  const hashRascunho = hashDe(dados);
  const resultado = await comRegistro(
    sessao,
    {
      acao: 'conteudo.rascunho',
      alvo: atual.chave,
      antes: { nome: atual.nome, ...retrato(atual) },
      depois: { nome: nome ?? atual.nome, revisao: revisao + 1, hashRascunho },
      ip,
    },
    () =>
      repositorio.salvarRascunhoConteudo(atual.chave, revisao, {
        rascunho: dados,
        hashRascunho,
        editadoEm: new Date().toISOString(),
        editadoPor: sessao.uid,
        ...(nome !== undefined ? { nome } : {}),
      })
  );
  if (resultado === 'inexistente') throw new ErroMestre(404, `${NOME_DO_TIPO[tipo]} não encontrado.`);
  if (resultado === 'conflito') throw new ErroMestre(409, ERRO_CONFLITO);
  return resultado;
}

export interface PedidoDePublicacao {
  revisao: unknown;
  motivo: unknown;
}

/** Publica o rascunho como versão nova. O rascunho é validado de novo (o schema pode ter ficado mais rígido). */
export async function publicarConteudo(
  sessao: SessaoMestre,
  tipoBruto: unknown,
  idBruto: unknown,
  pedido: PedidoDePublicacao,
  ip?: string
): Promise<{ conteudo: ConteudoDocumento; versao: ResumoVersao }> {
  const tipo = tipoValido(tipoBruto);
  exigir(sessao, 'conteudo.publicar');
  const atual = await lerOuFalhar(tipo, idValido(idBruto));
  const revisao = inteiroValido(pedido.revisao, 'a revisão que você abriu');
  const motivo = motivoValido(pedido.motivo);
  if (revisao !== atual.revisao) throw new ErroMestre(409, ERRO_CONFLITO);
  if (atual.hashPublicado === atual.hashRascunho) throw new ErroMestre(400, 'O rascunho é igual ao que já está no ar.');
  const dados = dadosValidos(tipo, atual.rascunho);
  await conferirReferencias(tipo, dados, true);
  if (tipo === 'mapa') {
    const erros = verificarMapa(atual.id, dados as MapaDados, await outrosMapas(atual.id)).filter((p) => p.nivel === 'erro');
    if (erros.length) throw new ErroMestre(400, `O mapa tem problemas que impedem a publicação: ${erros.map((e) => e.texto).join(' ')}`);
  }
  const hash = hashDe(dados);
  return publicar(sessao, atual, { revisao }, { dados, hash, motivo, origem: 'publicacao', revertidaDe: null }, 'conteudo.publicar', ip);
}

export interface PedidoDeReversao {
  versao: unknown;
  /** A última versão que a tela viu (evita voltar atrás em cima de uma publicação nova). */
  ultimaVersao: unknown;
  motivo: unknown;
}

/** Volta atrás: publica de novo uma versão antiga, como versão nova. O rascunho não muda. */
export async function reverterConteudo(
  sessao: SessaoMestre,
  tipoBruto: unknown,
  idBruto: unknown,
  pedido: PedidoDeReversao,
  ip?: string
): Promise<{ conteudo: ConteudoDocumento; versao: ResumoVersao }> {
  const tipo = tipoValido(tipoBruto);
  exigir(sessao, 'conteudo.publicar');
  const atual = await lerOuFalhar(tipo, idValido(idBruto));
  const alvo = inteiroValido(pedido.versao, 'a versão para voltar');
  const ultimaVersao = inteiroValido(pedido.ultimaVersao, 'a última versão que você viu');
  const motivo = motivoValido(pedido.motivo);
  if (ultimaVersao !== atual.ultimaVersao) throw new ErroMestre(409, ERRO_CONFLITO);
  if (alvo === atual.versaoPublicada) throw new ErroMestre(400, 'Essa versão já é a que está no ar.');
  const antiga = await repositorio.lerVersaoConteudo(atual.chave, alvo);
  if (!antiga) throw new ErroMestre(404, 'Versão não encontrada.');
  // a versão antiga passou no schema da época; se ele mudou, ela precisa passar no de hoje para voltar ao ar
  const dados = dadosValidos(tipo, antiga.dados);
  await conferirReferencias(tipo, dados, true);
  return publicar(sessao, atual, { ultimaVersao }, { dados, hash: hashDe(dados), motivo, origem: 'reversao', revertidaDe: alvo }, 'conteudo.reverter', ip);
}

async function publicar(
  sessao: SessaoMestre,
  atual: ConteudoDocumento,
  condicao: { revisao?: number; ultimaVersao?: number },
  base: Pick<VersaoConteudo, 'dados' | 'hash' | 'motivo' | 'origem' | 'revertidaDe'>,
  acao: string,
  ip?: string
): Promise<{ conteudo: ConteudoDocumento; versao: ResumoVersao }> {
  const resultado = await comRegistro(
    sessao,
    {
      acao,
      alvo: atual.chave,
      antes: retrato(atual),
      depois: { versaoPublicada: atual.ultimaVersao + 1, hashPublicado: base.hash, revertidaDe: base.revertidaDe },
      motivo: base.motivo,
      ip,
    },
    () =>
      repositorio.publicarVersaoConteudo(atual.chave, condicao, {
        ...base,
        publicadoEm: new Date().toISOString(),
        publicadoPor: sessao.uid,
      })
  );
  if (resultado === 'inexistente') throw new ErroMestre(404, `${NOME_DO_TIPO[atual.tipo]} não encontrado.`);
  if (resultado === 'conflito') throw new ErroMestre(409, ERRO_CONFLITO);
  cachePublicado.delete(atual.chave);
  const { dados: _dados, ...versao } = resultado.versao;
  return { conteudo: resultado.conteudo, versao };
}

// ---- leitura no jogo ----

export interface ConteudoPublicado {
  tipo: TipoDeConteudo;
  id: string;
  nome: string;
  versao: number;
  dados: unknown;
}

const cachePublicado = new Map<string, { expiraEm: number; valor: ConteudoPublicado | null }>();

export function limparCacheDoConteudo(): void {
  cachePublicado.clear();
}

/** O que o jogo vê: só a versão publicada (null se não existe ou nunca foi publicado). */
export async function lerConteudoPublicado(tipoBruto: unknown, idBruto: unknown): Promise<ConteudoPublicado | null> {
  if (!ehTipoDeConteudo(tipoBruto) || typeof idBruto !== 'string' || !ID_DE_CONTEUDO.test(idBruto)) return null;
  const chave = chaveDoConteudo(tipoBruto, idBruto);
  const agora = Date.now();
  const emCache = cachePublicado.get(chave);
  if (emCache && emCache.expiraEm > agora) return emCache.valor;

  const doc = await repositorio.lerConteudo(chave);
  let valor: ConteudoPublicado | null = null;
  if (doc && doc.versaoPublicada !== null) {
    const versao = await repositorio.lerVersaoConteudo(chave, doc.versaoPublicada);
    if (versao) valor = { tipo: doc.tipo, id: doc.id, nome: doc.nome, versao: versao.versao, dados: versao.dados };
  }
  cachePublicado.set(chave, { expiraEm: agora + TTL_CACHE_PUBLICADO_MS, valor });
  return valor;
}
