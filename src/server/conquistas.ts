import { SELOS_DE_BUSCA, type SelosDoJogador } from '@/rules/colecionaveis';
import {
  CONQUISTA_MAP,
  CONQUISTAS,
  degrausBatidos,
  DEGRAUS,
  recompensaDoDegrau,
  somarRecompensas,
  textoDaMeta,
  type CategoriaDeConquista,
  type RecompensaDeConquista,
} from '@/rules/conquistas';
import { comTitulos, TITULO_MAP, type TituloDefinition } from '@/rules/titulos';
import { alterarSaldoEm, carregarPersonagem, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Conquistas e títulos: o estado (progresso de cada conquista e os títulos do jogador), resgatar os degraus batidos
 * e escolher o título do perfil, tudo numa transação.
 */

export class ErroDeConquista extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeConquista';
  }
}

export interface ConquistaNaTela {
  id: string;
  nome: string;
  categoria: CategoriaDeConquista;
  progresso: number;
  /** Degraus já resgatados (0 a 5). */
  resgatados: number;
  /** Degraus batidos e ainda não resgatados. */
  prontos: number;
  /** A meta do próximo degrau a resgatar (ou null se já resgatou os 5). */
  proximaMeta: number | null;
  textoDaMeta: string | null;
  /** A recompensa do próximo degrau a resgatar. */
  recompensa: RecompensaDeConquista | null;
  metas: readonly number[];
  titulo?: string;
}

export interface EstadoDasConquistas {
  conquistas: ConquistaNaTela[];
  prontos: number;
  titulos: TituloDefinition[];
  tituloId: string | null;
}

export function estadoDe(char: CharacterDocument): EstadoDasConquistas {
  const conquistas = CONQUISTAS.map((c): ConquistaNaTela => {
    const progresso = c.progresso(char);
    const resgatados = Math.min(DEGRAUS, char.conquistas?.[c.id] ?? 0);
    const prontos = Math.max(0, degrausBatidos(c, progresso) - resgatados);
    const fim = resgatados >= DEGRAUS;
    return {
      id: c.id,
      nome: c.nome,
      categoria: c.categoria,
      progresso,
      resgatados,
      prontos,
      proximaMeta: fim ? null : c.metas[resgatados],
      textoDaMeta: fim ? null : textoDaMeta(c, resgatados),
      recompensa: fim ? null : recompensaDoDegrau(c, resgatados),
      metas: c.metas,
      ...(c.titulo ? { titulo: TITULO_MAP[c.titulo]?.nome } : {}),
    };
  });
  return {
    conquistas,
    prontos: conquistas.reduce((t, c) => t + c.prontos, 0),
    titulos: (char.titulos ?? []).flatMap((id) => (TITULO_MAP[id] ? [TITULO_MAP[id]] : [])),
    tituloId: char.tituloId && char.titulos?.includes(char.tituloId) ? char.tituloId : null,
  };
}

export async function estadoDasConquistas(uid: string): Promise<EstadoDasConquistas> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  return estadoDe(char);
}

export const ACOES_DAS_CONQUISTAS = ['resgatar', 'resgatarTudo', 'titulo'] as const;
export type AcaoDasConquistas = (typeof ACOES_DAS_CONQUISTAS)[number];

/** O que um resgate entregou, em linhas curtas. */
function textoDaRecompensa(r: ReturnType<typeof somarRecompensas>): string {
  const partes: string[] = [];
  if (r.diamantes) partes.push(`${r.diamantes} Diamantes`);
  const selos = SELOS_DE_BUSCA.reduce((t, s) => t + (r.selos[s] ?? 0), 0);
  if (selos) partes.push(`${selos} ${selos === 1 ? 'selo' : 'selos'} de busca`);
  if (r.avancosDeExpedicao) partes.push(`${r.avancosDeExpedicao} ${r.avancosDeExpedicao === 1 ? 'Avanço' : 'Avanços'} de expedição`);
  for (const t of r.titulos) partes.push(`o título ${TITULO_MAP[t]?.nome ?? t}`);
  return partes.join(', ');
}

export async function agirNasConquistas(uid: string, acao: unknown, pedido: { id?: unknown; titulo?: unknown }): Promise<{ mensagem: string; estado: EstadoDasConquistas }> {
  if (typeof acao !== 'string' || !(ACOES_DAS_CONQUISTAS as readonly string[]).includes(acao)) throw new ErroDeConquista('Ação desconhecida.');
  if (acao !== 'titulo') await exigirSistemaLigado(uid, 'conquistas');
  return repositorio.executarTransacao(`conquistas:${acao}`, async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);

    if (acao === 'titulo') {
      // '' ou null tira o título
      const id = typeof pedido.titulo === 'string' ? pedido.titulo : '';
      if (id && !(eu.titulos ?? []).includes(id)) throw new ErroDeConquista('Você ainda não tem esse título.');
      const salvo = salvarPersonagem(ctx, eu, { tituloId: id || undefined });
      return { mensagem: id ? `Título escolhido: ${TITULO_MAP[id].nome}.` : 'Título retirado do perfil.', estado: estadoDe(salvo) };
    }

    const alvo = acao === 'resgatar' ? (typeof pedido.id === 'string' ? CONQUISTA_MAP[pedido.id] : undefined) : null;
    if (acao === 'resgatar' && !alvo) throw new ErroDeConquista('Conquista não encontrada.');
    const resgatados = { ...(eu.conquistas ?? {}) };
    const recompensas: RecompensaDeConquista[] = [];
    for (const c of alvo ? [alvo] : CONQUISTAS) {
      const ja = resgatados[c.id] ?? 0;
      const batidos = degrausBatidos(c, c.progresso(eu));
      for (let d = ja; d < batidos; d++) recompensas.push(recompensaDoDegrau(c, d));
      if (batidos > ja) resgatados[c.id] = batidos;
    }
    if (!recompensas.length) throw new ErroDeConquista(alvo ? 'Ainda não há degrau batido para resgatar nessa conquista.' : 'Não há conquistas para resgatar.');

    const total = somarRecompensas(recompensas);
    let doc = eu;
    if (total.diamantes) doc = alterarSaldoEm(ctx, doc, 'diamantes', total.diamantes, alvo ? `Conquista: ${alvo.nome}` : 'Conquistas').character;
    const selos: SelosDoJogador = { ...(doc.selosDeBusca ?? {}) };
    for (const s of SELOS_DE_BUSCA) if (total.selos[s]) selos[s] = (selos[s] ?? 0) + total.selos[s]!;
    const salvo = salvarPersonagem(ctx, doc, {
      diamantes: doc.diamantes,
      conquistas: resgatados,
      ...(Object.keys(total.selos).length ? { selosDeBusca: selos } : {}),
      ...(total.avancosDeExpedicao ? { avancosDeExpedicao: (doc.avancosDeExpedicao ?? 0) + total.avancosDeExpedicao } : {}),
      ...(total.titulos.length ? { titulos: comTitulos(doc.titulos, total.titulos) } : {}),
    });
    const degraus = recompensas.length;
    return {
      mensagem: `${degraus === 1 ? '1 degrau resgatado' : `${degraus} degraus resgatados`}: ${textoDaRecompensa(total)}.`,
      estado: estadoDe(salvo),
    };
  });
}
