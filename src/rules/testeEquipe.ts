import type { Attributes } from './attributes';
import { MULT_CHAVE, PERFIS, pontosDeReferencia } from './cacada';
import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { MonsterDefinition } from './monsters';

/**
 * Party e Provação do Teste de Equipe (7.4, decididas pelo Yuri): a party é exclusiva da guilda (até 3 membros da
 * mesma guilda), cada um marca "Pronto" e o líder inicia. O grupo luta junto contra 1 chefe (o motor aceita vários
 * aliados de um lado). Dificuldades 1 a 10 com 1 chefe cada, 1 tentativa por dia por dificuldade para cada membro.
 * Chefes PROVISÓRIOS (a confirmar); recompensas, força e regras de liberação são PROPOSTA, a confirmar.
 */

export const TAMANHO_MAXIMO_DA_PARTY = 3;
export const TAMANHO_MINIMO_DO_TESTE = 2;
/** O nível do personagem para o Teste de Equipe (o mesmo da vitrine das Provações). */
export const NIVEL_DO_TESTE_DE_EQUIPE = 25;
export const DIFICULDADES_DO_TESTE = 10;
/** Party parada há mais que isso é desfeita sozinha (alguém abriu e foi embora). */
export const VALIDADE_DA_PARTY_MS = 2 * 60 * 60_000;

export interface ChefeDoTeste {
  dificuldade: number;
  id: string;
  nome: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

const NUMERAIS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const CORPOS: CategoriaCorporal[] = ['feral', 'rochoso', 'eterio', 'escamoso', 'cristalino', 'blindadoPesado', 'amorfo', 'quitinoso', 'blindagemMedia', 'organicoDesprotegido'];
const ELEMENTOS: (Elemento | undefined)[] = [undefined, 'terra', 'sombrio', 'fogo', 'gelo', undefined, 'relampago', 'vento', 'sagrado', 'sombrio'];

/** Os 10 chefes PROVISÓRIOS (a confirmar: o Yuri passa nomes, mecânicas e visual depois). */
export const CHEFES_DO_TESTE: readonly ChefeDoTeste[] = NUMERAIS.map((n, i) => ({
  dificuldade: i + 1,
  id: `teste-equipe-${i + 1}`,
  nome: `Chefe do Teste de Equipe ${n} (a confirmar)`,
  categoriaCorporal: CORPOS[i],
  ...(ELEMENTOS[i] ? { elementoAtaque: ELEMENTOS[i] } : {}),
  tipoDano: i % 2 === 0 ? 'fisico' : 'magico',
}));

/**
 * Força (proposta, a confirmar): o monstro-chave da Caçada no nível 25 + 2 × (dificuldade − 1) (com +15% por
 * dificuldade acima do nível 30), vida 1,5× a do monstro-chave e multiplicada pelo tamanho da party (o chefe golpeia todos a cada rodada).
 */
export function montarChefeDoTeste(dificuldade: number, tamanhoDaParty: number): MonsterDefinition {
  const chefe = CHEFES_DO_TESTE[Math.min(DIFICULDADES_DO_TESTE, Math.max(1, dificuldade)) - 1];
  const ref = 25 + 2 * (chefe.dificuldade - 1);
  const p = pontosDeReferencia(Math.min(30, ref)) * (1 + 0.15 * Math.max(0, ref - 30));
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
  const hp = vidaDeUm * Math.max(1, tamanhoDaParty);
  return {
    id: chefe.id,
    nome: chefe.nome,
    nivel: Math.min(30, ref),
    hp,
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

/** Recompensa de cada membro na vitória (proposta, a confirmar); a primeira vitória da dificuldade dá diamantes a mais. */
export function recompensaDoTeste(dificuldade: number, primeiraVitoria: boolean) {
  return {
    ouro: 1500 * dificuldade,
    /** Fração do XP do próximo nível do jogador. */
    fracaoDeXp: 0.08 + 0.01 * dificuldade,
    diamantes: (primeiraVitoria ? 10 : 2) * dificuldade,
  };
}

export interface MembroDaParty {
  uid: string;
  nome: string;
  pronto: boolean;
}

export interface ResultadoDaParty {
  dificuldade: number;
  venceu: boolean;
  rodadas: number;
  em: string;
  aliados: { nome: string; dano: number; caiuNaRodada: number | null }[];
}

/** Uma party, guardada dentro do documento da guilda. */
export interface PartyDaGuilda {
  id: string;
  liderUid: string;
  membros: MembroDaParty[];
  /** A última mexida (entrar, pronto, luta): party parada há mais de 2 h some sozinha. */
  atualizadaEm: string;
  ultimoResultado?: ResultadoDaParty;
}

export function partysDoDocumento(bruto: unknown): PartyDaGuilda[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((x) => {
    const o = x as Record<string, unknown> | null;
    if (!o || typeof o.id !== 'string' || typeof o.liderUid !== 'string' || !Array.isArray(o.membros)) return [];
    const membros = (o.membros as unknown[]).flatMap((m) => {
      const mm = m as Record<string, unknown> | null;
      return mm && typeof mm.uid === 'string' && typeof mm.nome === 'string' ? [{ uid: mm.uid, nome: mm.nome, pronto: mm.pronto === true }] : [];
    });
    if (!membros.some((m) => m.uid === o.liderUid)) return [];
    const u = o.ultimoResultado as Record<string, unknown> | undefined;
    const ultimoResultado =
      u && typeof u.dificuldade === 'number' && Array.isArray(u.aliados)
        ? {
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
    return [{ id: o.id, liderUid: o.liderUid, membros: membros.slice(0, TAMANHO_MAXIMO_DA_PARTY), atualizadaEm: typeof o.atualizadaEm === 'string' ? o.atualizadaEm : '', ...(ultimoResultado ? { ultimoResultado } : {}) }];
  });
}

/** A dificuldade abre para quem venceu a anterior (a 1 está sempre aberta). */
export const dificuldadeLiberada = (dificuldade: number, vencidas: readonly number[] | undefined) => dificuldade === 1 || (vencidas ?? []).includes(dificuldade - 1);
