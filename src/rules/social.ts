/**
 * Social (Etapa 7.1): Buscar e Ranking. O ranking é um retrato (snapshot) guardado no banco e renovado de tempos em
 * tempos: ver quem aparece, quanto custa e como se esconde em server/social.ts. Cada jogador escolhe se aparece no
 * Ranking e na Busca (padrão: aparece).
 */
export const CRITERIOS_DE_RANKING = ['nivel', 'torre', 'batalha', 'guerreiro'] as const;
export type CriterioDeRanking = (typeof CRITERIOS_DE_RANKING)[number];

export const NOME_DO_RANKING: Readonly<Record<CriterioDeRanking, string>> = {
  nivel: 'Nível',
  torre: 'Torre Celestial',
  batalha: 'Batalha Sangrenta',
  guerreiro: 'Guerreiro',
};

export const EXPLICACAO_DO_RANKING: Readonly<Record<CriterioDeRanking, string>> = {
  nivel: 'Os personagens de nível mais alto.',
  torre: 'O andar mais alto já vencido na Torre Celestial.',
  batalha: 'Quantas dificuldades da Batalha Sangrenta já foram vencidas.',
  guerreiro: 'Quantas dificuldades da Provação do Guerreiro já foram vencidas.',
};

/** A unidade do valor, para escrever ao lado do número ("12 andares"). */
export const UNIDADE_DO_RANKING: Readonly<Record<CriterioDeRanking, readonly [string, string]>> = {
  nivel: ['nível', 'nível'],
  torre: ['andar', 'andares'],
  batalha: ['dificuldade', 'dificuldades'],
  guerreiro: ['dificuldade', 'dificuldades'],
};

/** Cada ranking ordena por um campo do documento do personagem (os dois últimos são contadores guardados junto). */
export type CampoDoRanking = 'nivel' | 'torreAndar' | 'vitoriasBatalha' | 'vitoriasGuerreiro';
export const CAMPO_DO_RANKING: Readonly<Record<CriterioDeRanking, CampoDoRanking>> = {
  nivel: 'nivel',
  torre: 'torreAndar',
  batalha: 'vitoriasBatalha',
  guerreiro: 'vitoriasGuerreiro',
};

export const TAMANHO_DO_RANKING = 100;
/** Quantos personagens se lêem do banco para montar o ranking (sobra para os escondidos que saem). */
export const LEITURA_DO_RANKING = 150;
/** O retrato do ranking vale este tempo; depois disso, quem abrir o ranking o renova. */
export const VALIDADE_DO_RANKING_MS = 30 * 60_000;

export const PREFIXO_MINIMO_DA_BUSCA = 2;
export const PREFIXO_MAXIMO_DA_BUSCA = 24;
export const LIMITE_DA_BUSCA = 10;
/** Quantos personagens se lêem do banco para uma busca (sobra para os escondidos que saem). */
export const LEITURA_DA_BUSCA = 20;

export const ehCriterioDeRanking = (v: unknown): v is CriterioDeRanking => typeof v === 'string' && (CRITERIOS_DE_RANKING as readonly string[]).includes(v);

/** O texto que se procura: sem espaços nas pontas e em minúsculas (igual ao campo `nomeBusca` do personagem). */
export const chaveDeBusca = (texto: string) => texto.trim().toLowerCase();

/** Um personagem no ranking. Sem o identificador (uid): o ranking só mostra o que é público. */
export interface EntradaDoRanking {
  posicao: number;
  nome: string;
  avatarId: string;
  classeId: string;
  racaId: string;
  nivel: number;
  /** O que o ranking mede (nível, andar, dificuldades vencidas). */
  valor: number;
}

export interface RankingGuardado {
  criterio: CriterioDeRanking;
  atualizadoEm: string;
  entradas: EntradaDoRanking[];
}

/** O que o servidor lê do banco para montar ranking e busca (sem nada além do público). */
export interface ResumoDePersonagem {
  nome: string;
  avatarId: string;
  classeId: string;
  racaId: string;
  nivel: number;
  xpAtual: number;
  /** O valor do campo do ranking, quando a consulta é de ranking. */
  valor?: number;
  escondidoNoRanking?: boolean;
  escondidoNaBusca?: boolean;
}

/** O valor do personagem em cada ranking, ou undefined se ele não entra (ainda não venceu nada ali). */
export function valorNoRanking(
  c: { nivel: number; torreAndar?: number; batalhaSangrentaVencidas?: readonly string[]; guerreiroVencidas?: readonly number[] },
  criterio: CriterioDeRanking
): number | undefined {
  switch (criterio) {
    case 'nivel':
      return c.nivel;
    case 'torre':
      return c.torreAndar && c.torreAndar > 0 ? c.torreAndar : undefined;
    case 'batalha':
      return c.batalhaSangrentaVencidas?.length ? c.batalhaSangrentaVencidas.length : undefined;
    case 'guerreiro':
      return c.guerreiroVencidas?.length ? c.guerreiroVencidas.length : undefined;
  }
}

/**
 * Monta as posições a partir do que veio do banco (do maior para o menor valor): tira os escondidos, desempata pelo
 * nível e depois pelo XP e corta no tamanho do ranking. Empatados no mesmo valor, nível e XP ficam na mesma posição.
 */
export function montarRanking(lidos: readonly ResumoDePersonagem[], tamanho = TAMANHO_DO_RANKING): EntradaDoRanking[] {
  const visiveis = lidos.filter((c) => !c.escondidoNoRanking && typeof c.valor === 'number');
  visiveis.sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0) || b.nivel - a.nivel || b.xpAtual - a.xpAtual || a.nome.localeCompare(b.nome, 'pt-BR'));
  const entradas: EntradaDoRanking[] = [];
  let anterior: ResumoDePersonagem | undefined;
  let posicao = 0;
  visiveis.slice(0, tamanho).forEach((c, i) => {
    const empate = anterior && c.valor === anterior.valor && c.nivel === anterior.nivel && c.xpAtual === anterior.xpAtual;
    if (!empate) posicao = i + 1;
    anterior = c;
    entradas.push({ posicao, nome: c.nome, avatarId: c.avatarId, classeId: c.classeId, racaId: c.racaId, nivel: c.nivel, valor: c.valor ?? 0 });
  });
  return entradas;
}
