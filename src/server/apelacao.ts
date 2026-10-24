import { horaDe, idDaRevisao } from '@/rules/integridade';
import {
  APELACAO_MAXIMA,
  APELACAO_MINIMA,
  mensagemDaSancao,
  podeApelar,
  sancaoEmVigor,
  type Apelacao,
  type SancaoEmVigor,
} from '@/rules/sancoes';
import { repositorio } from '@/server/persistencia';
import { atualizarCacheDeSancao } from '@/server/sancoes';

/**
 * Apelação pelo jogo (6.5-7, decisão do Yuri em 24/10/2026): quem está suspenso ou banido vê o motivo e pode mandar
 * um pedido por sanção. O pedido vai para a fila de revisão do Painel do Mestre, e a resposta aparece na mesma tela.
 */

export class ErroDeApelacao extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeApelacao';
  }
}

export interface EstadoDaApelacao {
  /** A sanção em vigor, ou null se a conta está livre. */
  sancao: (SancaoEmVigor & { mensagem: string }) | null;
  /** O pedido desta sanção, se já foi feito. */
  apelacao: Apelacao | null;
  podeApelar: boolean;
}

export async function estadoDaApelacao(uid: string, agora = new Date()): Promise<EstadoDaApelacao> {
  const doc = await repositorio.lerSancao(uid);
  const vigor = sancaoEmVigor(doc, agora);
  const desta = doc?.apelacao && doc.apelacao.daSancaoDe === doc.aplicadaEm ? doc.apelacao : null;
  return { sancao: vigor ? { ...vigor, mensagem: mensagemDaSancao(vigor) } : null, apelacao: vigor ? desta : null, podeApelar: podeApelar(doc, agora) };
}

export async function pedirApelacao(uid: string, textoBruto: unknown, agora = new Date()): Promise<EstadoDaApelacao> {
  const texto = typeof textoBruto === 'string' ? textoBruto.trim() : '';
  if (texto.length < APELACAO_MINIMA || texto.length > APELACAO_MAXIMA) throw new ErroDeApelacao(`Escreva o pedido com ${APELACAO_MINIMA} a ${APELACAO_MAXIMA} caracteres.`);
  const doc = await repositorio.lerSancao(uid);
  if (!doc || !sancaoEmVigor(doc, agora)) throw new ErroDeApelacao('Sua conta não está suspensa nem banida.');
  if (!podeApelar(doc, agora)) throw new ErroDeApelacao('Você já pediu apelação desta sanção. Aguarde a resposta.');
  const proximo = { ...doc, apelacao: { texto, em: agora.toISOString(), daSancaoDe: doc.aplicadaEm, situacao: 'pendente' as const } };
  await repositorio.gravarSancao(proximo);
  atualizarCacheDeSancao(proximo);
  const personagem = await repositorio.lerPersonagem(uid);
  await repositorio.gravarRevisao({
    id: idDaRevisao(uid, horaDe(agora), 'apelacao'),
    uid,
    nome: personagem?.nome ?? '(sem personagem)',
    tipo: 'apelacao',
    descricao: texto,
    criadaEm: agora.toISOString(),
    revisada: false,
  });
  return estadoDaApelacao(uid, agora);
}
