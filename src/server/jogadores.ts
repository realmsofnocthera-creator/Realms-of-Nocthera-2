import {
  ehAcaoDeSancao,
  DIAS_MAXIMOS_DE_SUSPENSAO,
  DIAS_MINIMOS_DE_SUSPENSAO,
  MAXIMO_DE_ADVERTENCIAS,
  sancaoDocumentoVazio,
  sancaoEmVigor,
  type AcaoDeSancao,
  type Advertencia,
  type SancaoDocumento,
  type SancaoEmVigor,
} from '@/rules/sancoes';
import type { PapelMestre } from '@/rules/mestre';
import { ajustarPersonagemPorMestre, type AjusteDoMestre, type CharacterDocument, type Moeda, type TransactionDocument } from '@/server/characterService';
import { ehCampoDeAjuste, LIMITE_DE_MATERIAL_POR_PEDIDO, LIMITE_POR_CAMPO, MAXIMO_DE_MATERIAIS_POR_PEDIDO, NOME_DO_CAMPO } from '@/rules/ajustes';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { adminAuth } from '@/server/firebaseAdmin';
import { registrarLog } from '@/server/log';
import { comRegistro, donosDoAmbiente, ErroMestre, exigir, motivoValido, papelDoUsuario, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { chaveDoNome } from '@/server/persistencia/tipos';
import { atualizarCacheDeSancao } from '@/server/sancoes';

/**
 * Gestão de jogadores no Painel do Mestre (3.5.4): busca e ficha (3.5.4.1) e sanções (3.5.4.3).
 * Ver os dados de um jogador também entra no log administrativo, porque são dados pessoais.
 */
const ID_VALIDO = /^[a-zA-Z0-9_-]{1,128}$/;
export const LIMITE_DE_TRANSACOES_NA_FICHA = 100;
const ERRO_DE_EMAIL = 'A busca por e-mail não está disponível agora. Use o nome do personagem ou o identificador (uid).';

export interface ResumoDoPersonagem {
  nome: string;
  avatarId: string;
  sobre: string;
  racaId: string;
  classeId: string;
  linhagem: string | null;
  nivel: number;
  xpAtual: number;
  pontosDisponiveis: number;
  atributos: CharacterDocument['atributos'];
  hpMax: number;
  ouro: number;
  diamantes: number;
  fragmentosAlma: number;
  essenciaHabilidade: number;
  fragmentosAscensao: number;
  subclasseAtualId: string | null;
  reforcoHabilidade: number;
  ascensaoHabilidade: number;
  torreAndar: number;
  cacadaChavesVencidas: number[];
  batalhaSangrentaVencidas: string[];
  guerreiroVencidas: number[];
  quantidadeDeArmas: number;
  quantidadeDeArmaduras: number;
  quantidadeDeEmblemas: number;
  inventario: Record<string, number>;
  criadoEm: string;
}

export interface FichaDoJogador {
  uid: string;
  /** O e-mail do login; null se o Firebase Auth não respondeu. */
  email: string | null;
  personagem: ResumoDoPersonagem;
  sancao: SancaoEmVigor | null;
  advertencias: Advertencia[];
  papelNoPainel: PapelMestre | null;
  transacoes: TransactionDocument[];
}

export function resumoDoPersonagem(c: CharacterDocument): ResumoDoPersonagem {
  return {
    nome: c.nome,
    avatarId: c.avatarId,
    sobre: c.sobre ?? '',
    racaId: c.racaId,
    classeId: c.classeId,
    linhagem: c.linhagem ?? null,
    nivel: c.nivel,
    xpAtual: c.xpAtual,
    pontosDisponiveis: c.pontosDisponiveis,
    atributos: c.atributos,
    hpMax: c.hpMax,
    ouro: c.ouro,
    diamantes: c.diamantes ?? 0,
    fragmentosAlma: c.fragmentosAlma ?? 0,
    essenciaHabilidade: c.essenciaHabilidade ?? 0,
    fragmentosAscensao: c.fragmentosAscensao ?? 0,
    subclasseAtualId: c.subclasseAtualId ?? null,
    reforcoHabilidade: c.reforcoHabilidade ?? 0,
    ascensaoHabilidade: c.ascensaoHabilidade ?? 0,
    torreAndar: c.torreAndar ?? 0,
    cacadaChavesVencidas: c.cacadaChavesVencidas ?? [],
    batalhaSangrentaVencidas: c.batalhaSangrentaVencidas ?? [],
    guerreiroVencidas: c.guerreiroVencidas ?? [],
    quantidadeDeArmas: c.armas?.length ?? 0,
    quantidadeDeArmaduras: c.armaduras?.length ?? 0,
    quantidadeDeEmblemas: c.emblemasItens?.length ?? 0,
    inventario: c.inventario ?? {},
    criadoEm: c.criadoEm,
  };
}

/** O uid do jogador pela busca: e-mail, nome do personagem (igual, sem diferenciar maiúsculas) ou uid. */
async function resolverUid(busca: string): Promise<string | null> {
  if (busca.includes('@')) {
    try {
      return (await adminAuth.getUserByEmail(busca.toLowerCase())).uid;
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/user-not-found') return null;
      registrarLog('WARNING', 'mestre.busca_por_email_falhou', { codigo: (error as { code?: string })?.code ?? 'desconhecido' });
      throw new ErroMestre(503, ERRO_DE_EMAIL);
    }
  }
  const porNome = await repositorio.lerDonoDoNome(chaveDoNome(busca));
  if (porNome) return porNome;
  if (ID_VALIDO.test(busca) && (await repositorio.lerPersonagem(busca))) return busca;
  return null;
}

async function emailDoJogador(uid: string): Promise<string | null> {
  try {
    return (await adminAuth.getUser(uid)).email ?? null;
  } catch {
    return null;
  }
}

async function montarFicha(uid: string): Promise<FichaDoJogador> {
  const personagem = await repositorio.lerPersonagem(uid);
  if (!personagem) throw new ErroMestre(404, 'Esse e-mail ainda não criou um personagem.');
  const [sancaoDoc, transacoes, email, papel] = await Promise.all([
    repositorio.lerSancao(uid),
    repositorio.listarTransacoes(uid, LIMITE_DE_TRANSACOES_NA_FICHA),
    emailDoJogador(uid),
    papelDoUsuario(uid),
  ]);
  return {
    uid,
    email,
    personagem: resumoDoPersonagem(personagem),
    sancao: sancaoEmVigor(sancaoDoc, new Date()),
    advertencias: sancaoDoc?.advertencias ?? [],
    papelNoPainel: papel?.papel ?? null,
    transacoes,
  };
}

/** Procura um jogador por e-mail, nome do personagem ou uid e devolve a ficha. Fica no log. */
export async function buscarJogador(sessao: SessaoMestre, buscaBruta: unknown, ip?: string): Promise<FichaDoJogador> {
  exigir(sessao, 'jogadores.ler');
  const busca = typeof buscaBruta === 'string' ? buscaBruta.trim() : '';
  if (busca.length < 2 || busca.length > 128) throw new ErroMestre(400, 'Escreva o nome do personagem, o e-mail ou o identificador (uid) do jogador.');
  const uid = await resolverUid(busca);
  if (!uid) throw new ErroMestre(404, 'Nenhum jogador encontrado. A busca pelo nome precisa do nome inteiro.');
  return comRegistro(sessao, { acao: 'jogador.consultar', alvo: uid, ip }, () => montarFicha(uid));
}

export interface PedidoDeSancao {
  acao: unknown;
  dias?: unknown;
  motivo: unknown;
}

function diasValidos(dias: unknown): number {
  if (typeof dias !== 'number' || !Number.isInteger(dias) || dias < DIAS_MINIMOS_DE_SUSPENSAO || dias > DIAS_MAXIMOS_DE_SUSPENSAO) {
    throw new ErroMestre(400, `Informe os dias de suspensão (de ${DIAS_MINIMOS_DE_SUSPENSAO} a ${DIAS_MAXIMOS_DE_SUSPENSAO}).`);
  }
  return dias;
}

/**
 * Advertir, suspender com prazo, banir ou levantar a sanção de um jogador. Sem log, nada muda.
 *
 * Não derruba as sessões abertas de propósito: cada pedido do jogador já passa pela checagem da conta em
 * verifyAuthToken, então ele é barrado na hora e recebe o motivo (403). Derrubar a sessão o faria receber só
 * "não autorizado" e esconderia o motivo.
 */
export async function aplicarSancao(sessao: SessaoMestre, uidAlvo: unknown, pedido: PedidoDeSancao, ip?: string): Promise<FichaDoJogador> {
  exigir(sessao, 'jogadores.sancionar');
  if (typeof uidAlvo !== 'string' || !ID_VALIDO.test(uidAlvo)) throw new ErroMestre(400, 'Informe o identificador (uid) do jogador.');
  if (!ehAcaoDeSancao(pedido.acao)) throw new ErroMestre(400, 'Escolha uma ação válida: advertir, suspender, banir ou desbanir.');
  const acao: AcaoDeSancao = pedido.acao;
  const motivo = motivoValido(pedido.motivo);
  const dias = acao === 'suspender' ? diasValidos(pedido.dias) : null;

  if (uidAlvo === sessao.uid) throw new ErroMestre(400, 'Você não pode sancionar a si mesmo.');
  if (donosDoAmbiente().has(uidAlvo) || (await papelDoUsuario(uidAlvo))) {
    throw new ErroMestre(400, 'Esse jogador tem papel no painel. Tire o papel dele antes de sancionar.');
  }
  if (!(await repositorio.lerPersonagem(uidAlvo))) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');

  const agora = new Date();
  const atual = (await repositorio.lerSancao(uidAlvo)) ?? sancaoDocumentoVazio(uidAlvo);
  const emVigor = sancaoEmVigor(atual, agora);
  const antes = { tipo: emVigor?.tipo ?? null, ate: emVigor?.ate ?? null };
  const proximo: SancaoDocumento = { ...atual, advertencias: [...atual.advertencias] };

  if (acao === 'advertir') {
    proximo.advertencias = [...proximo.advertencias, { em: agora.toISOString(), por: sessao.uid, motivo }].slice(-MAXIMO_DE_ADVERTENCIAS);
  } else if (acao === 'suspender') {
    if (emVigor?.tipo === 'banimento') throw new ErroMestre(400, 'Esse jogador já está banido. Levante o banimento antes de suspender.');
    Object.assign(proximo, { tipo: 'suspensao', ate: new Date(agora.getTime() + dias! * 86_400_000).toISOString(), motivo, aplicadaPor: sessao.uid, aplicadaEm: agora.toISOString() });
  } else if (acao === 'banir') {
    if (emVigor?.tipo === 'banimento') throw new ErroMestre(400, 'Esse jogador já está banido.');
    Object.assign(proximo, { tipo: 'banimento', ate: null, motivo, aplicadaPor: sessao.uid, aplicadaEm: agora.toISOString() });
  } else {
    if (!emVigor) throw new ErroMestre(400, 'Esse jogador não está suspenso nem banido.');
    Object.assign(proximo, { tipo: null, ate: null, motivo: '', aplicadaPor: sessao.uid, aplicadaEm: agora.toISOString() });
  }

  const depois = acao === 'advertir' ? antes : { tipo: proximo.tipo, ate: proximo.ate };
  await comRegistro(
    sessao,
    { acao: `jogador.${acao}`, alvo: uidAlvo, antes, depois: { ...depois, ...(dias !== null ? { dias } : {}), advertencias: proximo.advertencias.length }, motivo, ip },
    () => repositorio.gravarSancao(proximo)
  );
  atualizarCacheDeSancao(proximo);

  return montarFicha(uidAlvo);
}

export interface PedidoDeAjuste {
  /** { ouro: 500, diamantes: -2, xp: 300 }: variações, não valores finais. */
  campos?: unknown;
  /** { "pelo-de-rato": 5 }: variação por material. */
  materiais?: unknown;
  motivo: unknown;
}

function inteiroNaoZero(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v !== 0;
}

/**
 * Ajusta moedas, XP e materiais de um jogador (só o Dono). Valores são variações e vão para o extrato de
 * transações com o motivo; o resultado nunca fica negativo. Sem log, nada muda.
 */
export async function ajustarJogador(sessao: SessaoMestre, uidAlvo: unknown, pedido: PedidoDeAjuste, ip?: string): Promise<FichaDoJogador> {
  exigir(sessao, 'jogadores.ajustar');
  if (typeof uidAlvo !== 'string' || !ID_VALIDO.test(uidAlvo)) throw new ErroMestre(400, 'Informe o identificador (uid) do jogador.');
  const motivo = motivoValido(pedido.motivo);

  const ajuste: AjusteDoMestre = { moedas: {} };
  const resumo: Record<string, number> = {};
  const campos = pedido.campos && typeof pedido.campos === 'object' && !Array.isArray(pedido.campos) ? (pedido.campos as Record<string, unknown>) : {};
  for (const [campo, valor] of Object.entries(campos)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (!ehCampoDeAjuste(campo)) throw new ErroMestre(400, `Campo não permitido: ${campo}.`);
    if (!inteiroNaoZero(valor)) throw new ErroMestre(400, `${NOME_DO_CAMPO[campo]}: informe um número inteiro diferente de zero.`);
    if (Math.abs(valor) > LIMITE_POR_CAMPO[campo]) {
      throw new ErroMestre(400, `${NOME_DO_CAMPO[campo]}: o limite por ajuste é ${LIMITE_POR_CAMPO[campo].toLocaleString('pt-BR')}.`);
    }
    if (campo === 'xp') {
      if (valor < 0) throw new ErroMestre(400, 'XP só pode ser concedido, não retirado.');
      ajuste.xp = valor;
    } else ajuste.moedas[campo as Moeda] = valor;
    resumo[campo] = valor;
  }
  const mats = pedido.materiais && typeof pedido.materiais === 'object' && !Array.isArray(pedido.materiais) ? (pedido.materiais as Record<string, unknown>) : {};
  const idsDeMateriais = Object.keys(mats).filter((id) => mats[id] !== undefined && mats[id] !== null && mats[id] !== '');
  if (idsDeMateriais.length > MAXIMO_DE_MATERIAIS_POR_PEDIDO) throw new ErroMestre(400, `No máximo ${MAXIMO_DE_MATERIAIS_POR_PEDIDO} materiais por ajuste.`);
  if (idsDeMateriais.length) ajuste.materiais = {};
  for (const id of idsDeMateriais) {
    const valor = mats[id];
    if (!MATERIAIS_MAP[id] && !MATERIAIS_MUNDO_MAP[id]) throw new ErroMestre(400, `Material desconhecido: ${id}.`);
    if (!inteiroNaoZero(valor) || Math.abs(valor) > LIMITE_DE_MATERIAL_POR_PEDIDO) {
      throw new ErroMestre(400, `Material ${id}: informe um inteiro diferente de zero, até ${LIMITE_DE_MATERIAL_POR_PEDIDO} por ajuste.`);
    }
    ajuste.materiais![id] = valor;
    resumo[`material:${id}`] = valor;
  }
  if (Object.keys(resumo).length === 0) throw new ErroMestre(400, 'Informe ao menos um valor para ajustar.');

  const antes = await repositorio.lerPersonagem(uidAlvo);
  if (!antes) throw new ErroMestre(404, 'Nenhum jogador com esse identificador.');

  await comRegistro(sessao, { acao: 'jogador.ajustar', alvo: uidAlvo, antes: { nivel: antes.nivel, xp: antes.xpAtual }, depois: resumo, motivo, ip }, async () => {
    try {
      await ajustarPersonagemPorMestre(uidAlvo, ajuste, `Ajuste do painel: ${motivo}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (/insuficiente/i.test(msg)) throw new ErroMestre(400, `O ajuste deixaria o saldo negativo (${msg}). Nada foi alterado.`);
      throw error;
    }
  });
  return montarFicha(uidAlvo);
}
