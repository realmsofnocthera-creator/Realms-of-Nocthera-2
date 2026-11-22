import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/server/firebaseAdmin';
import firebaseConfig from '../../firebase-applet-config.json';
import { ErroMestre, comRegistro, type SessaoMestre } from '@/server/mestre';
import { registrarLog } from '@/server/log';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDoCorreio } from '@/server/correio';
import { limparCacheRevogacao } from '@/server/auth';
import { COLECOES_MANTIDAS, criarIo, EMAIL_DO_DONO, limparJogadores, totalDeApagamentos } from '@/server/limpezaDeJogadores.mjs';

/**
 * Limpeza de jogadores pelo Painel do Mestre (só o Dono): apaga os dados e os logins de todos os jogadores e MANTÉM o Dono que está usando o
 * painel. IRREVERSÍVEL. O primeiro passo é o ensaio (só conta); apagar exige digitar a frase `APAGAR <projectId>`. Tudo fica no log administrativo.
 */
export const FRASE_DA_LIMPEZA = `APAGAR ${firebaseConfig.projectId}`;

export interface ResumoDaLimpeza {
  executado: boolean;
  /** Quantos documentos há em cada coleção que seria (ou foi) apagada. */
  colecoesInteiras: Record<string, number>;
  colecoesPorJogador: Record<string, number>;
  logins: number;
  total: number;
  mantidas: string[];
  donoPreservado: string;
  /** Acima de 15 mil exclusões, o plano Spark pode recusar o resto no dia: rode de novo. */
  avisoDaCota?: string;
  frase: string;
}

function exigirDono(sessao: SessaoMestre): void {
  if (sessao.papel !== 'dono') throw new ErroMestre(403, 'Só o Dono faz a limpeza de jogadores.');
  if (sessao.email.trim().toLowerCase() !== EMAIL_DO_DONO) throw new ErroMestre(403, `A limpeza só roda com o login do dono (${EMAIL_DO_DONO}).`);
}

const resumir = (r: Awaited<ReturnType<typeof limparJogadores>>, executado: boolean, dono: string): ResumoDaLimpeza => {
  const total = totalDeApagamentos(r) + r.usuarios.apagar;
  return {
    executado,
    colecoesInteiras: r.colecoesInteiras,
    colecoesPorJogador: r.colecoesPorJogador,
    logins: r.usuarios.apagar,
    total,
    mantidas: [...COLECOES_MANTIDAS],
    donoPreservado: dono,
    ...(total > 15000 ? { avisoDaCota: `${total} exclusões: o plano Spark limita a 20 mil por dia. Se parar no meio, rode de novo no dia seguinte.` } : {}),
    frase: FRASE_DA_LIMPEZA,
  };
};

/** O ensaio: conta o que seria apagado, sem apagar nada. */
export async function ensaioDaLimpeza(sessao: SessaoMestre): Promise<ResumoDaLimpeza> {
  exigirDono(sessao);
  const io = criarIo({ db: adminDb, auth: adminAuth, FieldValue });
  return resumir(await limparJogadores({ io, donoUid: sessao.uid, executar: false }), false, sessao.email);
}

/** Apaga de verdade (com a frase certa), com registro no log antes e depois. */
export async function executarLimpeza(sessao: SessaoMestre, confirmar: unknown, ip?: string): Promise<ResumoDaLimpeza> {
  exigirDono(sessao);
  if (confirmar !== FRASE_DA_LIMPEZA) throw new ErroMestre(400, `Para apagar, digite exatamente: ${FRASE_DA_LIMPEZA}`);
  const io = criarIo({ db: adminDb, auth: adminAuth, FieldValue, avisar: (m: string) => registrarLog('WARNING', 'mestre.limpeza_aviso', { mensagem: m }) });
  const resumo = await comRegistro(
    sessao,
    { acao: 'jogadores.limpeza', alvo: 'todos', depois: { mantido: sessao.email }, motivo: 'Limpeza de todos os jogadores (menos o dono)', ip },
    async () => resumir(await limparJogadores({ io, donoUid: sessao.uid, executar: true }), true, sessao.email)
  );
  // as memórias do servidor: sanções, marcas de logout e correio guardam coisas dos jogadores que sumiram
  limparCacheDeSancoes();
  limparCacheDoCorreio();
  limparCacheRevogacao();
  return resumo;
}
