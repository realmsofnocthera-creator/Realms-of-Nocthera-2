import { NOME_DO_PAPEL, ehPapelMestre } from '@/rules/mestre';
import type { EntradaLogAdmin } from '@/server/persistencia';

/** Textos do painel do Mestre (sem React). */

const nomeDoPapel = (v: unknown): string => {
  if (v === null || v === undefined) return 'nenhum';
  return ehPapelMestre(v) ? NOME_DO_PAPEL[v] : String(v);
};

const papelDe = (v: unknown): unknown => (v && typeof v === 'object' ? (v as { papel?: unknown }).papel : undefined);

const numeroDe = (v: unknown, campo: string): string => {
  const n = v && typeof v === 'object' ? (v as Record<string, unknown>)[campo] : undefined;
  return typeof n === 'number' ? String(n) : '?';
};

const diasDe = (v: unknown): string => {
  const n = v && typeof v === 'object' ? (v as Record<string, unknown>).dias : undefined;
  return typeof n === 'number' ? ` por ${n} dia${n === 1 ? '' : 's'}` : '';
};

/** Uma frase que descreve o que o registro do log diz que foi feito. */
export function descreverAcao(e: Pick<EntradaLogAdmin, 'acao' | 'alvo' | 'antes' | 'depois'>): string {
  const alvo = e.alvo ?? 'jogador';
  const falhou = e.acao.endsWith('.falhou');
  const base = falhou ? e.acao.slice(0, -'.falhou'.length) : e.acao;
  let texto: string;
  switch (base) {
    case 'papel.conceder':
      texto = `Papel de ${alvo}: ${nomeDoPapel(papelDe(e.antes))} → ${nomeDoPapel(papelDe(e.depois))}`;
      break;
    case 'papel.revogar':
      texto = `Papel de ${alvo} removido (era ${nomeDoPapel(papelDe(e.antes))})`;
      break;
    case 'jogador.consultar':
      texto = `Consultou a ficha de ${alvo}`;
      break;
    case 'jogador.advertir':
      texto = `Advertiu ${alvo}`;
      break;
    case 'jogador.suspender':
      texto = `Suspendeu ${alvo}${diasDe(e.depois)}`;
      break;
    case 'jogador.banir':
      texto = `Baniu ${alvo}`;
      break;
    case 'jogador.ajustar':
      texto = `Ajustou ${alvo}: ${resumoDoAjuste(e.depois)}`;
      break;
    case 'jogador.desbanir':
      texto = `Levantou a sanção de ${alvo}`;
      break;
    case 'conteudo.criar':
      texto = `Criou ${alvo} (rascunho)`;
      break;
    case 'conteudo.rascunho':
      texto = `Salvou o rascunho de ${alvo}`;
      break;
    case 'conteudo.publicar':
      texto = `Publicou ${alvo}: versão ${numeroDe(e.depois, 'versaoPublicada')}`;
      break;
    case 'conteudo.reverter':
      texto = `Voltou ${alvo} para a versão ${numeroDe(e.depois, 'revertidaDe')} (nova versão ${numeroDe(e.depois, 'versaoPublicada')})`;
      break;
    default:
      texto = e.alvo ? `${base} em ${e.alvo}` : base;
  }
  return falhou ? `Falhou: ${texto}` : texto;
}

/** Data e hora em português do Brasil, no fuso de Brasília. */
export function dataDoLog(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

function resumoDoAjuste(depois: unknown): string {
  if (!depois || typeof depois !== 'object') return 'sem detalhes';
  const partes = Object.entries(depois as Record<string, unknown>).map(([k, v]) => `${k.replace('material:', '')} ${typeof v === 'number' && v > 0 ? '+' : ''}${String(v)}`);
  return partes.join(', ') || 'sem detalhes';
}
