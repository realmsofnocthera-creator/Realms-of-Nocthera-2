import type { EntradaDeRevisao } from '@/rules/integridade';
import { comRegistro, ErroMestre, exigir, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';

/**
 * Fila de revisão do Painel do Mestre (6.5-4): os sinais de anomalia ainda não revisados. Ver a fila é ver jogadores;
 * marcar como revisado é de quem pode sancionar, e fica no log.
 */

export const LIMITE_DA_FILA = 100;
const ID_DA_REVISAO = /^[A-Za-z0-9_-]{1,128}__\d{4}-\d{2}-\d{2}T\d{2}__[A-Za-z]{1,40}$/;

export async function filaDeRevisao(sessao: SessaoMestre): Promise<EntradaDeRevisao[]> {
  exigir(sessao, 'jogadores.ler');
  return repositorio.listarRevisoesPendentes(LIMITE_DA_FILA);
}

export async function marcarComoRevisadas(sessao: SessaoMestre, idsBrutos: unknown, ip?: string): Promise<{ marcadas: number; fila: EntradaDeRevisao[] }> {
  exigir(sessao, 'jogadores.sancionar');
  const ids = Array.isArray(idsBrutos) ? [...new Set(idsBrutos.filter((i): i is string => typeof i === 'string' && ID_DA_REVISAO.test(i)))] : [];
  if (!ids.length || ids.length > LIMITE_DA_FILA || ids.length !== (idsBrutos as unknown[]).length) throw new ErroMestre(400, 'Escolha as entradas da fila.');
  const marcadas = await comRegistro(sessao, { acao: 'revisao.marcar', alvo: ids.map((i) => i.split('__')[0]).join(','), depois: { ids }, ip }, () =>
    repositorio.marcarRevisoes(ids, sessao.uid, new Date().toISOString())
  );
  return { marcadas, fila: await repositorio.listarRevisoesPendentes(LIMITE_DA_FILA) };
}
