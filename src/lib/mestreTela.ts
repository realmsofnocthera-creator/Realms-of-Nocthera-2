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
    case 'sistema.manutencao':
      texto = `${(e.depois as { ativa?: boolean } | null | undefined)?.ativa ? 'Fechou o jogo para manutenção' : 'Reabriu o jogo'}`;
      break;
    case 'sistema.definir':
      texto = `${(e.depois as { ativo?: boolean } | null | undefined)?.ativo ? 'Ligou' : 'Desligou'} o sistema ${alvo.split(':')[1] ?? alvo}`;
      break;
    case 'campanha.cena-abertura':
      texto = `Cena de abertura da Campanha: ${(e.depois as { aberturaCenaId?: string } | null | undefined)?.aberturaCenaId || '(nenhuma)'}`;
      break;
    case 'campanha.mapa-inicial':
      texto = `Mapa inicial da Campanha: ${(e.depois as { mapaInicial?: string } | null | undefined)?.mapaInicial || '(nenhum)'}`;
      break;
    case 'jogador.exportar':
      texto = `Exportou os dados de ${alvo}`;
      break;
    case 'chat.apagar':
      texto = `Apagou uma mensagem de ${alvo} no chat (${(e.antes as { canal?: string } | null | undefined)?.canal ?? '?'})`;
      break;
    case 'chat.silenciar':
      texto = `Silenciou ${alvo} no chat${(e.depois as { duracao?: string } | null | undefined)?.duracao ? ` por ${(e.depois as { duracao?: string }).duracao}` : ''}`;
      break;
    case 'chat.tirarSilencio':
      texto = `Levantou o silêncio de ${alvo} no chat`;
      break;
    case 'guilda.renomear':
      texto = `Renomeou a guilda ${(e.antes as { nome?: string } | null | undefined)?.nome ?? alvo} para ${(e.depois as { nome?: string } | null | undefined)?.nome ?? '?'}`;
      break;
    case 'guilda.apagarDescricao':
      texto = `Apagou a descrição da guilda ${(e.antes as { nome?: string } | null | undefined)?.nome ?? alvo}`;
      break;
    case 'guilda.dissolver':
      texto = `Dissolveu a guilda ${(e.antes as { nome?: string } | null | undefined)?.nome ?? alvo}`;
      break;
    case 'compra.estornar':
      texto = `Estornou um pedido de ${alvo}`;
      break;
    case 'jogador.zerar':
      texto = `Zerou a progressão de ${alvo}`;
      break;
    case 'jogador.excluir':
      texto = `Excluiu o jogador ${alvo}`;
      break;
    case 'jogador.desbanir':
      texto = `Levantou a sanção de ${alvo}`;
      break;
    case 'tileset.imagem':
      texto = `Enviou uma imagem de tileset (${alvo})`;
      break;
    case 'cena.imagem':
      texto = `Enviou uma imagem de cena (${alvo})`;
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
