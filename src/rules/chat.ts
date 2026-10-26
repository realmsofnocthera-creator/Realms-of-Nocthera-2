import { censurarOfensas } from './nomesProibidos';

/**
 * Chat (7.7, decidido pelo Yuri em 26/10/2026). Dois canais: Global (nível 5) e Guilda (só os membros). Cada canal
 * guarda as últimas 50 mensagens num único documento (chat/{canal}); cada mensagem é 1 gravação. Mensagens de até
 * 200 caracteres; uma a cada 5 segundos no Global e a cada 2 na Guilda. Ofensas pesadas e links viram "***". Cada
 * jogador bloqueia até 100 outros; o Moderador e o Dono silenciam por 1 hora, 24 horas ou 7 dias e apagam mensagens;
 * as denúncias vão para a fila de revisão do Painel (resposta em até 48 horas).
 */

export const NIVEL_DO_CHAT_GLOBAL = 5;
export const MENSAGENS_POR_CANAL = 50;
export const TEXTO_MAXIMO_DO_CHAT = 200;
export const BLOQUEADOS_MAXIMOS = 100;
export const PRAZO_DA_DENUNCIA_HORAS = 48;
/** Quantas mensagens anteriores vão junto na denúncia, para dar contexto. */
export const CONTEXTO_DA_DENUNCIA = 5;

export type CanalDoChat = 'global' | 'guilda';
export const CANAIS_DO_CHAT: readonly CanalDoChat[] = ['global', 'guilda'];
export const NOME_DO_CANAL: Readonly<Record<CanalDoChat, string>> = { global: 'Global', guilda: 'Guilda' };
export const INTERVALO_DO_CANAL_MS: Readonly<Record<CanalDoChat, number>> = { global: 5_000, guilda: 2_000 };
export const ehCanalDoChat = (v: unknown): v is CanalDoChat => v === 'global' || v === 'guilda';

/** O id do documento do canal: "global" ou "guilda_<id da guilda>". */
export const idDoCanal = (canal: CanalDoChat, guildaId?: string) => (canal === 'global' ? 'global' : `guilda_${guildaId ?? ''}`);
/** Ids de canal que o Painel do Mestre aceita. */
export const ID_DE_CANAL_VALIDO = /^(global|guilda_[A-Za-z0-9_-]{1,64})$/;

export const SILENCIOS = [
  { id: '1h', nome: '1 hora', ms: 3_600_000 },
  { id: '24h', nome: '24 horas', ms: 86_400_000 },
  { id: '7d', nome: '7 dias', ms: 7 * 86_400_000 },
] as const;
export type DuracaoDoSilencio = (typeof SILENCIOS)[number]['id'];
export const duracaoDoSilencio = (id: unknown) => SILENCIOS.find((s) => s.id === id);

export interface MensagemDoChat {
  id: string;
  uid: string;
  nome: string;
  texto: string;
  em: string;
}

/** chat/{canal}: as últimas mensagens do canal. */
export interface CanalDocumento {
  id: string;
  mensagens: MensagemDoChat[];
}

/** O que o jogador bloqueou: o uid fica só no servidor; a tela desbloqueia pelo nome. */
export interface BloqueadoNoChat {
  uid: string;
  nome: string;
}

export function canalDoDocumento(id: string, bruto: unknown): CanalDocumento | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const lista = (bruto as { mensagens?: unknown }).mensagens;
  const mensagens = (Array.isArray(lista) ? lista : []).flatMap((m): MensagemDoChat[] => {
    const o = m as Record<string, unknown> | null;
    return o && typeof o.id === 'string' && typeof o.uid === 'string' && typeof o.nome === 'string' && typeof o.texto === 'string' && typeof o.em === 'string'
      ? [{ id: o.id, uid: o.uid, nome: o.nome, texto: o.texto, em: o.em }]
      : [];
  });
  return { id, mensagens: mensagens.slice(-MENSAGENS_POR_CANAL) };
}

export function bloqueadosDoDocumento(bruto: unknown): BloqueadoNoChat[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto
    .filter((b): b is BloqueadoNoChat => !!b && typeof (b as BloqueadoNoChat).uid === 'string' && typeof (b as BloqueadoNoChat).nome === 'string')
    .map((b) => ({ uid: b.uid, nome: b.nome }))
    .slice(0, BLOQUEADOS_MAXIMOS);
  return lista.length ? lista : undefined;
}

/** Limpa o texto digitado: espaços e caracteres de controle, tamanho, ofensas e links. Texto vazio vira null. */
export function prepararTexto(bruto: unknown): { texto: string; mudou: boolean } | null {
  if (typeof bruto !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const limpo = bruto.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!limpo) return null;
  const cortado = limpo.slice(0, TEXTO_MAXIMO_DO_CHAT);
  const r = censurarOfensas(cortado);
  return { texto: r.texto, mudou: r.mudou || cortado.length < limpo.length };
}
