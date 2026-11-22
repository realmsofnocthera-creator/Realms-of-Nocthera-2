import { CAPITULO_MAP, CAPITULOS_DO_TUTORIAL, type CapituloDoTutorial, type PassoDoTutorial } from '@/rules/tutorial';

/**
 * O progresso do tutorial fica no aparelho (localStorage, por personagem): nada é lido nem gravado no servidor. Em outro aparelho, o tutorial
 * recomeça (dá para pular tudo com um toque).
 */
export interface ProgressoDoTutorial {
  pulouTudo: boolean;
  feitos: string[];
  /** O capítulo em andamento e o passo. */
  atual: { id: string; passo: number } | null;
}

export const PROGRESSO_VAZIO: ProgressoDoTutorial = { pulouTudo: false, feitos: [], atual: null };
export const chaveDoTutorial = (uid: string) => `nocthera:tutorial:${uid}`;

export function lerProgresso(uid: string): ProgressoDoTutorial {
  try {
    const bruto = JSON.parse(window.localStorage.getItem(chaveDoTutorial(uid)) ?? 'null') as Partial<ProgressoDoTutorial> | null;
    if (!bruto || typeof bruto !== 'object') return PROGRESSO_VAZIO;
    const atual = bruto.atual && typeof bruto.atual.id === 'string' && typeof bruto.atual.passo === 'number' && CAPITULO_MAP[bruto.atual.id] ? bruto.atual : null;
    return { pulouTudo: bruto.pulouTudo === true, feitos: Array.isArray(bruto.feitos) ? bruto.feitos.filter((f): f is string => typeof f === 'string') : [], atual };
  } catch {
    return PROGRESSO_VAZIO;
  }
}

export function gravarProgresso(uid: string, p: ProgressoDoTutorial): void {
  try {
    window.localStorage.setItem(chaveDoTutorial(uid), JSON.stringify(p));
  } catch {
    /* sem armazenamento: o tutorial segue só nesta sessão */
  }
}

/** A rota do passo combina com a tela em que o jogador está? */
export const rotaCombina = (rota: string, caminho: string) => rota === '*' || caminho === rota || caminho.startsWith(`${rota}/`);

/**
 * O capítulo e o passo para mostrar agora: o de contexto que está na tela (a primeira luta), senão o em andamento, senão o primeiro da fila
 * (pelo nível) que ainda não foi feito. Devolve null se não há o que mostrar nesta tela.
 */
export function oQueMostrar(p: ProgressoDoTutorial, nivel: number, caminho: string, naTela: (alvo: string) => boolean): { capitulo: CapituloDoTutorial; passo: number; dado: PassoDoTutorial } | null {
  if (p.pulouTudo) return null;
  const pendente = (c: CapituloDoTutorial) => c.nivel <= nivel && !p.feitos.includes(c.id);
  const contexto = CAPITULOS_DO_TUTORIAL.find((c) => c.quando && pendente(c) && naTela(c.quando));
  if (contexto) {
    const passo = p.atual?.id === contexto.id ? p.atual.passo : 0;
    return { capitulo: contexto, passo, dado: contexto.passos[passo] };
  }
  const emAndamento = p.atual && CAPITULO_MAP[p.atual.id] && pendente(CAPITULO_MAP[p.atual.id]) && !CAPITULO_MAP[p.atual.id].quando ? p.atual : null;
  const capitulo = emAndamento ? CAPITULO_MAP[emAndamento.id] : CAPITULOS_DO_TUTORIAL.find((c) => !c.quando && pendente(c));
  if (!capitulo) return null;
  const passo = emAndamento ? Math.min(emAndamento.passo, capitulo.passos.length - 1) : 0;
  const dado = capitulo.passos[passo];
  return rotaCombina(dado.rota, caminho) ? { capitulo, passo, dado } : null;
}

/** Vai ao passo seguinte (ou fecha o capítulo no último). */
export function avancar(p: ProgressoDoTutorial, id: string, passo: number): ProgressoDoTutorial {
  const c = CAPITULO_MAP[id];
  if (!c) return p;
  if (passo + 1 >= c.passos.length) return pularCapitulo(p, id);
  return { ...p, atual: { id, passo: passo + 1 } };
}

export function pularCapitulo(p: ProgressoDoTutorial, id: string): ProgressoDoTutorial {
  return { ...p, feitos: p.feitos.includes(id) ? p.feitos : [...p.feitos, id], atual: p.atual?.id === id ? null : p.atual };
}

export const pularTudo = (p: ProgressoDoTutorial): ProgressoDoTutorial => ({ ...p, pulouTudo: true, atual: null });
export const recomecar = (): ProgressoDoTutorial => PROGRESSO_VAZIO;
