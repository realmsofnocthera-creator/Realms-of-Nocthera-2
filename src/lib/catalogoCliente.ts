import { validarArma, type ArmaDados } from '@/rules/armaConteudo';
import { aplicarArmasPublicadas } from '@/rules/catalogoAoVivo';

/**
 * Catálogo de itens editado no painel, no navegador (3.5.2.1): busca o publicado e aplica por cima do código, para
 * a Forja e as fichas mostrarem os mesmos nomes e receitas que o servidor cobra. Se falhar, fica o do código.
 * Devolve true se havia algo publicado (a tela deve se redesenhar).
 */
export async function carregarCatalogoPublicado(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/conteudo/arma', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return false;
    const { itens } = (await res.json()) as { itens?: { id: string; dados: unknown }[] };
    const armas = new Map<string, ArmaDados>();
    for (const item of itens ?? []) {
      const v = validarArma(item.dados);
      if (v.ok) armas.set(item.id, v.dados);
    }
    if (armas.size === 0) return false;
    aplicarArmasPublicadas(armas);
    return true;
  } catch {
    return false;
  }
}
