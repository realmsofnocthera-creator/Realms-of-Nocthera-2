import { recompensasParaResgatar, type RecompensaDoVip } from '@/rules/vipRecompensas';
import { comTitulos } from '@/rules/titulos';
import { carregarPersonagem, salvarPersonagem } from '@/server/characterService';
import { repositorio } from '@/server/persistencia';

/**
 * O baú da tela VIP: resgata as recompensas de aparência dos níveis que o jogador tem (títulos, que abrem as molduras junto). Uma só gravação no
 * personagem. Sem nada para resgatar, é erro 400 (e nada é gravado).
 */
export class ErroDoVip extends Error {
  readonly status = 400;
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDoVip';
  }
}

export interface ResultadoDoResgateVip {
  mensagem: string;
  resgatados: string[];
  vipResgatados: string[];
  titulos: string[];
}

export async function resgatarRecompensasDoVip(uid: string): Promise<ResultadoDoResgateVip> {
  return repositorio.executarTransacao('vip:resgatar', async (ctx) => {
    const eu = await carregarPersonagem(ctx, uid);
    const lista: RecompensaDoVip[] = recompensasParaResgatar(eu);
    if (!lista.length) throw new ErroDoVip('Não há recompensas do VIP para resgatar agora.');
    const titulos = comTitulos(eu.titulos, lista.flatMap((x) => (x.entrega ? [x.entrega.titulo] : [])));
    const vipResgatados = [...new Set([...(eu.vipResgatados ?? []), ...lista.map((x) => x.id)])];
    salvarPersonagem(ctx, eu, { titulos, vipResgatados });
    return {
      mensagem: lista.length === 1 ? `Você resgatou: ${lista[0].nome}.` : `Você resgatou ${lista.length} recompensas do VIP.`,
      resgatados: lista.map((x) => x.id),
      vipResgatados,
      titulos,
    };
  });
}
