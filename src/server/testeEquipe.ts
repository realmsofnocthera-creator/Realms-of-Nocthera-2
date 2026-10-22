import { randomBytes } from 'node:crypto';
import { resolverCombateEmGrupo } from '@/game/combat';
import { contarVitorias } from '@/game/contratos';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { xpParaProximoNivel } from '@/game';
import {
  CHEFES_DO_TESTE,
  CONVITES_DA_PARTY,
  CONVITES_DE_PARTY_DO_JOGADOR,
  dificuldadeLiberada,
  DIFICULDADES_DO_TESTE,
  montarChefeDoTeste,
  NIVEL_DO_TESTE_DE_EQUIPE,
  partyVale,
  recompensaDoTeste,
  TAMANHO_MAXIMO_DA_PARTY,
  TAMANHO_MINIMO_DO_TESTE,
  type PartyDocumento,
  type ResultadoDaParty,
} from '@/rules/testeEquipe';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, ganharXp, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { entregarCartas, sorteadorDaSemente, sortearTipoDaRaridade } from '@/server/almas';
import { PESOS_DO_TESTE_DE_EQUIPE, poeiraDoTeste, sortearRaridadePorPesos } from '@/rules/almas';
import { chaveDoNome, repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Party e Teste de Equipe (7.4). A party é aberta a qualquer jogador de nível 25 ou mais (não precisa de guilda): o
 * líder chama alguém pelo nome (até 3 jogadores), cada um marca "Pronto" e o líder escolhe a dificuldade e inicia.
 * Cada party é um documento (partys/{id}) com os membros e os convites. A luta inteira roda no servidor, numa
 * transação que lê e grava a party e os personagens: tentativas, recompensas e o resultado para todos verem.
 */

export class ErroDeParty extends Error {
  constructor(
    mensagem: string,
    readonly status: 400 | 404 | 409 = 400
  ) {
    super(mensagem);
    this.name = 'ErroDeParty';
  }
}

const agora = () => new Date();
const novoIdDeParty = () => `p_${randomBytes(6).toString('hex')}`;
const sem = (lista: readonly string[] | undefined, id: string) => (lista ?? []).filter((x) => x !== id);
const vazioParaUndefined = (lista: string[]) => (lista.length ? lista : undefined);
const SEM_PARTY = { partyId: undefined } as const;

/** A party do jogador no contexto, se ele ainda é membro de uma que vale. */
async function minhaPartyNoContexto(ctx: ContextoTransacao, eu: CharacterDocument): Promise<PartyDocumento | null> {
  const p = eu.partyId ? await ctx.lerParty(eu.partyId) : null;
  return p && partyVale(p, agora()) && p.membros.some((m) => m.uid === eu.uid) ? p : null;
}

export interface DificuldadeNaTela {
  dificuldade: number;
  chefe: string;
  liberada: boolean;
  vencida: boolean;
  tentouHoje: boolean;
}

export interface EstadoDoTeste {
  nivelNecessario: number;
  meuNivel: number;
  minhaParty: (PartyDocumento & { souLider: boolean }) | null;
  /** Convites de party que o jogador recebeu e ainda valem. */
  convites: { partyId: string; de: string }[];
  dificuldades: DificuldadeNaTela[];
}

export async function estadoDoTeste(uid: string): Promise<EstadoDoTeste> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const hoje = diaDeBrasilia(agora());
  const dificuldades = CHEFES_DO_TESTE.map((c) => ({
    dificuldade: c.dificuldade,
    chefe: c.nome,
    liberada: dificuldadeLiberada(c.dificuldade, char.testeEquipeVencidas),
    vencida: (char.testeEquipeVencidas ?? []).includes(c.dificuldade),
    tentouHoje: char.testeEquipeTentativas?.[String(c.dificuldade)] === hoje,
  }));
  const propria = char.partyId ? await repositorio.lerParty(char.partyId) : null;
  const minha = propria && partyVale(propria, agora()) && propria.membros.some((m) => m.uid === uid) ? propria : null;
  const ids = char.convitesDeParty ?? [];
  const partys = minha ? [] : await Promise.all(ids.map((id) => repositorio.lerParty(id)));
  const convites = partys.flatMap((p) => {
    const c = p && partyVale(p, agora()) ? p.convites.find((x) => x.uid === uid) : undefined;
    return p && c ? [{ partyId: p.id, de: c.por }] : [];
  });
  return {
    nivelNecessario: NIVEL_DO_TESTE_DE_EQUIPE,
    meuNivel: char.nivel,
    minhaParty: minha ? { ...minha, souLider: minha.liderUid === uid } : null,
    convites,
    dificuldades,
  };
}

export const ACOES_DO_TESTE = ['criar', 'convidar', 'aceitar', 'recusar', 'sair', 'pronto', 'iniciar'] as const;
export type AcaoDoTeste = (typeof ACOES_DO_TESTE)[number];

export interface PedidoDoTeste {
  partyId?: unknown;
  nome?: unknown;
  pronto?: unknown;
  dificuldade?: unknown;
}

export async function agirNoTeste(uid: string, acao: unknown, pedido: PedidoDoTeste): Promise<{ mensagem: string; resultado?: ResultadoDaParty }> {
  if (typeof acao !== 'string' || !(ACOES_DO_TESTE as readonly string[]).includes(acao)) throw new ErroDeParty('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'testeEquipe');
  const em = agora().toISOString();
  switch (acao as AcaoDoTeste) {
    case 'criar':
      return repositorio.executarTransacao('teste:criarParty', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        if (eu.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeParty(`Você precisa do nível ${NIVEL_DO_TESTE_DE_EQUIPE} para o Teste de Equipe.`);
        if (await minhaPartyNoContexto(ctx, eu)) throw new ErroDeParty('Você já está numa party.', 409);
        const id = novoIdDeParty();
        ctx.gravarParty({ id, liderUid: uid, membros: [{ uid, nome: eu.nome, pronto: false }], convites: [], atualizadaEm: em });
        salvarPersonagem(ctx, eu, { partyId: id });
        return { mensagem: 'Party criada. Chame jogadores pelo nome.' };
      });
    case 'convidar': {
      const nomeAlvo = typeof pedido.nome === 'string' ? pedido.nome.trim() : '';
      if (nomeAlvo.length < 2) throw new ErroDeParty('Digite o nome do jogador que você quer chamar.');
      return repositorio.executarTransacao('teste:convidar', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        const p = await minhaPartyNoContexto(ctx, eu);
        if (!p) throw new ErroDeParty('Você não está numa party.', 404);
        if (p.liderUid !== uid) throw new ErroDeParty('Só o líder chama jogadores.');
        const alvoUid = await ctx.lerDonoDoNome(chaveDoNome(nomeAlvo));
        const alvo = alvoUid ? await ctx.lerPersonagem(alvoUid) : null;
        if (!alvo) throw new ErroDeParty(`Nenhum personagem com o nome "${nomeAlvo}".`, 404);
        if (alvo.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeParty(`${alvo.nome} ainda não tem o nível ${NIVEL_DO_TESTE_DE_EQUIPE}.`);
        if (p.membros.some((m) => m.uid === alvo.uid)) throw new ErroDeParty(`${alvo.nome} já está na party.`, 409);
        if (p.convites.some((c) => c.uid === alvo.uid)) throw new ErroDeParty(`${alvo.nome} já foi chamado(a).`, 409);
        if (p.membros.length + p.convites.length >= TAMANHO_MAXIMO_DA_PARTY + CONVITES_DA_PARTY - 1) throw new ErroDeParty('Convites demais esperando resposta.', 409);
        if (p.membros.length >= TAMANHO_MAXIMO_DA_PARTY) throw new ErroDeParty(`A party está cheia (${TAMANHO_MAXIMO_DA_PARTY}).`, 409);
        if ((alvo.convitesDeParty ?? []).length >= CONVITES_DE_PARTY_DO_JOGADOR) throw new ErroDeParty(`${alvo.nome} tem convites demais esperando resposta.`, 409);
        ctx.gravarParty({ ...p, convites: [...p.convites, { uid: alvo.uid, nome: alvo.nome, por: eu.nome }], atualizadaEm: em });
        ctx.gravarPersonagem({ ...alvo, convitesDeParty: [...(alvo.convitesDeParty ?? []), p.id] });
        return { mensagem: `${alvo.nome} foi chamado(a) para a party.` };
      });
    }
    case 'aceitar':
      return repositorio.executarTransacao('teste:aceitar', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        if (eu.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeParty(`Você precisa do nível ${NIVEL_DO_TESTE_DE_EQUIPE} para o Teste de Equipe.`);
        if (await minhaPartyNoContexto(ctx, eu)) throw new ErroDeParty('Você já está numa party. Saia dela antes.', 409);
        const p = typeof pedido.partyId === 'string' ? await ctx.lerParty(pedido.partyId) : null;
        if (!p || !partyVale(p, agora()) || !p.convites.some((c) => c.uid === uid)) throw new ErroDeParty('Esse convite não vale mais.', 404);
        if (p.membros.length >= TAMANHO_MAXIMO_DA_PARTY) throw new ErroDeParty(`A party está cheia (${TAMANHO_MAXIMO_DA_PARTY}).`, 409);
        ctx.gravarParty({ ...p, membros: [...p.membros, { uid, nome: eu.nome, pronto: false }], convites: p.convites.filter((c) => c.uid !== uid), atualizadaEm: em });
        salvarPersonagem(ctx, eu, { partyId: p.id, convitesDeParty: undefined });
        return { mensagem: 'Você entrou na party.' };
      });
    case 'recusar':
      return repositorio.executarTransacao('teste:recusar', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        const id = typeof pedido.partyId === 'string' ? pedido.partyId : '';
        const p = id ? await ctx.lerParty(id) : null;
        if (p) ctx.gravarParty({ ...p, convites: p.convites.filter((c) => c.uid !== uid) });
        salvarPersonagem(ctx, eu, { convitesDeParty: vazioParaUndefined(sem(eu.convitesDeParty, id)) });
        return { mensagem: 'Convite recusado.' };
      });
    case 'sair':
      return repositorio.executarTransacao('teste:sair', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        const p = await minhaPartyNoContexto(ctx, eu);
        if (!p) {
          salvarPersonagem(ctx, eu, SEM_PARTY);
          throw new ErroDeParty('Você não está numa party.', 404);
        }
        const membros = p.membros.filter((m) => m.uid !== uid);
        if (!membros.length) ctx.apagarParty(p.id);
        else ctx.gravarParty({ ...p, membros, liderUid: p.liderUid === uid ? membros[0].uid : p.liderUid, atualizadaEm: em });
        salvarPersonagem(ctx, eu, SEM_PARTY);
        return { mensagem: 'Você saiu da party.' };
      });
    case 'pronto':
      return repositorio.executarTransacao('teste:pronto', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        const p = await minhaPartyNoContexto(ctx, eu);
        if (!p) throw new ErroDeParty('Você não está numa party.', 404);
        const pronto = pedido.pronto === true;
        ctx.gravarParty({ ...p, membros: p.membros.map((m) => (m.uid === uid ? { ...m, pronto } : m)), atualizadaEm: em });
        return { mensagem: pronto ? 'Você está pronto.' : 'Você não está mais pronto.' };
      });
    case 'iniciar':
      return iniciarTeste(uid, pedido.dificuldade, gerarSementeCombate());
  }
}

/** O líder inicia: confere todos, roda a luta em grupo e aplica tentativas e recompensas de todos na mesma transação. */
export async function iniciarTeste(uid: string, dificuldadePedida: unknown, semente: number): Promise<{ mensagem: string; resultado: ResultadoDaParty }> {
  const dificuldade = typeof dificuldadePedida === 'number' && Number.isInteger(dificuldadePedida) ? dificuldadePedida : 0;
  if (dificuldade < 1 || dificuldade > DIFICULDADES_DO_TESTE) throw new ErroDeParty('Dificuldade inválida.');
  await exigirSistemaLigado(uid, 'testeEquipe');
  const hoje = diaDeBrasilia(agora());
  return repositorio.executarTransacao('teste:iniciar', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const p = await minhaPartyNoContexto(ctx, eu);
    if (!p) throw new ErroDeParty('Você não está numa party.', 404);
    if (p.liderUid !== uid) throw new ErroDeParty('Só o líder da party inicia.');
    if (p.membros.length < TAMANHO_MINIMO_DO_TESTE) throw new ErroDeParty(`O Teste de Equipe pede pelo menos ${TAMANHO_MINIMO_DO_TESTE} jogadores.`);
    if (!p.membros.every((m) => m.pronto)) throw new ErroDeParty('Todos precisam marcar "Pronto".', 409);
    const docs = await Promise.all(p.membros.map((m) => carregarPersonagem(ctx, m.uid)));
    for (const d of docs) {
      if (d.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeParty(`${d.nome} ainda não tem o nível ${NIVEL_DO_TESTE_DE_EQUIPE}.`);
      if (!dificuldadeLiberada(dificuldade, d.testeEquipeVencidas)) throw new ErroDeParty(`${d.nome} ainda não venceu a dificuldade ${dificuldade - 1}.`);
      if (d.testeEquipeTentativas?.[String(dificuldade)] === hoje) throw new ErroDeParty(`${d.nome} já tentou a dificuldade ${dificuldade} hoje.`, 409);
    }
    const chefe = montarChefeDoTeste(dificuldade, docs.length);
    const r = resolverCombateEmGrupo(docs.map(combatenteDoPersonagem), chefe, semente);
    const venceu = r.vencedor === 'grupo';
    for (const [indice, d] of docs.entries()) {
      let doc = d;
      const tentativas = { ...(doc.testeEquipeTentativas ?? {}), [String(dificuldade)]: hoje };
      if (!venceu) {
        salvarPersonagem(ctx, doc, { testeEquipeTentativas: tentativas });
        continue;
      }
      const primeira = !(doc.testeEquipeVencidas ?? []).includes(dificuldade);
      const rec = recompensaDoTeste(dificuldade, primeira);
      const motivo = `Teste de Equipe (dificuldade ${dificuldade})`;
      doc = alterarSaldoEm(ctx, doc, 'ouro', rec.ouro, motivo).character;
      doc = alterarSaldoEm(ctx, doc, 'diamantes', rec.diamantes, motivo).character;
      const xp = ganharXp(doc, Math.floor(xpParaProximoNivel(doc.nivel) * rec.fracaoDeXp));
      const contratos = contarVitorias(doc.contratos, [chefe.id], hoje);
      // Alma (7.8): poeira de alma e 1 carta por vitória, mais rara nas dificuldades altas
      const sorteio = sorteadorDaSemente(semente + indice * 104729);
      const carta = entregarCartas(doc, [sortearTipoDaRaridade(sortearRaridadePorPesos(PESOS_DO_TESTE_DE_EQUIPE[dificuldade - 1], sorteio), sorteio)], semente + indice);
      salvarPersonagem(ctx, doc, {
        ...carta.patch,
        poeiraDeAlma: (doc.poeiraDeAlma ?? 0) + poeiraDoTeste(dificuldade, primeira),
        ouro: doc.ouro,
        diamantes: doc.diamantes,
        xpAtual: xp.xpAtual,
        nivel: xp.nivel,
        pontosDisponiveis: xp.pontosDisponiveis,
        testeEquipeTentativas: tentativas,
        testeEquipeVencidas: primeira ? [...(doc.testeEquipeVencidas ?? []), dificuldade].sort((a, b) => a - b) : doc.testeEquipeVencidas ?? [],
        ...(contratos ? { contratos } : {}),
      });
    }
    const resultado: ResultadoDaParty = { dificuldade, venceu, rodadas: r.rodadas, em: new Date().toISOString(), aliados: r.aliados };
    ctx.gravarParty({ ...p, membros: p.membros.map((m) => ({ ...m, pronto: false })), atualizadaEm: resultado.em, ultimoResultado: resultado });
    const rec = recompensaDoTeste(dificuldade, false);
    return {
      mensagem: venceu
        ? `Vitória! ${chefe.nome} caiu em ${r.rodadas} rodadas. Cada um recebeu ${rec.ouro} de ouro, XP, diamantes, poeira de alma e uma carta (mais ouro, diamantes e poeira na primeira vitória).`
        : `Derrota diante de ${chefe.nome}. A tentativa de hoje desta dificuldade foi usada.`,
      resultado,
    };
  });
}
