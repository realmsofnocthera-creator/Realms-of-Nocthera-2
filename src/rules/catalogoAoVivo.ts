import type { ArmaBase } from '@/rules/armas';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { armaComDados, type ArmaDados } from '@/rules/armaConteudo';

/**
 * Catálogo de itens "ao vivo" (3.5.2.1): o código é a base e o conteúdo publicado no banco vale por cima.
 * Os mapas do catálogo (ARMAS_BASE_MAP etc.) são lidos em muitos lugares, no servidor e na tela, então a camada
 * publicada é aplicada NO LUGAR deles: cada aplicação parte sempre das cópias originais, então repetir é seguro
 * e o que deixou de estar publicado volta ao do código.
 */
const ORIGINAIS_DAS_ARMAS: ReadonlyMap<string, ArmaBase> = new Map(ARMAS_BASE.map((a) => [a.id, a]));
const DESATIVADAS = new Set<string>();

/** A arma base como está no código (sem a camada publicada): ponto de partida do editor. */
export function armaOriginal(id: string): ArmaBase | undefined {
  return ORIGINAIS_DAS_ARMAS.get(id);
}

/** A arma foi desativada no painel: não dá mais para fabricá-la (quem já tem continua com ela). */
export function armaDesativada(id: string): boolean {
  return DESATIVADAS.has(id);
}

/** Aplica as armas publicadas (id → dados). Ids que não existem no código são ignorados. */
export function aplicarArmasPublicadas(publicadas: ReadonlyMap<string, ArmaDados>): void {
  DESATIVADAS.clear();
  const lista = ARMAS_BASE as ArmaBase[];
  const mapa = ARMAS_BASE_MAP as Record<string, ArmaBase>;
  lista.forEach((_, i) => {
    const original = ORIGINAIS_DAS_ARMAS.get(lista[i].id)!;
    const dados = publicadas.get(original.id);
    const efetiva = dados ? armaComDados(original, dados) : original;
    lista[i] = efetiva;
    mapa[original.id] = efetiva;
    if (dados && !dados.ativo) DESATIVADAS.add(original.id);
  });
}
