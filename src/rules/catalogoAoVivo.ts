import type { ArmaBase } from '@/rules/armas';
import { ARMAS_BASE, ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { armaComDados, type ArmaDados } from '@/rules/armaConteudo';
import type { PecaArmadura } from '@/rules/armaduras';
import { PECAS_ARMADURA, PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { pecaComDados, type ArmaduraDados } from '@/rules/armaduraConteudo';
import { TIPO_EMBLEMA_MAP, TIPOS_EMBLEMA, type TipoEmblema } from '@/rules/emblemasCatalogo';
import { tipoComDados, type EmblemaDados } from '@/rules/emblemaConteudo';

/**
 * Catálogo de itens "ao vivo" (3.5.2.1): o código é a base e o conteúdo publicado no banco vale por cima.
 * Os mapas do catálogo (ARMAS_BASE_MAP etc.) são lidos em muitos lugares, no servidor e na tela, então a camada
 * publicada é aplicada NO LUGAR deles: cada aplicação parte sempre das cópias originais, então repetir é seguro
 * e o que deixou de estar publicado volta ao do código.
 */
const ORIGINAIS_DAS_ARMAS: ReadonlyMap<string, ArmaBase> = new Map(ARMAS_BASE.map((a) => [a.id, a]));
const ORIGINAIS_DAS_PECAS: ReadonlyMap<string, PecaArmadura> = new Map(PECAS_ARMADURA.map((p) => [p.id, p]));
const ORIGINAIS_DOS_EMBLEMAS: ReadonlyMap<string, TipoEmblema> = new Map(TIPOS_EMBLEMA.map((t) => [t.id, t]));
const ARMAS_DESATIVADAS = new Set<string>();
const PECAS_DESATIVADAS = new Set<string>();

/** A arma base como está no código (sem a camada publicada): ponto de partida do editor. */
export function armaOriginal(id: string): ArmaBase | undefined {
  return ORIGINAIS_DAS_ARMAS.get(id);
}
export function pecaOriginal(id: string): PecaArmadura | undefined {
  return ORIGINAIS_DAS_PECAS.get(id);
}
export function emblemaOriginal(id: string): TipoEmblema | undefined {
  return ORIGINAIS_DOS_EMBLEMAS.get(id);
}

/** A arma/peça foi desativada no painel: não dá mais para fabricá-la (quem já tem continua com ela). */
export function armaDesativada(id: string): boolean {
  return ARMAS_DESATIVADAS.has(id);
}
export function pecaDesativada(id: string): boolean {
  return PECAS_DESATIVADAS.has(id);
}

function aplicar<T extends { id: string }, D>(
  lista: T[],
  mapa: Record<string, T>,
  originais: ReadonlyMap<string, T>,
  publicadas: ReadonlyMap<string, D>,
  combinar: (base: T, dados: D) => T,
  aoAplicar?: (id: string, dados: D) => void
): void {
  lista.forEach((_, i) => {
    const original = originais.get(lista[i].id)!;
    const dados = publicadas.get(original.id);
    const efetiva = dados ? combinar(original, dados) : original;
    lista[i] = efetiva;
    mapa[original.id] = efetiva;
    if (dados) aoAplicar?.(original.id, dados);
  });
}

/** Aplica as armas publicadas (id → dados). Ids que não existem no código são ignorados. */
export function aplicarArmasPublicadas(publicadas: ReadonlyMap<string, ArmaDados>): void {
  ARMAS_DESATIVADAS.clear();
  aplicar(ARMAS_BASE as ArmaBase[], ARMAS_BASE_MAP as Record<string, ArmaBase>, ORIGINAIS_DAS_ARMAS, publicadas, armaComDados, (id, d) => {
    if (!d.ativo) ARMAS_DESATIVADAS.add(id);
  });
}

export function aplicarArmadurasPublicadas(publicadas: ReadonlyMap<string, ArmaduraDados>): void {
  PECAS_DESATIVADAS.clear();
  aplicar(PECAS_ARMADURA as PecaArmadura[], PECAS_ARMADURA_MAP as Record<string, PecaArmadura>, ORIGINAIS_DAS_PECAS, publicadas, pecaComDados, (id, d) => {
    if (!d.ativo) PECAS_DESATIVADAS.add(id);
  });
}

export function aplicarEmblemasPublicados(publicadas: ReadonlyMap<string, EmblemaDados>): void {
  aplicar(TIPOS_EMBLEMA as TipoEmblema[], TIPO_EMBLEMA_MAP as Record<string, TipoEmblema>, ORIGINAIS_DOS_EMBLEMAS, publicadas, tipoComDados);
}
