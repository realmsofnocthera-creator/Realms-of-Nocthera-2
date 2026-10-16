import { monstroComDados, validarMonstro } from '@/rules/monstroConteudo';
import type { MonsterDefinition } from '@/rules/monsters';
import { lerConteudoPublicado } from '@/server/conteudo';

/**
 * Monstros do banco na hora da luta (3.5.2.1): o código é a base e o conteúdo publicado do tipo "monstro"
 * (mesmo id) vale por cima. Sem nada publicado, a luta é exatamente a do código.
 * Torre Celestial e Provação do Guerreiro saem de fórmula e não passam por aqui.
 */
export class ErroMonstroIndisponivel extends Error {
  constructor(nome: string) {
    super(`${nome} está indisponível no momento.`);
    this.name = 'ErroMonstroIndisponivel';
  }
}

/**
 * O monstro efetivo. `base` é a definição do código (ou undefined para um monstro que só existe no banco).
 * Devolve null se não existe em lugar nenhum; lança ErroMonstroIndisponivel se foi desativado.
 */
export async function monstroEfetivo(id: string, base: MonsterDefinition | undefined): Promise<MonsterDefinition | null> {
  const publicado = await lerConteudoPublicado('monstro', id);
  if (!publicado) return base ?? null;
  const v = validarMonstro(publicado.dados);
  if (!v.ok) return base ?? null; // dado corrompido nunca derruba a luta: vale o código
  if (!v.dados.ativo) throw new ErroMonstroIndisponivel(v.dados.nome);
  return monstroComDados(id, v.dados, base);
}
