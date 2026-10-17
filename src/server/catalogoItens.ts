import { validarArma, type ArmaDados } from '@/rules/armaConteudo';
import { validarArmadura, type ArmaduraDados } from '@/rules/armaduraConteudo';
import { validarEmblema, type EmblemaDados } from '@/rules/emblemaConteudo';
import { aplicarArmadurasPublicadas, aplicarArmasPublicadas, aplicarEmblemasPublicados } from '@/rules/catalogoAoVivo';
import { TTL_CACHE_PUBLICADO_MS } from '@/server/conteudo';
import { registrarLog } from '@/server/log';
import { repositorio } from '@/server/persistencia';
import type { TipoDeConteudo } from '@/rules/conteudo';

/**
 * Itens do banco no servidor (3.5.2.1): lê o que está publicado e aplica por cima do catálogo do código
 * (ver catalogoAoVivo). A leitura é refeita no máximo a cada TTL_CACHE_PUBLICADO_MS. Se o banco falhar, vale o
 * que já estava aplicado; nunca derruba uma operação do jogo.
 */
let validoAte = 0;
let emAndamento: Promise<void> | null = null;

export interface ItemPublicado<T> {
  id: string;
  nome: string;
  versao: number;
  dados: T;
}

/** Todo o publicado de um tipo (só os itens que têm versão no ar). */
export async function lerPublicadosDoTipo(tipo: TipoDeConteudo): Promise<ItemPublicado<unknown>[]> {
  const resumos = await repositorio.listarConteudos(tipo);
  const noAr = resumos.filter((r) => r.versaoPublicada !== null);
  const lidos = await Promise.all(
    noAr.map(async (r) => {
      const v = await repositorio.lerVersaoConteudo(r.chave, r.versaoPublicada as number);
      return v ? { id: r.id, nome: r.nome, versao: v.versao, dados: v.dados } : null;
    })
  );
  return lidos.filter((x): x is ItemPublicado<unknown> => x !== null);
}

const cacheDaLista = new Map<string, { expiraEm: number; itens: ItemPublicado<unknown>[] }>();

/** A lista publicada de um tipo, com o mesmo cache curto do restante (para a rota que o jogo consulta). */
export async function lerPublicadosComCache(tipo: TipoDeConteudo): Promise<ItemPublicado<unknown>[]> {
  const emCache = cacheDaLista.get(tipo);
  if (emCache && emCache.expiraEm > Date.now()) return emCache.itens;
  const itens = await lerPublicadosDoTipo(tipo);
  cacheDaLista.set(tipo, { expiraEm: Date.now() + TTL_CACHE_PUBLICADO_MS, itens });
  return itens;
}

async function atualizar(): Promise<void> {
  try {
    const [brutasArmas, brutasPecas, brutosEmblemas] = await Promise.all([
      lerPublicadosDoTipo('arma'),
      lerPublicadosDoTipo('armadura'),
      lerPublicadosDoTipo('emblema'),
    ]);
    // dado corrompido vale o código
    const armas = new Map<string, ArmaDados>();
    for (const item of brutasArmas) {
      const v = validarArma(item.dados);
      if (v.ok) armas.set(item.id, v.dados);
    }
    const pecas = new Map<string, ArmaduraDados>();
    for (const item of brutasPecas) {
      const v = validarArmadura(item.dados);
      if (v.ok) pecas.set(item.id, v.dados);
    }
    const emblemas = new Map<string, EmblemaDados>();
    for (const item of brutosEmblemas) {
      const v = validarEmblema(item.dados);
      if (v.ok) emblemas.set(item.id, v.dados);
    }
    aplicarArmasPublicadas(armas);
    aplicarArmadurasPublicadas(pecas);
    aplicarEmblemasPublicados(emblemas);
    validoAte = Date.now() + TTL_CACHE_PUBLICADO_MS;
  } catch (error) {
    registrarLog('WARNING', 'catalogo.atualizacao_falhou', { mensagem: error instanceof Error ? error.message : 'desconhecido' });
    validoAte = Date.now() + 5_000; // tenta de novo logo, sem martelar o banco
  }
}

/** Garante o catálogo de itens atualizado (cache curto). Chamada no início das operações do jogo. */
export async function sincronizarCatalogoDeItens(): Promise<void> {
  if (Date.now() < validoAte) return;
  emAndamento ??= atualizar().finally(() => {
    emAndamento = null;
  });
  await emAndamento;
}

/** Só para testes: esquece o cache e volta o catálogo ao do código. */
export function limparCatalogoDeItens(): void {
  validoAte = 0;
  cacheDaLista.clear();
  aplicarArmasPublicadas(new Map());
  aplicarArmadurasPublicadas(new Map());
  aplicarEmblemasPublicados(new Map());
}
