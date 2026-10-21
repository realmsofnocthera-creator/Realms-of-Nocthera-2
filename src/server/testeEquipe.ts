import { randomBytes } from 'node:crypto';
import { resolverCombateEmGrupo } from '@/game/combat';
import { contarVitorias } from '@/game/contratos';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { xpParaProximoNivel } from '@/game';
import type { GuildaDocumento } from '@/rules/guilda';
import {
  CHEFES_DO_TESTE,
  dificuldadeLiberada,
  DIFICULDADES_DO_TESTE,
  montarChefeDoTeste,
  NIVEL_DO_TESTE_DE_EQUIPE,
  recompensaDoTeste,
  TAMANHO_MAXIMO_DA_PARTY,
  TAMANHO_MINIMO_DO_TESTE,
  VALIDADE_DA_PARTY_MS,
  type PartyDaGuilda,
  type ResultadoDaParty,
} from '@/rules/testeEquipe';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, ganharXp, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { ErroDeGuilda, minhaGuildaNoContexto } from '@/server/guildas';
import { repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Party e Teste de Equipe (7.4). As partys ficam dentro do documento da guilda (só membros da mesma guilda, até 3).
 * Cada membro marca "Pronto"; o líder escolhe a dificuldade e inicia. A luta inteira roda no servidor, numa
 * transação que lê e grava a guilda e os personagens da party: tentativas, recompensas e o resultado para todos verem.
 */

const agora = () => new Date();
const novoIdDeParty = () => `p_${randomBytes(6).toString('hex')}`;

/** As partys que ainda valem (paradas há mais de 2 h somem). */
function partysValidas(g: GuildaDocumento, momento = agora()): PartyDaGuilda[] {
  return (g.partys ?? []).filter((p) => momento.getTime() - Date.parse(p.atualizadaEm || '1970-01-01') < VALIDADE_DA_PARTY_MS);
}

const partyDe = (partys: readonly PartyDaGuilda[], uid: string) => partys.find((p) => p.membros.some((m) => m.uid === uid));

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
  naGuilda: boolean;
  minhaParty: (PartyDaGuilda & { souLider: boolean }) | null;
  /** Partys da guilda com vaga (para entrar). */
  partysAbertas: { id: string; lider: string; membros: string[] }[];
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
  const g = char.guildaId ? await repositorio.lerGuilda(char.guildaId) : null;
  const naGuilda = !!g?.membros.some((m) => m.uid === uid);
  const partys = g && naGuilda ? partysValidas(g) : [];
  const minha = partyDe(partys, uid);
  return {
    nivelNecessario: NIVEL_DO_TESTE_DE_EQUIPE,
    meuNivel: char.nivel,
    naGuilda,
    minhaParty: minha ? { ...minha, souLider: minha.liderUid === uid } : null,
    partysAbertas: minha ? [] : partys.filter((p) => p.membros.length < TAMANHO_MAXIMO_DA_PARTY).map((p) => ({ id: p.id, lider: p.membros.find((m) => m.uid === p.liderUid)?.nome ?? '', membros: p.membros.map((m) => m.nome) })),
    dificuldades,
  };
}

export const ACOES_DO_TESTE = ['criar', 'entrar', 'sair', 'pronto', 'iniciar'] as const;
export type AcaoDoTeste = (typeof ACOES_DO_TESTE)[number];

function exigirNivel(c: CharacterDocument) {
  if (c.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeGuilda(`O Teste de Equipe pede o nível ${NIVEL_DO_TESTE_DE_EQUIPE}.`);
}

async function comGuilda<T>(ctx: ContextoTransacao, uid: string, fn: (eu: CharacterDocument, g: GuildaDocumento, partys: PartyDaGuilda[]) => Promise<T>): Promise<T> {
  const eu = await carregarPersonagem(ctx, uid);
  const { guilda } = await minhaGuildaNoContexto(ctx, eu);
  return fn(eu, guilda, partysValidas(guilda));
}

export async function agirNoTeste(uid: string, acao: unknown, pedido: { partyId?: unknown; pronto?: unknown; dificuldade?: unknown }): Promise<{ mensagem: string; resultado?: ResultadoDaParty }> {
  if (typeof acao !== 'string' || !(ACOES_DO_TESTE as readonly string[]).includes(acao)) throw new ErroDeGuilda('Ação desconhecida.');
  await exigirSistemaLigado(uid, 'testeEquipe');
  const em = agora().toISOString();
  switch (acao as AcaoDoTeste) {
    case 'criar':
      return repositorio.executarTransacao('teste:criarParty', (ctx) =>
        comGuilda(ctx, uid, async (eu, g, partys) => {
          exigirNivel(eu);
          if (partyDe(partys, uid)) throw new ErroDeGuilda('Você já está numa party.', 409);
          ctx.gravarGuilda({ ...g, partys: [...partys, { id: novoIdDeParty(), liderUid: uid, membros: [{ uid, nome: eu.nome, pronto: false }], atualizadaEm: em }] });
          return { mensagem: 'Party criada. Chame membros da guilda para entrar.' };
        })
      );
    case 'entrar':
      return repositorio.executarTransacao('teste:entrarParty', (ctx) =>
        comGuilda(ctx, uid, async (eu, g, partys) => {
          exigirNivel(eu);
          if (partyDe(partys, uid)) throw new ErroDeGuilda('Você já está numa party.', 409);
          const p = partys.find((x) => x.id === pedido.partyId);
          if (!p) throw new ErroDeGuilda('Essa party não existe mais.', 404);
          if (p.membros.length >= TAMANHO_MAXIMO_DA_PARTY) throw new ErroDeGuilda(`A party está cheia (${TAMANHO_MAXIMO_DA_PARTY}).`, 409);
          ctx.gravarGuilda({ ...g, partys: partys.map((x) => (x.id === p.id ? { ...x, membros: [...x.membros, { uid, nome: eu.nome, pronto: false }], atualizadaEm: em } : x)) });
          return { mensagem: 'Você entrou na party.' };
        })
      );
    case 'sair':
      return repositorio.executarTransacao('teste:sairParty', (ctx) =>
        comGuilda(ctx, uid, async (_eu, g, partys) => {
          if (!partyDe(partys, uid)) throw new ErroDeGuilda('Você não está numa party.', 404);
          const semMim = partys.flatMap((p) => {
            if (!p.membros.some((m) => m.uid === uid)) return [p];
            const membros = p.membros.filter((m) => m.uid !== uid);
            return membros.length ? [{ ...p, membros, liderUid: p.liderUid === uid ? membros[0].uid : p.liderUid, atualizadaEm: em }] : [];
          });
          ctx.gravarGuilda({ ...g, partys: semMim });
          return { mensagem: 'Você saiu da party.' };
        })
      );
    case 'pronto':
      return repositorio.executarTransacao('teste:pronto', (ctx) =>
        comGuilda(ctx, uid, async (_eu, g, partys) => {
          const p = partyDe(partys, uid);
          if (!p) throw new ErroDeGuilda('Você não está numa party.', 404);
          const pronto = pedido.pronto === true;
          ctx.gravarGuilda({ ...g, partys: partys.map((x) => (x.id === p.id ? { ...x, membros: x.membros.map((m) => (m.uid === uid ? { ...m, pronto } : m)), atualizadaEm: em } : x)) });
          return { mensagem: pronto ? 'Você está pronto.' : 'Você não está mais pronto.' };
        })
      );
    case 'iniciar':
      return iniciarTeste(uid, pedido.dificuldade, gerarSementeCombate());
  }
}

/** O líder inicia: confere todos, roda a luta em grupo e aplica tentativas e recompensas de todos na mesma transação. */
export async function iniciarTeste(uid: string, dificuldadePedida: unknown, semente: number): Promise<{ mensagem: string; resultado: ResultadoDaParty }> {
  const dificuldade = typeof dificuldadePedida === 'number' && Number.isInteger(dificuldadePedida) ? dificuldadePedida : 0;
  if (dificuldade < 1 || dificuldade > DIFICULDADES_DO_TESTE) throw new ErroDeGuilda('Dificuldade inválida.');
  const hoje = diaDeBrasilia(agora());
  return repositorio.executarTransacao('teste:iniciar', (ctx) =>
    comGuilda(ctx, uid, async (_eu, g, partys) => {
      const p = partyDe(partys, uid);
      if (!p) throw new ErroDeGuilda('Você não está numa party.', 404);
      if (p.liderUid !== uid) throw new ErroDeGuilda('Só o líder da party inicia.');
      if (p.membros.length < TAMANHO_MINIMO_DO_TESTE) throw new ErroDeGuilda(`O Teste de Equipe pede pelo menos ${TAMANHO_MINIMO_DO_TESTE} jogadores.`);
      if (!p.membros.every((m) => m.pronto)) throw new ErroDeGuilda('Todos precisam marcar "Pronto".', 409);
      const docs = await Promise.all(p.membros.map((m) => carregarPersonagem(ctx, m.uid)));
      for (const d of docs) {
        if (d.guildaId !== g.id || !g.membros.some((m) => m.uid === d.uid)) throw new ErroDeGuilda(`${d.nome} não está mais na guilda.`, 409);
        if (d.nivel < NIVEL_DO_TESTE_DE_EQUIPE) throw new ErroDeGuilda(`${d.nome} ainda não tem o nível ${NIVEL_DO_TESTE_DE_EQUIPE}.`);
        if (!dificuldadeLiberada(dificuldade, d.testeEquipeVencidas)) throw new ErroDeGuilda(`${d.nome} ainda não venceu a dificuldade ${dificuldade - 1}.`);
        if (d.testeEquipeTentativas?.[String(dificuldade)] === hoje) throw new ErroDeGuilda(`${d.nome} já tentou a dificuldade ${dificuldade} hoje.`, 409);
      }
      const chefe = montarChefeDoTeste(dificuldade, docs.length);
      const r = resolverCombateEmGrupo(docs.map(combatenteDoPersonagem), chefe, semente);
      const venceu = r.vencedor === 'grupo';
      for (const d of docs) {
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
        salvarPersonagem(ctx, doc, {
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
      ctx.gravarGuilda({ ...g, partys: partys.map((x) => (x.id === p.id ? { ...x, membros: x.membros.map((m) => ({ ...m, pronto: false })), atualizadaEm: resultado.em, ultimoResultado: resultado } : x)) });
      const rec = recompensaDoTeste(dificuldade, false);
      return {
        mensagem: venceu
          ? `Vitória! ${chefe.nome} caiu em ${r.rodadas} rodadas. Cada um recebeu ${rec.ouro} de ouro, XP e diamantes (mais na primeira vitória).`
          : `Derrota diante de ${chefe.nome}. A tentativa de hoje desta dificuldade foi usada.`,
        resultado,
      };
    })
  );
}
