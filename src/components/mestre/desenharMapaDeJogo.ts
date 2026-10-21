import { tileDoValor, type MapaDados } from '@/rules/mapa';
import { recorteDoTile, type TilesetDados } from '@/rules/tileset';
import { ehObjetoDeArea, LETRA_DO_OBJETO } from '@/rules/objetosDoMapa';
import type { EstadoDeJogo } from '@/lib/jogarMapa';
import { COR_DO_OBJETO } from '@/components/mestre/PainelDeObjetos';

export interface MapaParaDesenhar {
  mapa: MapaDados;
  /** Na ordem de `mapa.tilesets`; null/ausente: o tile não é desenhado. */
  tilesets: ({ dados: TilesetDados; imagem: HTMLImageElement } | null | undefined)[];
}

/**
 * Desenha o mapa do jogo (o teste do painel e a Campanha): câmera centrada no jogador, camadas de chão e objetos,
 * marcadores dos objetos interativos e o jogador.
 */
export function desenharMapaDeJogo(
  ctx: CanvasRenderingContext2D,
  aberto: MapaParaDesenhar,
  jogo: Pick<EstadoDeJogo, 'x' | 'y' | 'olhando' | 'abertos'>,
  largura: number,
  altura: number,
  lado: number,
  opcoes: { mostrarColisao?: boolean } = {}
) {
  const { mapa, tilesets } = aberto;
  ctx.fillStyle = '#0B0A09';
  ctx.fillRect(0, 0, largura, altura);
  // câmera centrada no jogador, sem sair do mapa quando o mapa é maior que a tela
  const ox = mapa.largura * lado <= largura ? -(largura - mapa.largura * lado) / 2 : Math.min(Math.max((jogo.x + 0.5) * lado - largura / 2, 0), mapa.largura * lado - largura);
  const oy = mapa.altura * lado <= altura ? -(altura - mapa.altura * lado) / 2 : Math.min(Math.max((jogo.y + 0.5) * lado - altura / 2, 0), mapa.altura * lado - altura);
  ctx.fillStyle = '#1A1612';
  ctx.fillRect(-ox, -oy, mapa.largura * lado, mapa.altura * lado);
  ctx.imageSmoothingEnabled = false;

  const desenharCamada = (c: 'chao' | 'objetos' | 'acima') => {
    const lista = mapa.camadas[c];
    if (!lista) return;
    // só as células que aparecem na tela (mapas grandes têm dezenas de milhares)
    const x0 = Math.max(0, Math.floor(ox / lado));
    const y0 = Math.max(0, Math.floor(oy / lado));
    const x1 = Math.min(mapa.largura - 1, Math.floor((ox + largura) / lado));
    const y1 = Math.min(mapa.altura - 1, Math.floor((oy + altura) / lado));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const valor = lista[y * mapa.largura + x];
        if (!valor) continue;
        const t = tileDoValor(valor);
        const ts = t ? tilesets[t.tileset] ?? undefined : undefined;
        if (!t || !ts || t.tile >= ts.dados.colunas * ts.dados.linhas) continue;
        const r = recorteDoTile(ts.dados, t.tile);
        ctx.drawImage(ts.imagem, r.x, r.y, r.lado, r.lado, x * lado - ox, y * lado - oy, lado, lado);
      }
    }
  };
  desenharCamada('chao');
  desenharCamada('objetos');
  // colisão em vermelho fraco: só no teste do painel, para mostrar onde não dá para passar
  if (opcoes.mostrarColisao) {
    ctx.fillStyle = 'rgba(229, 115, 107, 0.28)';
    for (let y = 0; y < mapa.altura; y++) for (let x = 0; x < mapa.largura; x++) if (mapa.camadas.colisao[y * mapa.largura + x]) ctx.fillRect(x * lado - ox, y * lado - oy, lado, lado);
  }

  for (const o of mapa.objetos) {
    const cor = COR_DO_OBJETO[o.tipo];
    const x = o.x * lado - ox;
    const y = o.y * lado - oy;
    if (o.tipo === 'inicio') continue;
    if (ehObjetoDeArea(o.tipo)) {
      ctx.fillStyle = `${cor}26`;
      ctx.fillRect(x, y, (o.largura ?? 1) * lado, (o.altura ?? 1) * lado);
      ctx.strokeStyle = cor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + 0.5, y + 0.5, (o.largura ?? 1) * lado - 1, (o.altura ?? 1) * lado - 1);
      ctx.setLineDash([]);
      continue;
    }
    ctx.fillStyle = o.tipo === 'bau' && jogo.abertos.includes(o.id) ? `${cor}66` : `${cor}DD`;
    ctx.fillRect(x + 3, y + 3, lado - 6, lado - 6);
    ctx.fillStyle = '#0D0D0D';
    ctx.font = `bold ${Math.max(10, Math.floor(lado * 0.45))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LETRA_DO_OBJETO[o.tipo], x + lado / 2, y + lado / 2);
  }

  // jogador: círculo dourado com uma ponta para onde olha
  const px = jogo.x * lado - ox + lado / 2;
  const py = jogo.y * lado - oy + lado / 2;
  ctx.fillStyle = '#F5E3B3';
  ctx.strokeStyle = '#0D0D0D';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, lado * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const d = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] }[jogo.olhando];
  ctx.fillStyle = '#C8A656';
  ctx.beginPath();
  ctx.arc(px + d[0] * lado * 0.3, py + d[1] * lado * 0.3, lado * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // por cima do jogador: copas de árvore, telhados, pontes
  desenharCamada('acima');
}
