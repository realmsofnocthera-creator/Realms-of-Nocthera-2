import type { Attributes } from './attributes';
import { CATEGORIAS_DE_CARTA, NOME_DA_CATEGORIA, type CategoriaDeCarta } from './almas';
import { MULT_CHAVE, PERFIS, pontosDeReferencia } from './cacada';
import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { EmblemaRaridade } from './emblemas';
import type { MonsterDefinition } from './monsters';

/**
 * Party e Provação do Teste de Equipe (7.4, decididas pelo Yuri em 21 e 22/10/2026).
 * - A party é aberta a qualquer jogador de nível 25 ou mais (não precisa de guilda): o líder chama alguém pelo nome,
 *   até 3 jogadores, cada um marca "Pronto" e o líder escolhe o teste e a dificuldade e inicia. O grupo luta junto
 *   contra 1 chefe (o motor aceita vários aliados de um lado).
 * - 3 testes: da Alma, do Corpo e da Mente. Cada um dá cartas só da própria categoria.
 * - 6 dificuldades: Muito fácil, Fácil, Médio, Difícil, Muito difícil e Inferno. Para desafiar uma, é preciso ter
 *   concluído a anterior naquele teste.
 * - Entrar custa, para CADA membro: 1 chave da provação (Muito fácil a Muito difícil) ou 1 selo do abismo (Inferno).
 *   São 3 chaves grátis por dia (não acumulam) e até mais 3 compradas por dia, a 50 diamantes cada (as compradas
 *   ficam guardadas). O selo vem, com chance pequena, de vitórias no Muito difícil.
 * - Na vitória: cacos de alma (mais a cada dificuldade) e 3 cartas aleatórias, com as raridades do Yuri por dificuldade; no Inferno,
 *   também poeira de alma; na primeira vez que conclui cada dificuldade de cada teste, diamantes.
 * Chefes PROVISÓRIOS (a confirmar). Os pesos das raridades, as quantidades, a chance do selo e a força são PROPOSTA.
 */

export const TAMANHO_MAXIMO_DA_PARTY = 3;
export const TAMANHO_MINIMO_DO_TESTE = 2;
/** O nível do personagem para o Teste de Equipe (o mesmo da vitrine das Provações). */
export const NIVEL_DO_TESTE_DE_EQUIPE = 25;
/** Party parada há mais que isso é desfeita sozinha (alguém abriu e foi embora). */
export const VALIDADE_DA_PARTY_MS = 2 * 60 * 60_000;

export type CategoriaDoTeste = CategoriaDeCarta;
export const CATEGORIAS_DO_TESTE: readonly CategoriaDoTeste[] = CATEGORIAS_DE_CARTA;
export const NOME_DO_TESTE: Readonly<Record<CategoriaDoTeste, string>> = { alma: 'Teste da Alma', corpo: 'Teste do Corpo', mente: 'Teste da Mente' };
export const ehCategoriaDoTeste = (v: unknown): v is CategoriaDoTeste => typeof v === 'string' && (CATEGORIAS_DO_TESTE as readonly string[]).includes(v);

export const DIFICULDADES_DO_TESTE = 6;
/** Cartas aleatórias por vitória, cada uma sorteada à parte (decidido pelo Yuri em 22/10/2026). */
export const CARTAS_POR_VITORIA = 3;
export const NOMES_DAS_DIFICULDADES = ['Muito fácil', 'Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Inferno'] as const;
/** A dificuldade que pede o selo do abismo em vez da chave. */
export const DIFICULDADE_DO_SELO = 6;
/** A dificuldade em que o selo pode cair. */
export const DIFICULDADE_QUE_DA_SELO = 5;
/** Chance de ganhar 1 selo do abismo numa vitória no Muito difícil (proposta, a confirmar). */
export const CHANCE_DO_SELO = 0.1;

export interface DificuldadeDoTeste {
  dificuldade: number;
  nome: string;
  /** Pesos [comum, raro, muito raro, épico, lendário, mítico] de cada carta da vitória: as raridades são as do Yuri; os pesos, proposta. */
  pesos: readonly number[];
  cacos: number;
  poeira: number;
  /** Diamantes na primeira vez que conclui a dificuldade naquele teste. */
  diamantesPrimeiraVez: number;
}

export const DIFICULDADES: readonly DificuldadeDoTeste[] = [
  { dificuldade: 1, nome: 'Muito fácil', pesos: [100, 0, 0, 0, 0, 0], cacos: 10, poeira: 0, diamantesPrimeiraVez: 10 },
  { dificuldade: 2, nome: 'Fácil', pesos: [70, 30, 0, 0, 0, 0], cacos: 20, poeira: 0, diamantesPrimeiraVez: 20 },
  { dificuldade: 3, nome: 'Médio', pesos: [50, 35, 15, 0, 0, 0], cacos: 35, poeira: 0, diamantesPrimeiraVez: 30 },
  { dificuldade: 4, nome: 'Difícil', pesos: [35, 35, 22, 8, 0, 0], cacos: 55, poeira: 0, diamantesPrimeiraVez: 50 },
  { dificuldade: 5, nome: 'Muito difícil', pesos: [0, 40, 35, 20, 5, 0], cacos: 80, poeira: 0, diamantesPrimeiraVez: 80 },
  { dificuldade: 6, nome: 'Inferno', pesos: [0, 0, 40, 35, 20, 5], cacos: 120, poeira: 30, diamantesPrimeiraVez: 150 },
];

export const dificuldadeDoTeste = (d: number): DificuldadeDoTeste => DIFICULDADES[Math.min(DIFICULDADES_DO_TESTE, Math.max(1, Math.floor(d))) - 1]!;

/** As raridades que podem sair na dificuldade e a chance (%) de cada carta sair nelas (para a tela). */
export const raridadesDaDificuldade = (d: number): { raridade: EmblemaRaridade; chance: number }[] => {
  const ordem: EmblemaRaridade[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'];
  const pesos = dificuldadeDoTeste(d).pesos;
  const total = pesos.reduce((s, p) => s + p, 0);
  return ordem.flatMap((raridade, i) => (pesos[i] > 0 ? [{ raridade, chance: Math.round((pesos[i] / total) * 1000) / 10 }] : []));
};

/** Chaves da provação. */
export const CHAVES_GRATIS_POR_DIA = 3;
export const CHAVES_COMPRAVEIS_POR_DIA = 3;
export const PRECO_DA_CHAVE_EM_DIAMANTES = 50;

/** O estado das chaves do personagem (as grátis do dia e as compradas guardadas). */
export interface ChavesDaProvacao {
  /** Dia (Brasília) a que `gratisUsadas` e `compradasHoje` se referem. */
  dia: string;
  gratisUsadas: number;
  compradasHoje: number;
  /** Compradas e ainda não usadas (não somem na virada do dia). */
  guardadas: number;
}

export function chavesDoDia(c: ChavesDaProvacao | undefined, hoje: string): ChavesDaProvacao {
  if (!c) return { dia: hoje, gratisUsadas: 0, compradasHoje: 0, guardadas: 0 };
  return c.dia === hoje ? c : { dia: hoje, gratisUsadas: 0, compradasHoje: 0, guardadas: c.guardadas };
}

/** `extras`: chaves grátis a mais no dia (VIP). */
export const chavesGratisRestantes = (c: ChavesDaProvacao, extras = 0) => Math.max(0, CHAVES_GRATIS_POR_DIA + extras - c.gratisUsadas);
export const chavesDisponiveis = (c: ChavesDaProvacao, extras = 0) => chavesGratisRestantes(c, extras) + c.guardadas;
export const comprasRestantesHoje = (c: ChavesDaProvacao) => Math.max(0, CHAVES_COMPRAVEIS_POR_DIA - c.compradasHoje);

/** Gasta 1 chave: as grátis do dia primeiro, depois as compradas. null se não há chave. */
export function gastarChave(c: ChavesDaProvacao, extras = 0): ChavesDaProvacao | null {
  if (chavesGratisRestantes(c, extras) > 0) return { ...c, gratisUsadas: c.gratisUsadas + 1 };
  if (c.guardadas > 0) return { ...c, guardadas: c.guardadas - 1 };
  return null;
}

export function chavesDoDocumento(bruto: unknown): ChavesDaProvacao | undefined {
  const o = bruto as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || typeof o.dia !== 'string') return undefined;
  const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);
  return { dia: o.dia, gratisUsadas: n(o.gratisUsadas), compradasHoje: n(o.compradasHoje), guardadas: n(o.guardadas) };
}

/** A chave de progresso de um teste: "alma:3" = concluiu a dificuldade 3 do Teste da Alma. */
export const chaveDeConclusao = (categoria: CategoriaDoTeste, dificuldade: number) => `${categoria}:${dificuldade}`;

/** A dificuldade abre para quem concluiu a anterior NAQUELE teste (a 1 está sempre aberta). */
export const dificuldadeLiberada = (categoria: CategoriaDoTeste, dificuldade: number, concluidas: readonly string[] | undefined) =>
  dificuldade === 1 || (concluidas ?? []).includes(chaveDeConclusao(categoria, dificuldade - 1));

export interface ChefeDoTeste {
  categoria: CategoriaDoTeste;
  id: string;
  nome: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

/** Os 3 chefes PROVISÓRIOS, um por teste (a confirmar: o Yuri passa nomes, mecânicas e visual depois). */
export const CHEFES_DO_TESTE: Readonly<Record<CategoriaDoTeste, ChefeDoTeste>> = {
  alma: { categoria: 'alma', id: 'teste-alma', nome: `Guardião da ${NOME_DA_CATEGORIA.alma} (a confirmar)`, categoriaCorporal: 'eterio', elementoAtaque: 'sombrio', tipoDano: 'magico' },
  corpo: { categoria: 'corpo', id: 'teste-corpo', nome: `Guardião do ${NOME_DA_CATEGORIA.corpo} (a confirmar)`, categoriaCorporal: 'blindadoPesado', elementoAtaque: 'terra', tipoDano: 'fisico' },
  mente: { categoria: 'mente', id: 'teste-mente', nome: `Guardião da ${NOME_DA_CATEGORIA.mente} (a confirmar)`, categoriaCorporal: 'cristalino', elementoAtaque: 'relampago', tipoDano: 'magico' },
};

/** Multiplicador de força por dificuldade (proposta, a confirmar): Muito fácil a Inferno. */
const MULT_DA_DIFICULDADE = [0.8, 1.1, 1.5, 2, 2.7, 3.6];

/**
 * Força (proposta, a confirmar): o monstro-chave da Caçada no nível 25 + (dificuldade − 1), com o multiplicador da
 * dificuldade; vida 1,5× a do monstro-chave e multiplicada pelo tamanho da party (o chefe golpeia todos a cada rodada).
 */
export function montarChefeDoTeste(categoria: CategoriaDoTeste, dificuldade: number, tamanhoDaParty: number): MonsterDefinition {
  const chefe = CHEFES_DO_TESTE[categoria];
  const d = dificuldadeDoTeste(dificuldade).dificuldade;
  const ref = 25 + (d - 1);
  const p = pontosDeReferencia(Math.min(30, ref)) * MULT_DA_DIFICULDADE[d - 1];
  const perfil = PERFIS.normal;
  const dano = Math.max(1, Math.round(p * perfil.forca * MULT_CHAVE.forca));
  const atributos: Attributes = {
    vigor: Math.round(p * 0.2),
    sorte: 0,
    forca: chefe.tipoDano === 'fisico' ? dano : 1,
    vitalidade: Math.round(p * perfil.vitalidade),
    arcano: 0,
    inteligencia: chefe.tipoDano === 'magico' ? dano : 0,
    agilidade: Math.max(1, Math.round(p * perfil.agilidade)),
  };
  const vidaDeUm = Math.round(p * perfil.hp * MULT_CHAVE.hp * 1.5);
  return {
    id: chefe.id,
    nome: chefe.nome,
    nivel: Math.min(30, ref),
    hp: vidaDeUm * Math.max(1, tamanhoDaParty),
    sobreescudoInicial: Math.floor(vidaDeUm / 10),
    chefe: true,
    categoriaCorporal: chefe.categoriaCorporal,
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais: {},
    enfurecido: true,
    ...(chefe.elementoAtaque ? { elementoAtaque: chefe.elementoAtaque } : {}),
  };
}

export interface MembroDaParty {
  uid: string;
  nome: string;
  pronto: boolean;
}

export interface ConviteDaParty {
  uid: string;
  nome: string;
  /** Quem chamou (nome do personagem). */
  por: string;
}

export interface ResultadoDaParty {
  categoria: CategoriaDoTeste;
  dificuldade: number;
  venceu: boolean;
  rodadas: number;
  em: string;
  aliados: { nome: string; dano: number; caiuNaRodada: number | null }[];
}

/** Convites que uma party pode ter esperando resposta ao mesmo tempo. */
export const CONVITES_DA_PARTY = 5;
/** Convites de party que um jogador pode ter esperando resposta. */
export const CONVITES_DE_PARTY_DO_JOGADOR = 5;

/** Uma party (partys/{id}). */
export interface PartyDocumento {
  id: string;
  liderUid: string;
  membros: MembroDaParty[];
  convites: ConviteDaParty[];
  /** A última mexida (entrar, pronto, luta): party parada há mais de 2 h some sozinha. */
  atualizadaEm: string;
  ultimoResultado?: ResultadoDaParty;
}

export const partyVale = (p: PartyDocumento, agora: Date) => agora.getTime() - Date.parse(p.atualizadaEm || '1970-01-01') < VALIDADE_DA_PARTY_MS;

/** Lê a party do banco com tolerância; sem líder entre os membros ela não vale. */
export function partyDoDocumento(id: string, bruto: unknown): PartyDocumento | null {
  const o = bruto as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || typeof o.liderUid !== 'string' || !Array.isArray(o.membros)) return null;
  const membros = (o.membros as unknown[]).flatMap((m) => {
    const mm = m as Record<string, unknown> | null;
    return mm && typeof mm.uid === 'string' && typeof mm.nome === 'string' ? [{ uid: mm.uid, nome: mm.nome, pronto: mm.pronto === true }] : [];
  });
  if (!membros.some((m) => m.uid === o.liderUid)) return null;
  const convites = (Array.isArray(o.convites) ? (o.convites as unknown[]) : []).flatMap((c) => {
    const cc = c as Record<string, unknown> | null;
    return cc && typeof cc.uid === 'string' && typeof cc.nome === 'string' ? [{ uid: cc.uid, nome: cc.nome, por: typeof cc.por === 'string' ? cc.por : '' }] : [];
  });
  const u = o.ultimoResultado as Record<string, unknown> | undefined;
  const ultimoResultado =
    u && typeof u.dificuldade === 'number' && Array.isArray(u.aliados)
      ? {
          categoria: ehCategoriaDoTeste(u.categoria) ? u.categoria : ('alma' as const),
          dificuldade: u.dificuldade,
          venceu: u.venceu === true,
          rodadas: typeof u.rodadas === 'number' ? u.rodadas : 0,
          em: typeof u.em === 'string' ? u.em : '',
          aliados: (u.aliados as unknown[]).flatMap((a) => {
            const aa = a as Record<string, unknown> | null;
            return aa && typeof aa.nome === 'string' ? [{ nome: aa.nome, dano: typeof aa.dano === 'number' ? aa.dano : 0, caiuNaRodada: typeof aa.caiuNaRodada === 'number' ? aa.caiuNaRodada : null }] : [];
          }),
        }
      : undefined;
  return { id, liderUid: o.liderUid, membros: membros.slice(0, TAMANHO_MAXIMO_DA_PARTY), convites: convites.slice(0, CONVITES_DA_PARTY), atualizadaEm: typeof o.atualizadaEm === 'string' ? o.atualizadaEm : '', ...(ultimoResultado ? { ultimoResultado } : {}) };
}
