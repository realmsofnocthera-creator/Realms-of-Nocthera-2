import type { MapaDados } from '@/rules/mapa';
import {
  ehObjetoDeArea,
  GATILHOS_DO_OBJETO,
  MAXIMO_DE_OBJETOS,
  NOME_DO_OBJETO,
  objetoCobre,
  objetoNovo,
  proximoIdDeObjeto,
  validarObjetos,
  type ObjetoDoMapa,
  type TipoDeObjeto,
} from '@/rules/objetosDoMapa';
import type { LoteDeObjetos, Ponto } from '@/lib/editorMapa';

/**
 * Edição dos objetos interativos do mapa (3.5.6.3), sem React. Cada função muda `mapa.objetos` e devolve o lote para
 * o histórico (desfazer e refazer), ou o motivo de não ter feito nada.
 */
export type ResultadoDeObjeto = { ok: true; lote: LoteDeObjetos; objeto?: ObjetoDoMapa } | { ok: false; erro: string };

function lote(mapa: MapaDados, antes: ObjetoDoMapa[]): LoteDeObjetos {
  return { objetos: { antes, depois: structuredClone(mapa.objetos) } };
}

/** O objeto que aparece no ponto: os de um tile têm prioridade sobre uma área de monstros que passe por ali. */
export function objetoNoPonto(mapa: Pick<MapaDados, 'objetos'>, p: Ponto): ObjetoDoMapa | undefined {
  const aqui = mapa.objetos.filter((o) => objetoCobre(o, p.x, p.y));
  return aqui.find((o) => !ehObjetoDeArea(o.tipo)) ?? aqui[0];
}

function tileOcupadoPorOutro(mapa: Pick<MapaDados, 'objetos'>, p: Ponto, ignorarId?: string): ObjetoDoMapa | undefined {
  return mapa.objetos.find((o) => !ehObjetoDeArea(o.tipo) && o.id !== ignorarId && o.x === p.x && o.y === p.y);
}

export function colocarObjeto(mapa: MapaDados, tipo: TipoDeObjeto, p: Ponto): ResultadoDeObjeto {
  if (p.x < 0 || p.y < 0 || p.x >= mapa.largura || p.y >= mapa.altura) return { ok: false, erro: 'Fora do mapa.' };
  if (mapa.objetos.length >= MAXIMO_DE_OBJETOS) return { ok: false, erro: `O mapa já tem ${MAXIMO_DE_OBJETOS} objetos.` };
  if (tipo === 'inicio' && mapa.objetos.some((o) => o.tipo === 'inicio')) return { ok: false, erro: 'Já existe um início do jogador. Selecione-o e mova.' };
  const ocupado = ehObjetoDeArea(tipo) ? undefined : tileOcupadoPorOutro(mapa, p);
  if (ocupado) return { ok: false, erro: `Esse tile já tem ${NOME_DO_OBJETO[ocupado.tipo].toLowerCase()}.` };
  const antes = structuredClone(mapa.objetos);
  const objeto = objetoNovo(tipo, proximoIdDeObjeto(mapa.objetos, tipo), p.x, p.y);
  if (ehObjetoDeArea(tipo)) {
    objeto.largura = Math.min(objeto.largura ?? 1, mapa.largura - p.x);
    objeto.altura = Math.min(objeto.altura ?? 1, mapa.altura - p.y);
  }
  mapa.objetos.push(objeto);
  return { ok: true, lote: lote(mapa, antes), objeto };
}

export function moverObjeto(mapa: MapaDados, id: string, p: Ponto): ResultadoDeObjeto {
  const o = mapa.objetos.find((x) => x.id === id);
  if (!o) return { ok: false, erro: 'Objeto não encontrado.' };
  if (p.x < 0 || p.y < 0 || p.x >= mapa.largura || p.y >= mapa.altura) return { ok: false, erro: 'Fora do mapa.' };
  if (ehObjetoDeArea(o.tipo) && (p.x + (o.largura ?? 1) > mapa.largura || p.y + (o.altura ?? 1) > mapa.altura)) return { ok: false, erro: 'A área passaria da borda do mapa.' };
  const ocupado = ehObjetoDeArea(o.tipo) ? undefined : tileOcupadoPorOutro(mapa, p, id);
  if (ocupado) return { ok: false, erro: `Esse tile já tem ${NOME_DO_OBJETO[ocupado.tipo].toLowerCase()}.` };
  if (o.x === p.x && o.y === p.y) return { ok: false, erro: 'O objeto já está aí.' };
  const antes = structuredClone(mapa.objetos);
  o.x = p.x;
  o.y = p.y;
  return { ok: true, lote: lote(mapa, antes), objeto: o };
}

export function removerObjeto(mapa: MapaDados, id: string): ResultadoDeObjeto {
  if (!mapa.objetos.some((x) => x.id === id)) return { ok: false, erro: 'Objeto não encontrado.' };
  const antes = structuredClone(mapa.objetos);
  mapa.objetos = mapa.objetos.filter((x) => x.id !== id);
  return { ok: true, lote: lote(mapa, antes) };
}

/** Troca campos de um objeto (nome, texto, destino...). O que ficar inválido aparece em `errosDosObjetos`. */
export function atualizarObjeto(mapa: MapaDados, id: string, mudar: (o: ObjetoDoMapa) => void): ResultadoDeObjeto {
  const o = mapa.objetos.find((x) => x.id === id);
  if (!o) return { ok: false, erro: 'Objeto não encontrado.' };
  const antes = structuredClone(mapa.objetos);
  mudar(o);
  if (!(GATILHOS_DO_OBJETO[o.tipo] as readonly string[]).includes(o.gatilho)) o.gatilho = GATILHOS_DO_OBJETO[o.tipo][0];
  return { ok: true, lote: lote(mapa, antes), objeto: o };
}

/** Os problemas dos objetos agora (a tela mostra antes de salvar; o servidor confere de novo). */
export function errosDosObjetos(mapa: Pick<MapaDados, 'objetos' | 'largura' | 'altura'>): string[] {
  const erros: string[] = [];
  validarObjetos(mapa.objetos, mapa.largura, mapa.altura, erros);
  return erros;
}
