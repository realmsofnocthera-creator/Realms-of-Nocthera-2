import { validarMapa, type MapaDados } from '@/rules/mapa';
import { lerConteudoPublicado } from '@/server/conteudo';
import { lerConfiguracaoDeSistemas } from '@/server/sistemasLeitura';

/**
 * Leitura do mundo da Campanha (5.5): o jogo só vê mapas PUBLICADOS. Um mapa publicado que não passa no validador
 * (dado corrompido) conta como se não existisse, para nunca quebrar a tela do jogador.
 */
export class ErroDaCampanha extends Error {
  readonly status = 400;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDaCampanha';
  }
}

export interface MapaPublicado {
  id: string;
  nome: string;
  versao: number;
  dados: MapaDados;
}

export async function lerMapaPublicado(id: string): Promise<MapaPublicado | null> {
  const c = await lerConteudoPublicado('mapa', id);
  if (!c) return null;
  const v = validarMapa(c.dados);
  return v.ok ? { id: c.id, nome: c.nome, versao: c.versao, dados: v.dados } : null;
}

/** O mapa onde a Campanha começa (configurado pelo Dono no painel); '' se ainda não há. */
export async function mapaInicialDaCampanha(): Promise<string> {
  return (await lerConfiguracaoDeSistemas()).campanha.mapaInicial;
}
