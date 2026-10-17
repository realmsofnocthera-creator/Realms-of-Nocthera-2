import { validarArma, type ArmaDados } from '@/rules/armaConteudo';
import { validarArmadura, type ArmaduraDados } from '@/rules/armaduraConteudo';
import { validarEmblema, type EmblemaDados } from '@/rules/emblemaConteudo';
import { aplicarArmadurasPublicadas, aplicarArmasPublicadas, aplicarEmblemasPublicados } from '@/rules/catalogoAoVivo';

type Lista = { id: string; dados: unknown }[];

async function buscar(tipo: string, token: string): Promise<Lista> {
  try {
    const res = await fetch(`/api/conteudo/${tipo}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return ((await res.json()) as { itens?: Lista }).itens ?? [];
  } catch {
    return [];
  }
}

function validos<T>(lista: Lista, validar: (b: unknown) => { ok: true; dados: T } | { ok: false }): Map<string, T> {
  const mapa = new Map<string, T>();
  for (const item of lista) {
    const v = validar(item.dados);
    if (v.ok) mapa.set(item.id, v.dados);
  }
  return mapa;
}

/**
 * Catálogo de itens editado no painel, no navegador (3.5.2.1): busca o publicado e aplica por cima do código, para
 * a Forja, as fichas e os emblemas mostrarem os mesmos nomes e receitas que o servidor cobra. Se falhar, fica o do
 * código. Devolve true se havia algo publicado (a tela deve se redesenhar).
 */
export async function carregarCatalogoPublicado(token: string): Promise<boolean> {
  const [brutasArmas, brutasPecas, brutosEmblemas] = await Promise.all([buscar('arma', token), buscar('armadura', token), buscar('emblema', token)]);
  const armas = validos<ArmaDados>(brutasArmas, validarArma);
  const pecas = validos<ArmaduraDados>(brutasPecas, validarArmadura);
  const emblemas = validos<EmblemaDados>(brutosEmblemas, validarEmblema);
  if (armas.size + pecas.size + emblemas.size === 0) return false;
  aplicarArmasPublicadas(armas);
  aplicarArmadurasPublicadas(pecas);
  aplicarEmblemasPublicados(emblemas);
  return true;
}
