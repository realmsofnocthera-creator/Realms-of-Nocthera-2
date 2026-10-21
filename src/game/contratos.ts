import { DADOS_CACADA_MAP, ESTRELAS_CACADA, MONSTROS_CACADA_DADOS, type MonstroCacadaDados } from '@/rules/cacada';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { estrelasLiberadas } from '@/game/cacada';

/**
 * Quadro de contratos da guilda (7.3, decidido pelo Yuri em 21/10/2026): contratos gerados sozinhos, 3 por membro
 * por dia (dia de Brasília), a partir dos monstros e materiais da Caçada que o jogador já alcança. Os abates contam
 * em qualquer luta contra monstros (Caçada, Batalha Sangrenta, Campanha, Arena, Torre e Guerreiro).
 * Valores de recompensa: proposta, a confirmar.
 */

export type TipoDeContrato = 'derrotar' | 'entregar' | 'vencer';

export interface RecompensaDeContrato {
  ouro: number;
  xpGuilda: number;
  materiais: { id: string; qtd: number }[];
}

export interface Contrato {
  id: string;
  tipo: TipoDeContrato;
  /** derrotar: id do monstro; entregar: id do material; vencer: vazio (qualquer monstro). */
  alvo: string;
  nomeAlvo: string;
  quantidade: number;
  /** derrotar e vencer: abates contados; entregar: não usa (confere a mochila na entrega). */
  progresso: number;
  recompensa: RecompensaDeContrato;
  entregue: boolean;
}

export interface ContratosDoDia {
  dia: string;
  lista: Contrato[];
}

export const CONTRATOS_POR_DIA = 3;
/** XP de guilda de cada um dos 3 contratos do dia: somam 100, o teto por membro por dia. */
export const XP_DE_GUILDA_DOS_CONTRATOS: readonly number[] = [33, 33, 34];

/** Gerador pseudoaleatório a partir de um texto (mesmo jogador e mesmo dia = mesmos contratos). */
function sorteador(semente: string): () => number {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) {
    h = Math.imul(h ^ semente.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const escolher = <T,>(r: () => number, lista: readonly T[]): T => lista[Math.floor(r() * lista.length)];
const nivelDaEstrela = (estrela: number) => ESTRELAS_CACADA.find((e) => e.estrela === estrela)?.nivelMinimo ?? 1;

/** Monstros comuns (sem os monstros-chave) das duas estrelas mais altas que o jogador já alcança. */
function monstrosAlcancaveis(nivel: number, chavesVencidas: readonly number[] | undefined): MonstroCacadaDados[] {
  const estrelas = estrelasLiberadas(nivel, chavesVencidas).sort((a, b) => b - a).slice(0, 2);
  return MONSTROS_CACADA_DADOS.filter((m) => estrelas.includes(m.estrela) && !m.chave);
}

const comumDe = (m: MonstroCacadaDados) => m.drops.find((id) => MATERIAIS_MAP[id]?.raridade === 'comum');
const raroDe = (m: MonstroCacadaDados) => m.drops.find((id) => MATERIAIS_MAP[id]?.raridade === 'raro');

/**
 * Os 3 contratos do dia: um de derrotar um monstro, um de entregar um material e um de vencer lutas. Sem estrela da
 * Caçada liberada (nível 1), os três são de vencer lutas.
 */
export function gerarContratos(uid: string, dia: string, nivel: number, chavesVencidas: readonly number[] | undefined): ContratosDoDia {
  const r = sorteador(`${uid}|${dia}`);
  const alcancaveis = monstrosAlcancaveis(nivel, chavesVencidas);
  const comMaterial = alcancaveis.filter((m) => comumDe(m));
  const lista: Contrato[] = [];
  const tipos: TipoDeContrato[] = alcancaveis.length ? ['derrotar', 'entregar', 'vencer'] : ['vencer', 'vencer', 'vencer'];
  tipos.forEach((tipo, i) => {
    const id = `c${i + 1}`;
    const xpGuilda = XP_DE_GUILDA_DOS_CONTRATOS[i];
    if (tipo === 'derrotar') {
      const m = escolher(r, alcancaveis);
      const quantidade = entre(r, 3, 5);
      const raro = raroDe(m);
      lista.push({
        id, tipo, alvo: m.id, nomeAlvo: m.nome, quantidade, progresso: 0, entregue: false,
        recompensa: { ouro: quantidade * 12 * nivelDaEstrela(m.estrela), xpGuilda, materiais: raro ? [{ id: raro, qtd: 1 }] : [] },
      });
    } else if (tipo === 'entregar' && comMaterial.length) {
      const m = escolher(r, comMaterial);
      const material = comumDe(m)!;
      const quantidade = entre(r, 5, 8);
      lista.push({
        id, tipo, alvo: material, nomeAlvo: MATERIAIS_MAP[material].nome, quantidade, progresso: 0, entregue: false,
        recompensa: { ouro: quantidade * 10 * nivelDaEstrela(m.estrela), xpGuilda, materiais: [] },
      });
    } else {
      const quantidade = entre(r, 5, 8);
      lista.push({
        id, tipo: 'vencer', alvo: '', nomeAlvo: 'qualquer monstro', quantidade, progresso: 0, entregue: false,
        recompensa: { ouro: quantidade * 5 * Math.max(1, nivel), xpGuilda, materiais: [] },
      });
    }
  });
  return { dia, lista };
}

/**
 * Conta as vitórias de uma luta nos contratos do dia (devolve null se nada mudou ou se os contratos são de outro dia).
 * Uma subespécie conta para o contrato do monstro original.
 */
export function contarVitorias(contratos: ContratosDoDia | undefined, monstroIds: readonly string[], dia: string): ContratosDoDia | null {
  if (!contratos || contratos.dia !== dia || monstroIds.length === 0) return null;
  let mudou = false;
  const lista = contratos.lista.map((c) => {
    if (c.entregue || c.progresso >= c.quantidade) return c;
    const conta = c.tipo === 'vencer' ? monstroIds.length : c.tipo === 'derrotar' ? monstroIds.filter((id) => id === c.alvo || DADOS_CACADA_MAP[id]?.varianteDe === c.alvo).length : 0;
    if (!conta) return c;
    mudou = true;
    return { ...c, progresso: Math.min(c.quantidade, c.progresso + conta) };
  });
  return mudou ? { dia, lista } : null;
}

/** Quanto o jogador já tem para o contrato (para a tela e para a entrega). */
export function progressoDoContrato(c: Contrato, inventario: Readonly<Record<string, number>> | undefined): number {
  return c.tipo === 'entregar' ? Math.min(c.quantidade, inventario?.[c.alvo] ?? 0) : c.progresso;
}

export const contratoPronto = (c: Contrato, inventario: Readonly<Record<string, number>> | undefined) => !c.entregue && progressoDoContrato(c, inventario) >= c.quantidade;

/** Lê os contratos do banco com tolerância (o que estiver fora do formato descarta o dia inteiro). */
export function contratosDoDocumento(bruto: unknown): ContratosDoDia | undefined {
  if (typeof bruto !== 'object' || bruto === null) return undefined;
  const d = bruto as Record<string, unknown>;
  if (typeof d.dia !== 'string' || !Array.isArray(d.lista)) return undefined;
  const lista: Contrato[] = [];
  for (const item of d.lista as unknown[]) {
    if (typeof item !== 'object' || item === null) return undefined;
    const c = item as Record<string, unknown>;
    const rec = c.recompensa as Record<string, unknown> | undefined;
    if (
      typeof c.id !== 'string' || !['derrotar', 'entregar', 'vencer'].includes(c.tipo as string) || typeof c.alvo !== 'string' ||
      typeof c.quantidade !== 'number' || typeof c.progresso !== 'number' || !rec || typeof rec.ouro !== 'number' || typeof rec.xpGuilda !== 'number'
    )
      return undefined;
    const materiais = Array.isArray(rec.materiais)
      ? (rec.materiais as unknown[]).flatMap((m) => {
          const o = m as Record<string, unknown> | null;
          return o && typeof o.id === 'string' && typeof o.qtd === 'number' ? [{ id: o.id, qtd: o.qtd }] : [];
        })
      : [];
    lista.push({ id: c.id, tipo: c.tipo as TipoDeContrato, alvo: c.alvo, nomeAlvo: typeof c.nomeAlvo === 'string' ? c.nomeAlvo : c.alvo, quantidade: c.quantidade, progresso: c.progresso, entregue: c.entregue === true, recompensa: { ouro: rec.ouro, xpGuilda: rec.xpGuilda, materiais } });
  }
  return { dia: d.dia, lista };
}
