import type { Attributes } from './attributes';
import { MULT_CHAVE, PERFIS, pontosDeReferencia } from './cacada';
import type { SelosDoJogador } from './colecionaveis';
import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { MonsterDefinition } from './monsters';
import type { PresenteDoCorreio } from './correio';

/**
 * Provação de Chefe Mundial (decidida pelo Yuri em 22/10/2026): um chefe por dia, o mesmo para todos os jogadores,
 * a partir do nível 18. Cada um luta sozinho quantas vezes quiser; vale o MAIOR dano do dia. O ranking fecha à
 * meia-noite de Brasília e a recompensa da faixa chega pelo Correio: ouro, Diamantes, selos de busca e Essência de
 * Soberano (a moeda da loja). Faixas iguais às do Chefe de guildas. Os 7 chefes são PROVISÓRIOS (um por dia da
 * semana, a confirmar: o Yuri passa nomes, mecânicas e visual depois); as quantidades e a força são proposta.
 */

export const NIVEL_DO_CHEFE_MUNDIAL = 18;
/** Quantas posições a tela mostra no ranking do dia. */
export const JOGADORES_NO_RANKING_DO_DIA = 10;
/** Dias de lutas guardados no personagem para mandar a recompensa (o mesmo prazo do Correio). */
export const DIAS_GUARDADOS = 30;

export interface ChefeMundial {
  id: string;
  nome: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

/** Um chefe PROVISÓRIO para cada dia da semana (domingo a sábado). */
export const CHEFES_MUNDIAIS: readonly ChefeMundial[] = [
  { id: 'chefe-mundial-1', nome: 'Chefe Mundial I (a confirmar)', categoriaCorporal: 'eterio', elementoAtaque: 'sagrado', tipoDano: 'magico' },
  { id: 'chefe-mundial-2', nome: 'Chefe Mundial II (a confirmar)', categoriaCorporal: 'escamoso', elementoAtaque: 'fogo', tipoDano: 'fisico' },
  { id: 'chefe-mundial-3', nome: 'Chefe Mundial III (a confirmar)', categoriaCorporal: 'cristalino', elementoAtaque: 'gelo', tipoDano: 'magico' },
  { id: 'chefe-mundial-4', nome: 'Chefe Mundial IV (a confirmar)', categoriaCorporal: 'rochoso', elementoAtaque: 'terra', tipoDano: 'fisico' },
  { id: 'chefe-mundial-5', nome: 'Chefe Mundial V (a confirmar)', categoriaCorporal: 'sombrio', elementoAtaque: 'sombrio', tipoDano: 'magico' },
  { id: 'chefe-mundial-6', nome: 'Chefe Mundial VI (a confirmar)', categoriaCorporal: 'feral', elementoAtaque: 'vento', tipoDano: 'fisico' },
  { id: 'chefe-mundial-7', nome: 'Chefe Mundial VII (a confirmar)', categoriaCorporal: 'aberrante', elementoAtaque: 'relampago', tipoDano: 'magico' },
];

/** O dia seguinte (AAAA-MM-DD). */
export const diaSeguinte = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** O chefe do dia (AAAA-MM-DD, de Brasília), pelo dia da semana. */
export function chefeDoDia(dia: string): ChefeMundial {
  return CHEFES_MUNDIAIS[new Date(`${dia}T12:00:00Z`).getUTCDay()];
}

/** Vida "sem fim": a luta mede o dano (até a queda do jogador ou o limite de rodadas). */
export const VIDA_DO_CHEFE_MUNDIAL = 1_000_000_000;

/** O chefe do dia (força proposta, a confirmar): o monstro-chave da Caçada no nível 25, com 1,3× os atributos. */
export function montarChefeMundial(dia: string): MonsterDefinition {
  const chefe = chefeDoDia(dia);
  const p = pontosDeReferencia(25) * 1.3;
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
  const vidaDeUmaLuta = Math.round(p * perfil.hp * MULT_CHAVE.hp);
  return {
    id: chefe.id,
    nome: chefe.nome,
    nivel: 25,
    hp: VIDA_DO_CHEFE_MUNDIAL,
    sobreescudoInicial: Math.floor(vidaDeUmaLuta / 10),
    chefe: true,
    categoriaCorporal: chefe.categoriaCorporal,
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais: {},
    ...(chefe.elementoAtaque ? { elementoAtaque: chefe.elementoAtaque } : {}),
  };
}

export interface FaixaDoChefeMundial {
  de: number;
  ate: number | null;
  nome: string;
  ouro: number;
  diamantes: number;
  selos: SelosDoJogador;
  essenciaDeSoberano: number;
  /** Título que vem junto (o 1º lugar ganha o Campeão do Chefe Mundial). */
  titulo?: string;
}

/** Faixas iguais às do Chefe de guildas (Yuri); as quantidades são proposta, a confirmar. */
export const FAIXAS_DO_CHEFE_MUNDIAL: readonly FaixaDoChefeMundial[] = [
  { de: 1, ate: 1, nome: '1º lugar', ouro: 20000, diamantes: 100, selos: { origem: 10, eternidade: 20 }, essenciaDeSoberano: 100, titulo: 'campeao-do-chefe-mundial' },
  { de: 2, ate: 2, nome: '2º lugar', ouro: 15000, diamantes: 80, selos: { origem: 5, eternidade: 20 }, essenciaDeSoberano: 80 },
  { de: 3, ate: 3, nome: '3º lugar', ouro: 12000, diamantes: 60, selos: { origem: 3, eternidade: 15 }, essenciaDeSoberano: 60 },
  { de: 4, ate: 10, nome: '4º ao 10º', ouro: 8000, diamantes: 40, selos: { eternidade: 10, encantado: 20 }, essenciaDeSoberano: 40 },
  { de: 11, ate: 50, nome: '11º ao 50º', ouro: 5000, diamantes: 25, selos: { eternidade: 5, encantado: 20 }, essenciaDeSoberano: 25 },
  { de: 51, ate: 100, nome: '51º ao 100º', ouro: 3000, diamantes: 15, selos: { encantado: 20 }, essenciaDeSoberano: 15 },
  { de: 101, ate: null, nome: '101º em diante', ouro: 1500, diamantes: 5, selos: { desgastado: 30 }, essenciaDeSoberano: 5 },
];

export const faixaDoChefeMundial = (posicao: number) => FAIXAS_DO_CHEFE_MUNDIAL.find((f) => posicao >= f.de && (f.ate === null || posicao <= f.ate))!;

export const presenteDaFaixa = (f: FaixaDoChefeMundial): PresenteDoCorreio => ({
  ouro: f.ouro,
  diamantes: f.diamantes,
  selos: { ...f.selos },
  essenciaDeSoberano: f.essenciaDeSoberano,
  ...(f.titulo ? { titulos: [f.titulo] } : {}),
});

/** O melhor dano de um jogador num dia: chefeMundial/{dia}/jogadores/{uid}. */
export interface EntradaDoChefeMundial {
  dia: string;
  uid: string;
  nome: string;
  dano: number;
}

export function entradaMundialDoDocumento(bruto: unknown): EntradaDoChefeMundial | null {
  const d = bruto as Record<string, unknown> | null;
  if (!d || typeof d !== 'object' || typeof d.dia !== 'string' || typeof d.uid !== 'string') return null;
  const dano = typeof d.dano === 'number' && Number.isFinite(d.dano) && d.dano >= 0 ? Math.floor(d.dano) : 0;
  return { dia: d.dia, uid: d.uid, nome: typeof d.nome === 'string' ? d.nome : '', dano };
}

/** Os dias em que o personagem lutou e se a recompensa já foi mandada ao Correio. */
export interface ParticipacaoNoChefeMundial {
  dia: string;
  enviada?: boolean;
}

export function participacoesMundiaisDoDocumento(bruto: unknown): ParticipacaoNoChefeMundial[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto.flatMap((p) => {
    const o = p as Record<string, unknown> | null;
    return o && typeof o.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dia) ? [{ dia: o.dia, ...(o.enviada === true ? { enviada: true } : {}) }] : [];
  });
  return lista.length ? lista.slice(-DIAS_GUARDADOS) : undefined;
}
