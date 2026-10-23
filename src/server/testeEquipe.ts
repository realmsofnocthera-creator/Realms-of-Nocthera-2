import { randomBytes } from 'node:crypto';
import { resolverCombateEmGrupo } from '@/game/combat';
import { contarVitorias } from '@/game/contratos';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import {
  CARTAS_POR_VITORIA,
  CHANCE_DO_SELO,
  CATEGORIAS_DO_TESTE,
  CHAVES_GRATIS_POR_DIA,
  CHEFES_DO_TESTE,
  chaveDeConclusao,
  chavesDisponiveis,
  chavesDoDia,
  chavesGratisRestantes,
  comprasRestantesHoje,
  CONVITES_DA_PARTY,
  CONVITES_DE_PARTY_DO_JOGADOR,
  DIFICULDADE_DO_SELO,
  DIFICULDADE_QUE_DA_SELO,
  DIFICULDADES,
  dificuldadeDoTeste,
  dificuldadeLiberada,
  DIFICULDADES_DO_TESTE,
  ehCategoriaDoTeste,
  gastarChave,
  montarChefeDoTeste,
  NIVEL_DO_TESTE_DE_EQUIPE,
  NOME_DO_TESTE,
  partyVale,
  PRECO_DA_CHAVE_EM_DIAMANTES,
  raridadesDaDificuldade,
  TAMANHO_MAXIMO_DA_PARTY,
  TAMANHO_MINIMO_DO_TESTE,
  type CategoriaDoTeste,
  type PartyDocumento,
  type ResultadoDaParty,
} from '@/rules/testeEquipe';
import { alterarSaldoEm, carregarPersonagem, combatenteDoPersonagem, maestriasDasVitorias, salvarPersonagem, type CharacterDocument } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { entregarCartas, sorteadorDaSemente, sortearTipoDaRaridade } from '@/server/almas';
import { sortearRaridadePorPesos } from '@/rules/almas';
import type { EmblemaRaridade } from '@/rules/emblemas';
import { chaveDoNome, repositorio, type ContextoTransacao } from '@/server/persistencia';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';

/**
 * Party e Teste de Equipe (7.4). A party é aberta a qualquer jogador de nível 25 ou mais (não precisa de guilda): o
 * líder chama alguém pelo nome (até 3 jogadores), cada um marca "Pronto" e o líder escolhe o teste e a dificuldade e
 * inicia. Cada party é um documento (partys/{id}) com os membros e os convites. A luta inteira roda no servidor, numa
 * transação que lê e grava a party e os personagens: a chave (ou o selo) de cada um, as recompensas e o resultado.
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
  nome: string;
  liberada: boolean;
  concluida: boolean;
  /** O que cada membro gasta para entrar. */
  custo: 'chave' | 'selo';
  /** As raridades possíveis e a chance (%) de cada carta. */
  raridades: { raridade: EmblemaRaridade; chance: number }[];
  cacos: number;
  poeira: number;
  /** Diamantes da primeira conclusão (0 se já concluiu). */
  diamantes: number;
  /** Chance de selo do abismo na vitória (só no Muito difícil). */
  chanceDoSelo: number;
}

export interface TesteNaTela {
  categoria: CategoriaDoTeste;
  nome: string;
  chefe: string;
  dificuldades: DificuldadeNaTela[];
}

export interface EstadoDoTeste {
  nivelNecessario: number;
  meuNivel: number;
  minhaParty: (PartyDocumento & { souLider: boolean }) | null;
  /** Convites de party que o jogador recebeu e ainda valem. */
  convites: { partyId: string; de: string }[];
  chaves: { gratisRestantes: number; gratisPorDia: number; guardadas: number; comprasRestantes: number; preco: number };
  selos: number;
  cacos: number;
  poeira: number;
  diamantes: number;
  testes: TesteNaTela[];
}

function testesNaTela(char: CharacterDocument): TesteNaTela[] {
  const concluidas = char.testeEquipeConcluidas ?? [];
  return CATEGORIAS_DO_TESTE.map((categoria) => ({
    categoria,
    nome: NOME_DO_TESTE[categoria],
    chefe: CHEFES_DO_TESTE[categoria].nome,
    dificuldades: DIFICULDADES.map((d) => {
      const concluida = concluidas.includes(chaveDeConclusao(categoria, d.dificuldade));
      return {
        dificuldade: d.dificuldade,
        nome: d.nome,
        liberada: dificuldadeLiberada(categoria, d.dificuldade, concluidas),
        concluida,
        custo: d.dificuldade === DIFICULDADE_DO_SELO ? ('selo' as const) : ('chave' as const),
        raridades: raridadesDaDificuldade(d.dificuldade),
        cacos: d.cacos,
        poeira: d.poeira,
        diamantes: concluida ? 0 : d.diamantesPrimeiraVez,
        chanceDoSelo: d.dificuldade === DIFICULDADE_QUE_DA_SELO ? CHANCE_DO_SELO : 0,
      };
    }),
  }));
}

export async function estadoDoTeste(uid: string): Promise<EstadoDoTeste> {
  const char = await repositorio.lerPersonagem(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const chaves = chavesDoDia(char.chavesDaProvacao, diaDeBrasilia(agora()));
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
    chaves: {
      gratisRestantes: chavesGratisRestantes(chaves),
      gratisPorDia: CHAVES_GRATIS_POR_DIA,
      guardadas: chaves.guardadas,
      comprasRestantes: comprasRestantesHoje(chaves),
      preco: PRECO_DA_CHAVE_EM_DIAMANTES,
    },
    selos: char.selosDoAbismo ?? 0,
    cacos: char.cacosDeAlma ?? 0,
    poeira: char.poeiraDeAlma ?? 0,
    diamantes: char.diamantes ?? 0,
    testes: testesNaTela(char),
  };
}

export const ACOES_DO_TESTE = ['criar', 'convidar', 'aceitar', 'recusar', 'sair', 'pronto', 'comprarChave', 'iniciar'] as const;
export type AcaoDoTeste = (typeof ACOES_DO_TESTE)[number];

export interface PedidoDoTeste {
  partyId?: unknown;
  nome?: unknown;
  pronto?: unknown;
  categoria?: unknown;
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
    case 'comprarChave':
      return repositorio.executarTransacao('teste:comprarChave', async (ctx) => {
        const eu = await carregarPersonagem(ctx, uid);
        const chaves = chavesDoDia(eu.chavesDaProvacao, diaDeBrasilia(agora()));
        if (comprasRestantesHoje(chaves) <= 0) throw new ErroDeParty('Você já comprou as chaves de hoje. Volte amanhã.', 409);
        if ((eu.diamantes ?? 0) < PRECO_DA_CHAVE_EM_DIAMANTES) throw new ErroDeParty(`Você precisa de ${PRECO_DA_CHAVE_EM_DIAMANTES} diamantes.`, 409);
        const doc = alterarSaldoEm(ctx, eu, 'diamantes', -PRECO_DA_CHAVE_EM_DIAMANTES, 'Chave da provação').character;
        salvarPersonagem(ctx, doc, { diamantes: doc.diamantes, chavesDaProvacao: { ...chaves, compradasHoje: chaves.compradasHoje + 1, guardadas: chaves.guardadas + 1 } });
        return { mensagem: 'Você comprou 1 chave da provação.' };
      });
    case 'iniciar':
      return iniciarTeste(uid, pedido.categoria, pedido.dificuldade, gerarSementeCombate());
  }
}

/**
 * O líder inicia: confere todos (nível, a dificuldade anterior concluída e a chave ou o selo), gasta a chave (ou o
 * selo) de cada um, roda a luta em grupo e aplica as recompensas de todos na mesma transação.
 */
export async function iniciarTeste(uid: string, categoriaPedida: unknown, dificuldadePedida: unknown, semente: number): Promise<{ mensagem: string; resultado: ResultadoDaParty }> {
  if (!ehCategoriaDoTeste(categoriaPedida)) throw new ErroDeParty('Escolha o teste (Alma, Corpo ou Mente).');
  const categoria = categoriaPedida;
  const dificuldade = typeof dificuldadePedida === 'number' && Number.isInteger(dificuldadePedida) ? dificuldadePedida : 0;
  if (dificuldade < 1 || dificuldade > DIFICULDADES_DO_TESTE) throw new ErroDeParty('Dificuldade inválida.');
  await exigirSistemaLigado(uid, 'testeEquipe');
  const hoje = diaDeBrasilia(agora());
  const regra = dificuldadeDoTeste(dificuldade);
  const pedeSelo = dificuldade === DIFICULDADE_DO_SELO;
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
      if (!dificuldadeLiberada(categoria, dificuldade, d.testeEquipeConcluidas)) {
        throw new ErroDeParty(`${d.nome} ainda não concluiu o ${dificuldadeDoTeste(dificuldade - 1).nome} do ${NOME_DO_TESTE[categoria]}.`);
      }
      if (pedeSelo ? (d.selosDoAbismo ?? 0) < 1 : chavesDisponiveis(chavesDoDia(d.chavesDaProvacao, hoje)) < 1) {
        throw new ErroDeParty(`${d.nome} não tem ${pedeSelo ? 'selo do abismo' : 'chave da provação'}.`, 409);
      }
    }
    const chefe = montarChefeDoTeste(categoria, dificuldade, docs.length);
    const r = resolverCombateEmGrupo(docs.map(combatenteDoPersonagem), chefe, semente);
    const venceu = r.vencedor === 'grupo';
    let selosGanhos = 0;
    for (const [indice, d] of docs.entries()) {
      let doc = d;
      // A entrada: 1 chave (as grátis do dia primeiro) ou 1 selo, ganhe ou perca
      const selosDepoisDaEntrada = (doc.selosDoAbismo ?? 0) - (pedeSelo ? 1 : 0);
      const custo = pedeSelo ? { selosDoAbismo: selosDepoisDaEntrada || undefined } : { chavesDaProvacao: gastarChave(chavesDoDia(doc.chavesDaProvacao, hoje))! };
      if (!venceu) {
        salvarPersonagem(ctx, doc, custo);
        continue;
      }
      const conclusao = chaveDeConclusao(categoria, dificuldade);
      const primeira = !(doc.testeEquipeConcluidas ?? []).includes(conclusao);
      if (primeira) doc = alterarSaldoEm(ctx, doc, 'diamantes', regra.diamantesPrimeiraVez, `${NOME_DO_TESTE[categoria]} (${regra.nome}, primeira vez)`).character;
      const contratos = contarVitorias(doc.contratos, [chefe.id], hoje);
      // Alma (7.8): 3 cartas do teste (só da categoria, cada uma sorteada à parte), cacos e, no Inferno, poeira; no Muito difícil, a chance do selo
      const sorteio = sorteadorDaSemente(semente + indice * 104729);
      const tipos = Array.from({ length: CARTAS_POR_VITORIA }, () => sortearTipoDaRaridade(sortearRaridadePorPesos(regra.pesos, sorteio), sorteio, categoria));
      const carta = entregarCartas(doc, tipos, semente + indice);
      const ganhouSelo = dificuldade === DIFICULDADE_QUE_DA_SELO && sorteio() < CHANCE_DO_SELO;
      if (ganhouSelo) selosGanhos++;
      const selos = selosDepoisDaEntrada + (ganhouSelo ? 1 : 0);
      salvarPersonagem(ctx, doc, {
        ...custo,
        ...carta.patch,
        cacosDeAlma: (carta.patch.cacosDeAlma ?? doc.cacosDeAlma ?? 0) + regra.cacos,
        ...(regra.poeira ? { poeiraDeAlma: (doc.poeiraDeAlma ?? 0) + regra.poeira } : {}),
        selosDoAbismo: selos || undefined,
        diamantes: doc.diamantes,
        ...(primeira ? { testeEquipeConcluidas: [...(doc.testeEquipeConcluidas ?? []), conclusao] } : {}),
        ...(contratos ? { contratos } : {}),
        ...maestriasDasVitorias(doc, [true], agora()),
      });
    }
    const resultado: ResultadoDaParty = { categoria, dificuldade, venceu, rodadas: r.rodadas, em: new Date().toISOString(), aliados: r.aliados };
    ctx.gravarParty({ ...p, membros: p.membros.map((m) => ({ ...m, pronto: false })), atualizadaEm: resultado.em, ultimoResultado: resultado });
    const titulo = `${NOME_DO_TESTE[categoria]} (${regra.nome})`;
    const extras = [regra.poeira ? `${regra.poeira} de poeira de alma` : '', selosGanhos ? `${selosGanhos} selo(s) do abismo na party` : ''].filter(Boolean);
    return {
      mensagem: venceu
        ? `Vitória no ${titulo}! ${chefe.nome} caiu em ${r.rodadas} rodadas. Cada um recebeu ${regra.cacos} cacos de alma e ${CARTAS_POR_VITORIA} cartas${extras.length ? `, além de ${extras.join(' e ')}` : ''} (e diamantes na primeira conclusão).`
        : `Derrota no ${titulo} diante de ${chefe.nome}. ${pedeSelo ? 'O selo' : 'A chave'} de cada um foi gast${pedeSelo ? 'o' : 'a'}.`,
      resultado,
    };
  });
}
