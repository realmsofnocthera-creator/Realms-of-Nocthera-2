import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { ID_DE_REFERENCIA, validarCondicao, type CondicaoDeAcesso } from '@/rules/condicao';

/**
 * Objetos interativos do mapa (3.5.6.3), parte do formato do mapa. Sete tipos, cada um com um gatilho e uma ação
 * fixos (decididos com o Yuri em 16/10/2026):
 *  - início: onde o jogador nasce no mapa (no máximo um);
 *  - NPC: ao interagir, mostra a fala;
 *  - placa: ao interagir, mostra o texto;
 *  - baú: ao interagir, dá um item;
 *  - porta: ao pisar (ou interagir), leva a outro mapa, numa posição;
 *  - área de monstros: ao entrar na área, inicia uma luta contra o monstro;
 *  - ativador de cena: ao entrar na área, toca uma cena (cutscene ou diálogo, 5.5-4), uma vez por personagem ou sempre.
 * O NPC também pode apontar para uma cena: ao interagir, toca o diálogo em vez de mostrar a fala.
 * Os textos são do Yuri; o painel só guarda o que ele escrever.
 */
export const TIPOS_DE_OBJETO = ['inicio', 'npc', 'placa', 'bau', 'porta', 'cacada', 'cena'] as const;
export type TipoDeObjeto = (typeof TIPOS_DE_OBJETO)[number];

export const NOME_DO_OBJETO: Readonly<Record<TipoDeObjeto, string>> = {
  inicio: 'Início do jogador',
  npc: 'NPC',
  placa: 'Placa de texto',
  bau: 'Baú',
  porta: 'Porta ou passagem',
  cacada: 'Área de monstros',
  cena: 'Ativador de cena',
};

export const LETRA_DO_OBJETO: Readonly<Record<TipoDeObjeto, string>> = { inicio: 'I', npc: 'N', placa: 'P', bau: 'B', porta: 'D', cacada: 'M', cena: 'C' };

export type Gatilho = 'pisar' | 'interagir' | 'entrar';
export const NOME_DO_GATILHO: Readonly<Record<Gatilho, string>> = { pisar: 'Pisar no tile', interagir: 'Interagir', entrar: 'Entrar na área' };

/** Gatilhos aceitos por tipo; o primeiro é o padrão. */
export const GATILHOS_DO_OBJETO: Readonly<Record<TipoDeObjeto, readonly Gatilho[]>> = {
  inicio: ['pisar'],
  npc: ['interagir'],
  placa: ['interagir'],
  bau: ['interagir'],
  porta: ['pisar', 'interagir'],
  cacada: ['entrar'],
  cena: ['entrar'],
};

export const NOME_DA_ACAO: Readonly<Record<TipoDeObjeto, string>> = {
  inicio: 'Posição inicial do jogador',
  npc: 'Mostra a fala',
  placa: 'Mostra o texto',
  bau: 'Dá o item',
  porta: 'Vai para outro mapa',
  cacada: 'Inicia a luta',
  cena: 'Toca a cena',
};

export const MAXIMO_DE_OBJETOS = 200;
export const ID_DE_OBJETO = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const ID_DO_MAPA_DESTINO = /^[a-z0-9][a-z0-9-]{1,47}$/;
export const TEXTO_MAXIMO_DO_OBJETO = 600;
export const NOME_MAXIMO_DO_NPC = 60;
export const QUANTIDADE_MAXIMA_NO_BAU = 999;
export const LADO_MAXIMO_DA_AREA = 32;

export interface ObjetoDoMapa {
  id: string;
  tipo: TipoDeObjeto;
  x: number;
  y: number;
  gatilho: Gatilho;
  /** Área de monstros e ativador de cena: tamanho da área, em tiles, a partir de (x, y). */
  largura?: number;
  altura?: number;
  /** Só NPC. */
  nome?: string;
  /** NPC (fala) e placa (texto). Pode ficar vazio no rascunho. */
  texto?: string;
  /** Só área de monstros: o monstro que aparece. */
  monstroId?: string;
  /** Ativador de cena (obrigatório) e NPC (opcional, diálogo no lugar da fala): a cena publicada que toca. */
  cenaId?: string;
  /** Só ativador de cena: toca uma única vez por personagem (padrão) ou toda vez que entrar na área. */
  unica?: boolean;
  /** NPC e ativador de cena: a missão que começa (se o jogador cumpre os requisitos dela e ainda não a começou). */
  missaoId?: string;
  /** Porta, baú, ativador de cena e área de monstros: o que o jogador precisa cumprir para o objeto valer. */
  condicao?: CondicaoDeAcesso;
  /** Só baú. */
  item?: { id: string; qtd: number };
  /** Só porta. */
  destino?: { mapa: string; x: number; y: number };
}

const CAMPOS_DO_TIPO: Readonly<Record<TipoDeObjeto, readonly string[]>> = {
  inicio: [],
  npc: ['nome', 'texto', 'cenaId', 'missaoId'],
  placa: ['texto'],
  bau: ['item', 'condicao'],
  porta: ['destino', 'condicao'],
  cacada: ['largura', 'altura', 'monstroId', 'condicao'],
  cena: ['largura', 'altura', 'cenaId', 'unica', 'missaoId', 'condicao'],
};
/** Tipos que ocupam uma área (largura × altura) em vez de um tile, e por isso não bloqueiam nem disputam tile. */
export const TIPOS_COM_AREA: readonly TipoDeObjeto[] = ['cacada', 'cena'];
export const ehObjetoDeArea = (tipo: TipoDeObjeto) => TIPOS_COM_AREA.includes(tipo);
export const ID_DA_CENA = /^[a-z0-9][a-z0-9-]{1,47}$/;
const CAMPOS_BASE = ['id', 'tipo', 'x', 'y', 'gatilho'] as const;

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function inteiro(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

export function ehTipoDeObjeto(v: unknown): v is TipoDeObjeto {
  return typeof v === 'string' && (TIPOS_DE_OBJETO as readonly string[]).includes(v);
}

/** Um objeto novo do tipo escolhido, com valores iniciais válidos. */
export function objetoNovo(tipo: TipoDeObjeto, id: string, x: number, y: number): ObjetoDoMapa {
  const base: ObjetoDoMapa = { id, tipo, x, y, gatilho: GATILHOS_DO_OBJETO[tipo][0] };
  switch (tipo) {
    case 'npc':
      return { ...base, nome: 'NPC', texto: '' };
    case 'placa':
      return { ...base, texto: '' };
    case 'bau':
      return { ...base, item: { id: 'pelo-de-rato', qtd: 1 } };
    case 'porta':
      return { ...base, destino: { mapa: '', x: 0, y: 0 } };
    case 'cacada':
      return { ...base, largura: 3, altura: 3, monstroId: 'rato-da-floresta' };
    case 'cena':
      return { ...base, largura: 1, altura: 1, cenaId: '', unica: true };
    default:
      return base;
  }
}

/** O próximo id livre do tipo (npc-1, npc-2...). */
export function proximoIdDeObjeto(objetos: readonly ObjetoDoMapa[], tipo: TipoDeObjeto): string {
  const usados = new Set(objetos.map((o) => o.id));
  for (let n = 1; ; n++) {
    const id = `${tipo}-${n}`;
    if (!usados.has(id)) return id;
  }
}

/** O tile (x, y) está dentro da área do objeto? Os de um tile só ocupam a própria posição. */
export function objetoCobre(o: ObjetoDoMapa, x: number, y: number): boolean {
  const l = ehObjetoDeArea(o.tipo) ? (o.largura ?? 1) : 1;
  const a = ehObjetoDeArea(o.tipo) ? (o.altura ?? 1) : 1;
  return x >= o.x && y >= o.y && x < o.x + l && y < o.y + a;
}

/**
 * Confere a lista de objetos de um mapa de largura × altura e devolve a cópia limpa (só os campos do tipo).
 * Os problemas vão para `erros`.
 */
export function validarObjetos(bruto: unknown, largura: number, altura: number, erros: string[]): ObjetoDoMapa[] {
  if (bruto === undefined) return [];
  if (!Array.isArray(bruto)) {
    erros.push('Objetos: precisam ser uma lista.');
    return [];
  }
  if (bruto.length > MAXIMO_DE_OBJETOS) erros.push(`Objetos: no máximo ${MAXIMO_DE_OBJETOS} por mapa.`);
  const limpos: ObjetoDoMapa[] = [];
  const ids = new Set<string>();
  const ocupados = new Map<string, string>();
  let inicios = 0;

  bruto.forEach((o, i) => {
    const rotulo = `Objeto ${i + 1}`;
    if (!ehObjeto(o)) return void erros.push(`${rotulo}: precisa ser um objeto.`);
    if (!ehTipoDeObjeto(o.tipo)) return void erros.push(`${rotulo}: tipo inválido.`);
    const tipo = o.tipo;
    const nome = `${NOME_DO_OBJETO[tipo]} (${typeof o.id === 'string' ? o.id : i + 1})`;
    const extras = Object.keys(o).filter((k) => !(CAMPOS_BASE as readonly string[]).includes(k) && !CAMPOS_DO_TIPO[tipo].includes(k));
    if (extras.length) erros.push(`${nome}: campos que este tipo não tem: ${extras.join(', ')}.`);

    if (typeof o.id !== 'string' || !ID_DE_OBJETO.test(o.id)) erros.push(`${nome}: identificador inválido (letras minúsculas, números e hífen, até 32).`);
    else if (ids.has(o.id)) erros.push(`${nome}: identificador repetido.`);
    else ids.add(o.id);

    if (!inteiro(o.x, 0, largura - 1) || !inteiro(o.y, 0, altura - 1)) {
      erros.push(`${nome}: a posição precisa estar dentro do mapa.`);
      return;
    }
    if (!(GATILHOS_DO_OBJETO[tipo] as readonly unknown[]).includes(o.gatilho)) {
      erros.push(`${nome}: gatilho inválido (este tipo aceita: ${GATILHOS_DO_OBJETO[tipo].map((g) => NOME_DO_GATILHO[g]).join(', ')}).`);
      return;
    }

    const limpo: ObjetoDoMapa = { id: o.id as string, tipo, x: o.x, y: o.y, gatilho: o.gatilho as Gatilho };
    if (tipo === 'inicio') inicios++;

    if (tipo === 'npc') {
      const n = typeof o.nome === 'string' ? o.nome.trim() : '';
      if (n.length < 1 || n.length > NOME_MAXIMO_DO_NPC) erros.push(`${nome}: o nome vai de 1 a ${NOME_MAXIMO_DO_NPC} caracteres.`);
      limpo.nome = n;
    }
    if ((tipo === 'npc' || tipo === 'cena') && o.missaoId !== undefined && o.missaoId !== '') {
      if (typeof o.missaoId !== 'string' || !ID_DE_REFERENCIA.test(o.missaoId)) erros.push(`${nome}: escolha a missão que começa aqui (ou deixe sem).`);
      else limpo.missaoId = o.missaoId;
    }
    if (o.condicao !== undefined) {
      const c = validarCondicao(o.condicao, nome, erros);
      if (c) limpo.condicao = c;
    }
    if (tipo === 'npc' && o.cenaId !== undefined && o.cenaId !== '') {
      if (typeof o.cenaId !== 'string' || !ID_DA_CENA.test(o.cenaId)) erros.push(`${nome}: escolha a cena do diálogo (ou deixe sem).`);
      else limpo.cenaId = o.cenaId;
    }
    if (tipo === 'npc' || tipo === 'placa') {
      const t = typeof o.texto === 'string' ? o.texto.trim() : null;
      if (t === null || t.length > TEXTO_MAXIMO_DO_OBJETO) erros.push(`${nome}: o texto vai até ${TEXTO_MAXIMO_DO_OBJETO} caracteres.`);
      limpo.texto = t ?? '';
    }
    if (tipo === 'bau') {
      const item = o.item;
      if (!ehObjeto(item) || typeof item.id !== 'string' || !(item.id in MATERIAIS_MAP || item.id in MATERIAIS_MUNDO_MAP)) {
        erros.push(`${nome}: item desconhecido.`);
      } else if (!inteiro(item.qtd, 1, QUANTIDADE_MAXIMA_NO_BAU)) {
        erros.push(`${nome}: a quantidade vai de 1 a ${QUANTIDADE_MAXIMA_NO_BAU}.`);
      } else {
        limpo.item = { id: item.id, qtd: item.qtd };
      }
    }
    if (tipo === 'porta') {
      const d = o.destino;
      if (!ehObjeto(d) || typeof d.mapa !== 'string' || !ID_DO_MAPA_DESTINO.test(d.mapa) || !inteiro(d.x, 0, 255) || !inteiro(d.y, 0, 255)) {
        erros.push(`${nome}: escolha o mapa de destino e a posição (de 0 a 255).`);
      } else {
        limpo.destino = { mapa: d.mapa, x: d.x, y: d.y };
      }
    }
    if (tipo === 'cacada' || tipo === 'cena') {
      if (!inteiro(o.largura, 1, LADO_MAXIMO_DA_AREA) || !inteiro(o.altura, 1, LADO_MAXIMO_DA_AREA)) {
        erros.push(`${nome}: a área vai de 1 a ${LADO_MAXIMO_DA_AREA} tiles por lado.`);
      } else if (o.x + o.largura > largura || o.y + o.altura > altura) {
        erros.push(`${nome}: a área passa da borda do mapa.`);
      } else {
        limpo.largura = o.largura;
        limpo.altura = o.altura;
      }
      if (tipo === 'cacada') {
        if (typeof o.monstroId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,47}$/.test(o.monstroId)) erros.push(`${nome}: escolha o monstro.`);
        else limpo.monstroId = o.monstroId;
      } else {
        if (typeof o.cenaId !== 'string' || !ID_DA_CENA.test(o.cenaId)) erros.push(`${nome}: escolha a cena.`);
        else limpo.cenaId = o.cenaId;
        if (o.unica !== undefined && typeof o.unica !== 'boolean') erros.push(`${nome}: "uma vez só" precisa ser sim ou não.`);
        else limpo.unica = o.unica !== false;
      }
    }

    if (!ehObjetoDeArea(tipo)) {
      const chave = `${o.x},${o.y}`;
      const outro = ocupados.get(chave);
      if (outro) erros.push(`${nome}: o tile (${o.x}, ${o.y}) já tem ${outro}.`);
      else ocupados.set(chave, nome);
    }
    limpos.push(limpo);
  });

  if (inicios > 1) erros.push('Só pode haver um início do jogador por mapa.');
  return limpos;
}
