/**
 * Termos de Uso e Política de Privacidade. Os textos ainda não existem (roadmap 0.7.4.1): as páginas /termos e
 * /privacidade mostram um aviso até alguém preencher `src/content/termos.ts` e `src/content/privacidade.ts`.
 *
 * `VERSAO_DOS_TERMOS` é gravada no personagem junto com a data do aceite. Quando os textos reais forem publicados,
 * troque a versão (por exemplo, para "2026-11-01"): o servidor passa a exigir o aceite da versão nova.
 */
export const VERSAO_DOS_TERMOS = 'provisoria-1';

export interface AceiteLegal {
  termosVersao: string;
  /** Data e hora (ISO) em que o jogador aceitou os termos e confirmou a idade mínima. */
  aceitoEm: string;
}

/** O que o cliente manda ao criar o personagem. A data de nascimento só é conferida, nunca gravada. */
export interface AceiteDoCliente {
  dataNascimento: string;
  termosVersao: string;
}
