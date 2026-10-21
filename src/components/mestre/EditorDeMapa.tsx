'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BoxSelect, Brush, Gamepad2, MapPinned, Eraser, Grid3x3, Hand, PaintBucket, Pipette, Plus, Redo2, Save, Slash, Square, Stamp, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { areaDoCarimbo, carimbar, copiarArea, espelharCarimbo, expandirPincel, girarCarimbo, origemDoCarimbo, pontosDoRetangulo, retanguloEntre, TAMANHOS_DO_PINCEL, type Carimbo, type TamanhoDoPincel } from '@/lib/carimbo';
import { apagarComBorda, pintarComBorda, regraDoValor, type RegrasDoMapa } from '@/lib/autoTile';
import { CAMADAS_DO_MAPA, MAXIMO_DE_TILESETS, NOME_DA_CAMADA, tileDoValor, valorDoTile, type CamadaDoMapa, type MapaDados } from '@/rules/mapa';
import { recorteDoTile, type TilesetDados } from '@/rules/tileset';
import {
  celulaDoPonto,
  copiarMapa,
  desfazer,
  historicoVazio,
  juntarMudancas,
  pintar,
  pontosDaLinha,
  preencher,
  refazer,
  registrar,
  valorDaFerramenta,
  type Ferramenta,
  type Historico,
  type Mudanca,
  type Ponto,
} from '@/lib/editorMapa';
import { atualizarObjeto, colocarObjeto, errosDosObjetos, moverObjeto, objetoNoPonto, removerObjeto } from '@/lib/objetosEditor';
import { ehObjetoDeArea, LETRA_DO_OBJETO, type ObjetoDoMapa, type TipoDeObjeto } from '@/rules/objetosDoMapa';
import { COR_DO_OBJETO, PainelDeObjetos } from '@/components/mestre/PainelDeObjetos';
import type { ConteudoDocumento, ResumoConteudo } from '@/server/persistencia/tipos';
import { NOCTHERA_THEME } from '@/theme/theme';
import { chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import { carregarTileset, type TilesetCarregado } from '@/components/mestre/carregarTileset';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

type Token = () => Promise<string>;

const ZOOM_MINIMO = 0.25;
const ZOOM_MAXIMO = 4;

const FERRAMENTAS: { id: Ferramenta; nome: string; atalho: string; icone: React.ReactNode }[] = [
  { id: 'pincel', nome: 'Pincel', atalho: 'B', icone: <Brush className="w-4 h-4" /> },
  { id: 'borracha', nome: 'Borracha', atalho: 'E', icone: <Eraser className="w-4 h-4" /> },
  { id: 'balde', nome: 'Preencher', atalho: 'G', icone: <PaintBucket className="w-4 h-4" /> },
  { id: 'retangulo', nome: 'Retângulo', atalho: 'R', icone: <Square className="w-4 h-4" /> },
  { id: 'linha', nome: 'Linha', atalho: 'L', icone: <Slash className="w-4 h-4" /> },
  { id: 'selecionar', nome: 'Selecionar e copiar', atalho: 'V', icone: <BoxSelect className="w-4 h-4" /> },
  { id: 'carimbo', nome: 'Carimbar', atalho: 'T', icone: <Stamp className="w-4 h-4" /> },
  { id: 'conta-gotas', nome: 'Pegar tile', atalho: 'I', icone: <Pipette className="w-4 h-4" /> },
  { id: 'mover', nome: 'Mover', atalho: 'H', icone: <Hand className="w-4 h-4" /> },
];

/** Marcadores dos objetos interativos por cima do mapa: quadrado com a letra do tipo; área de monstros em retângulo. */
function desenharObjetos(ctx: CanvasRenderingContext2D, objetos: readonly ObjetoDoMapa[], lado: number, ox: number, oy: number, selecionado: string | null) {
  for (const o of objetos) {
    const cor = COR_DO_OBJETO[o.tipo];
    const x = o.x * lado - ox;
    const y = o.y * lado - oy;
    if (ehObjetoDeArea(o.tipo)) {
      ctx.fillStyle = `${cor}33`;
      ctx.fillRect(x, y, (o.largura ?? 1) * lado, (o.altura ?? 1) * lado);
      ctx.strokeStyle = cor;
      ctx.lineWidth = o.id === selecionado ? 3 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x + 0.5, y + 0.5, (o.largura ?? 1) * lado - 1, (o.altura ?? 1) * lado - 1);
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = `${cor}CC`;
      ctx.fillRect(x + 2, y + 2, lado - 4, lado - 4);
      ctx.strokeStyle = o.id === selecionado ? '#FFFFFF' : '#0D0D0D';
      ctx.lineWidth = o.id === selecionado ? 3 : 1.5;
      ctx.strokeRect(x + 2, y + 2, lado - 4, lado - 4);
    }
    if (lado >= 14) {
      ctx.fillStyle = '#0D0D0D';
      ctx.font = `bold ${Math.max(10, Math.floor(lado * 0.5))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LETRA_DO_OBJETO[o.tipo], x + lado / 2, y + lado / 2);
    }
  }
}

/**
 * Editor de mapas 2D (3.5.6.2): camadas chão, objetos e colisão; pincel, borracha, preencher, pegar tile e mover;
 * desfazer e refazer; zoom e grade. O canvas tem o tamanho da tela e desenha só os tiles que aparecem (3.5.6.7),
 * o que mantém o editor leve no celular. Salvar grava o rascunho; publicar continua no painel.
 */
export function EditorDeMapa({ id, sessao, tokenFresco }: { id: string; sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const podeEditar = sessao.permissoes.includes('mapas.editar');

  const mapaRef = useRef<MapaDados | null>(null);
  const [nome, setNome] = useState('');
  const [revisao, setRevisao] = useState(0);
  const [carregado, setCarregado] = useState(false);
  const [tilesets, setTilesets] = useState<TilesetCarregado[]>([]);
  const [disponiveis, setDisponiveis] = useState<ResumoConteudo[]>([]);
  const [historico, setHistorico] = useState<Historico>(historicoVazio());
  const [camada, setCamada] = useState<CamadaDoMapa>('chao');
  const [ferramenta, setFerramenta] = useState<Ferramenta>(podeEditar ? 'pincel' : 'mover');
  const [tileEscolhido, setTileEscolhido] = useState(0);
  const [bordaAuto, setBordaAuto] = useState(true);
  const [tamanhoPincel, setTamanhoPincel] = useState<TamanhoDoPincel>(1);
  const [carimbo, setCarimbo] = useState<Carimbo | null>(null);
  /** Forma em andamento (retângulo, linha, seleção ou prévia do carimbo), desenhada por cima do mapa. */
  const forma = useRef<{ tipo: 'retangulo' | 'linha' | 'selecionar' | 'carimbo'; inicio: Ponto; fim: Ponto; valor: number } | null>(null);
  const [tilesetAtivo, setTilesetAtivo] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [grade, setGrade] = useState(true);
  const [mostrarColisao, setMostrarColisao] = useState(true);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [modo, setModo] = useState<'tiles' | 'objetos'>('tiles');
  const [tipoDeObjeto, setTipoDeObjeto] = useState<TipoDeObjeto>('npc');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [movendoObjeto, setMovendoObjeto] = useState(false);
  const [opcoes, setOpcoes] = useState<{ mapas: { id: string; nome: string }[]; cenas: { id: string; nome: string }[]; monstros: { id: string; nome: string }[]; materiais: { id: string; nome: string }[] }>({ mapas: [], cenas: [], monstros: [], materiais: [] });
  const [desenho, setDesenho] = useState(0);
  const redesenhar = useCallback(() => setDesenho((n) => n + 1), []);

  // ---- carregar ----
  useEffect(() => {
    let ativo = true;
    void (async () => {
      const r = await chamar(tokenFresco, `/api/mestre/conteudo/mapa/${id}`);
      if (!ativo) return;
      if (!r.ok) {
        setMensagem({ texto: String(r.dados.error ?? 'Não foi possível abrir o mapa.'), erro: true });
        return;
      }
      const conteudo = r.dados.conteudo as ConteudoDocumento;
      const mapa = copiarMapa(conteudo.rascunho as MapaDados);
      mapaRef.current = mapa;
      setNome(conteudo.nome);
      setRevisao(conteudo.revisao);
      try {
        const lista = await Promise.all(mapa.tilesets.map((t) => carregarTileset(tokenFresco, t)));
        if (ativo) setTilesets(lista);
      } catch (error) {
        if (ativo) setMensagem({ texto: error instanceof Error ? error.message : 'Falha ao abrir os tilesets.', erro: true });
      }
      const outros = await chamar(tokenFresco, '/api/mestre/conteudo?tipo=tileset');
      if (ativo && outros.ok) setDisponiveis(outros.dados.itens as ResumoConteudo[]);
      // opções dos objetos: mapas de destino, monstros (do código e do banco) e materiais dos baús
      const [mapasR, cenasR, monstrosR, cacada, monstrosCodigo, chefes, materiais, mundo] = await Promise.all([
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=mapa'),
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=cena'),
        chamar(tokenFresco, '/api/mestre/conteudo?tipo=monstro'),
        import('@/rules/cacada'),
        import('@/rules/monsters'),
        import('@/rules/chefesEspeciais'),
        import('@/rules/materiais'),
        import('@/rules/materiaisArmas'),
      ]);
      if (ativo) {
        const doBanco = monstrosR.ok ? (monstrosR.dados.itens as ResumoConteudo[]).map((m) => ({ id: m.id, nome: `${m.nome} (banco)` })) : [];
        const doCodigo = [...monstrosCodigo.MONSTERS, ...cacada.MONSTROS_CACADA, ...Object.values(chefes.CHEFES_ESPECIAIS_MAP)].map((m) => ({ id: m.id, nome: m.nome }));
        const ids = new Set(doCodigo.map((m) => m.id));
        setOpcoes({
          cenas: cenasR.ok ? (cenasR.dados.itens as ResumoConteudo[]).map((c) => ({ id: c.id, nome: c.nome })) : [],
          mapas: mapasR.ok ? (mapasR.dados.itens as ResumoConteudo[]).map((m) => ({ id: m.id, nome: m.nome })) : [],
          monstros: [...doCodigo, ...doBanco.filter((m) => !ids.has(m.id))].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
          materiais: [...materiais.MATERIAIS, ...mundo.MATERIAIS_MUNDO].map((m) => ({ id: m.id, nome: m.nome })),
        });
      }
      if (ativo) setCarregado(true);
    })();
    return () => {
      ativo = false;
    };
  }, [id, tokenFresco]);

  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sujo]);

  // ---- vista: deslocamento e tamanho do canvas ----
  const caixaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tamanho, setTamanho] = useState({ largura: 300, altura: 300 });
  const deslocamento = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const medir = () => setTamanho({ largura: caixa.clientWidth, altura: caixa.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [carregado]);

  const lado = (mapaRef.current?.tamanhoDoTile ?? 32) * zoom;

  // ---- desenhar ----
  useEffect(() => {
    const canvas = canvasRef.current;
    const mapa = mapaRef.current;
    if (!canvas || !mapa) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(tamanho.largura * dpr);
    canvas.height = Math.round(tamanho.altura * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0B0A09';
    ctx.fillRect(0, 0, tamanho.largura, tamanho.altura);

    const { x: ox, y: oy } = deslocamento.current;
    const x0 = Math.max(0, Math.floor(ox / lado));
    const y0 = Math.max(0, Math.floor(oy / lado));
    const x1 = Math.min(mapa.largura - 1, Math.floor((ox + tamanho.largura) / lado));
    const y1 = Math.min(mapa.altura - 1, Math.floor((oy + tamanho.altura) / lado));

    ctx.fillStyle = '#1A1612';
    ctx.fillRect(-ox, -oy, mapa.largura * lado, mapa.altura * lado);

    for (const c of ['chao', 'objetos', 'acima'] as const) {
      const lista = mapa.camadas[c] ?? [];
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const valor = lista[y * mapa.largura + x];
          if (!valor) continue;
          const t = tileDoValor(valor);
          const ts = t ? tilesets[t.tileset] : undefined;
          const dx = x * lado - ox;
          const dy = y * lado - oy;
          if (!t || !ts || t.tile >= ts.dados.colunas * ts.dados.linhas) {
            ctx.fillStyle = '#B03AAE';
            ctx.fillRect(dx, dy, lado, lado);
            continue;
          }
          const r = recorteDoTile(ts.dados, t.tile);
          ctx.drawImage(ts.imagem, r.x, r.y, r.lado, r.lado, dx, dy, lado, lado);
        }
      }
    }

    if (mostrarColisao || camada === 'colisao') {
      ctx.fillStyle = 'rgba(229, 115, 107, 0.45)';
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (mapa.camadas.colisao[y * mapa.largura + x]) ctx.fillRect(x * lado - ox, y * lado - oy, lado, lado);
        }
      }
    }

    if (grade && lado >= 6) {
      ctx.strokeStyle = 'rgba(200, 166, 86, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) {
        ctx.moveTo(x * lado - ox + 0.5, y0 * lado - oy);
        ctx.lineTo(x * lado - ox + 0.5, (y1 + 1) * lado - oy);
      }
      for (let y = y0; y <= y1 + 1; y++) {
        ctx.moveTo(x0 * lado - ox, y * lado - oy + 0.5);
        ctx.lineTo((x1 + 1) * lado - ox, y * lado - oy + 0.5);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 2;
    ctx.strokeRect(-ox, -oy, mapa.largura * lado, mapa.altura * lado);
    desenharObjetos(ctx, mapa.objetos, lado, ox, oy, modo === 'objetos' ? selecionado : null);

    // forma em andamento: retângulo, linha, seleção ou onde o carimbo vai ficar
    const f = forma.current;
    if (f && modo === 'tiles') {
      const celulas = f.tipo === 'linha' ? pontosDaLinha(f.inicio, f.fim) : f.tipo === 'carimbo' && carimbo ? pontosDoRetangulo(areaDoCarimbo(carimbo, origemDoCarimbo(carimbo, f.fim))) : pontosDoRetangulo(retanguloEntre(f.inicio, f.fim));
      const cor = f.tipo === 'selecionar' ? '#5AA7F0' : f.tipo === 'carimbo' ? '#C27BF0' : '#F5E3B3';
      ctx.fillStyle = `${cor}44`;
      ctx.strokeStyle = cor;
      ctx.lineWidth = 1.5;
      for (const c of celulas) {
        if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
        ctx.fillRect(c.x * lado - ox, c.y * lado - oy, lado, lado);
      }
      if (f.tipo !== 'linha') {
        const r = f.tipo === 'carimbo' && carimbo ? areaDoCarimbo(carimbo, origemDoCarimbo(carimbo, f.fim)) : retanguloEntre(f.inicio, f.fim);
        ctx.strokeRect(r.x * lado - ox + 0.5, r.y * lado - oy + 0.5, r.largura * lado - 1, r.altura * lado - 1);
      }
    }
  }, [desenho, tamanho, lado, tilesets, grade, mostrarColisao, camada, modo, selecionado, carimbo]);

  const limitarDeslocamento = useCallback(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const d = deslocamento.current;
    const folga = 64;
    d.x = Math.min(Math.max(d.x, -tamanho.largura + folga), mapa.largura * lado - folga);
    d.y = Math.min(Math.max(d.y, -tamanho.altura + folga), mapa.altura * lado - folga);
  }, [tamanho, lado]);

  const mudarZoom = useCallback(
    (fator: number) => {
      const novo = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, Math.round(zoom * fator * 100) / 100));
      // mantém o centro da tela no mesmo lugar do mapa
      const d = deslocamento.current;
      d.x = ((d.x + tamanho.largura / 2) * novo) / zoom - tamanho.largura / 2;
      d.y = ((d.y + tamanho.altura / 2) * novo) / zoom - tamanho.altura / 2;
      setZoom(novo);
      redesenhar();
    },
    [zoom, tamanho, redesenhar]
  );

  // ---- editar ----
  const traco = useRef<{ ultimo: Ponto; mudancas: Mudanca[]; movendo?: { x: number; y: number } } | null>(null);

  const guardar = useCallback(
    (mudancas: Mudanca[]) => {
      const juntas = juntarMudancas(mudancas);
      if (!juntas.length) return;
      setHistorico((h) => registrar(h, { camada, mudancas: juntas }));
      setSujo(true);
    },
    [camada]
  );

  // regras de borda automática dos tilesets do mapa, na ordem da lista do mapa
  const regras = useMemo<RegrasDoMapa>(() => tilesets.map((t) => t.dados.bordas), [tilesets]);
  const regraEscolhida = useMemo(() => (camada === 'colisao' ? null : regraDoValor(regras, tileEscolhido)), [regras, tileEscolhido, camada]);

  /** Pinta (ou apaga) pontos; com a borda automática ligada e um terreno com regra, acerta as bordas sozinho. */
  const pintarCom = (mapa: MapaDados, pontosBase: Ponto[], valor: number, usar: Ferramenta, comTamanho = true): Mudanca[] => {
    const pontos = comTamanho && (usar === 'pincel' || usar === 'borracha') ? expandirPincel(pontosBase, tamanhoPincel) : pontosBase;
    if (bordaAuto && camada !== 'colisao') {
      if (usar === 'pincel' && regraEscolhida) return pintarComBorda(mapa, camada, pontos, regraEscolhida, regras);
      if (usar === 'borracha') return apagarComBorda(mapa, camada, pontos, regras);
    }
    return pintar(mapa, camada, pontos, valor);
  };

  const pontoDoEvento = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { px: e.clientX - r.left + deslocamento.current.x, py: e.clientY - r.top + deslocamento.current.y, tx: e.clientX, ty: e.clientY };
  };

  const guardarObjetos = useCallback((lote: Parameters<typeof registrar>[1]) => {
    setHistorico((h) => registrar(h, lote));
    setSujo(true);
  }, []);

  /** Toque no modo dos objetos: mover o selecionado, selecionar o que estiver no tile ou colocar um novo. */
  const aoTocarNosObjetos = (mapa: MapaDados, celula: Ponto) => {
    setMensagem(null);
    if (movendoObjeto && selecionado && podeEditar) {
      const r = moverObjeto(mapa, selecionado, celula);
      if (r.ok) guardarObjetos(r.lote);
      else setMensagem({ texto: r.erro, erro: true });
      setMovendoObjeto(false);
      redesenhar();
      return;
    }
    const existente = objetoNoPonto(mapa, celula);
    if (existente) {
      setSelecionado(existente.id);
      redesenhar();
      return;
    }
    if (!podeEditar) return;
    const r = colocarObjeto(mapa, tipoDeObjeto, celula);
    if (r.ok) {
      guardarObjetos(r.lote);
      setSelecionado(r.objeto!.id);
    } else setMensagem({ texto: r.erro, erro: true });
    redesenhar();
  };

  const mudarObjeto = (campo: string, fn: (o: ObjetoDoMapa) => void) => {
    const mapa = mapaRef.current;
    if (!mapa || !selecionado || !podeEditar) return;
    const r = atualizarObjeto(mapa, selecionado, fn);
    if (r.ok) guardarObjetos({ ...r.lote, grupo: `${selecionado}:${campo}` });
    redesenhar();
  };

  const tirarObjeto = () => {
    const mapa = mapaRef.current;
    if (!mapa || !selecionado || !podeEditar) return;
    const r = removerObjeto(mapa, selecionado);
    if (r.ok) guardarObjetos(r.lote);
    setSelecionado(null);
    setMovendoObjeto(false);
    redesenhar();
  };

  const aoApertar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { px, py, tx, ty } = pontoDoEvento(e);
    const celula = celulaDoPonto(px, py, lado);
    const usar = ferramenta === 'mover' || (!podeEditar && modo !== 'objetos') || e.button === 1 ? 'mover' : ferramenta;

    if (modo === 'objetos' && usar !== 'mover') {
      aoTocarNosObjetos(mapa, celula);
      return;
    }
    if (usar === 'mover') {
      traco.current = { ultimo: celula, mudancas: [], movendo: { x: tx, y: ty } };
      return;
    }
    if (usar === 'conta-gotas') {
      if (camada !== 'colisao') {
        const valor = mapa.camadas[camada][celula.y * mapa.largura + celula.x];
        const t = valor ? tileDoValor(valor) : null;
        if (t) {
          setTileEscolhido(valor);
          setTilesetAtivo(t.tileset);
          setFerramenta('pincel');
        }
      }
      return;
    }
    if (usar === 'selecionar') {
      forma.current = { tipo: 'selecionar', inicio: celula, fim: celula, valor: 0 };
      traco.current = { ultimo: celula, mudancas: [] };
      setMensagem(null);
      redesenhar();
      return;
    }
    if (usar === 'carimbo') {
      if (!carimbo) {
        setMensagem({ texto: 'Primeiro selecione e copie uma área (ferramenta Selecionar).', erro: true });
        return;
      }
      forma.current = { tipo: 'carimbo', inicio: celula, fim: celula, valor: 0 };
      traco.current = { ultimo: celula, mudancas: [] };
      setMensagem(null);
      redesenhar();
      return;
    }
    const valor = valorDaFerramenta(usar, camada, tileEscolhido);
    if (valor === null) {
      setMensagem({ texto: 'Escolha um tile na paleta antes de pintar.', erro: true });
      return;
    }
    if (usar === 'retangulo' || usar === 'linha') {
      forma.current = { tipo: usar, inicio: celula, fim: celula, valor };
      traco.current = { ultimo: celula, mudancas: [] };
      redesenhar();
      return;
    }
    if (usar === 'balde') {
      guardar(preencher(mapa, camada, celula, valor));
      redesenhar();
      return;
    }
    traco.current = { ultimo: celula, mudancas: pintarCom(mapa, [celula], valor, usar) };
    redesenhar();
  };

  const aoMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const atual = traco.current;
    const mapa = mapaRef.current;
    if (!atual || !mapa) return;
    const { px, py, tx, ty } = pontoDoEvento(e);
    if (atual.movendo) {
      deslocamento.current.x -= tx - atual.movendo.x;
      deslocamento.current.y -= ty - atual.movendo.y;
      atual.movendo = { x: tx, y: ty };
      limitarDeslocamento();
      redesenhar();
      return;
    }
    const celula = celulaDoPonto(px, py, lado);
    if (forma.current) {
      forma.current.fim = celula;
      redesenhar();
      return;
    }
    if (celula.x === atual.ultimo.x && celula.y === atual.ultimo.y) return;
    const valor = valorDaFerramenta(ferramenta, camada, tileEscolhido);
    if (valor === null) return;
    atual.mudancas.push(...pintarCom(mapa, pontosDaLinha(atual.ultimo, celula), valor, ferramenta));
    atual.ultimo = celula;
    redesenhar();
  };

  /** Termina uma forma: pinta o retângulo ou a linha, copia a seleção ou cola o carimbo. */
  const concluirForma = (f: NonNullable<typeof forma.current>) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (f.tipo === 'retangulo') {
      guardar(pintarCom(mapa, pontosDoRetangulo(retanguloEntre(f.inicio, f.fim)), f.valor, 'pincel', false));
    } else if (f.tipo === 'linha') {
      guardar(pintarCom(mapa, expandirPincel(pontosDaLinha(f.inicio, f.fim), tamanhoPincel), f.valor, 'pincel', false));
    } else if (f.tipo === 'selecionar') {
      const c = copiarArea(mapa, retanguloEntre(f.inicio, f.fim));
      if (!c) {
        setMensagem({ texto: 'A seleção ficou fora do mapa.', erro: true });
      } else {
        setCarimbo(c);
        setFerramenta('carimbo');
        setMensagem({ texto: `Área copiada (${c.largura} × ${c.altura}). Toque onde quer carimbar.`, erro: false });
      }
    } else if (carimbo) {
      const lotes = carimbar(mapa, carimbo, origemDoCarimbo(carimbo, f.fim));
      if (lotes.length) {
        setHistorico((h) => registrar(h, { varios: lotes }));
        setSujo(true);
      }
    }
  };

  const aoSoltar = () => {
    const atual = traco.current;
    traco.current = null;
    const f = forma.current;
    forma.current = null;
    if (f) {
      concluirForma(f);
      redesenhar();
      return;
    }
    if (atual && !atual.movendo) guardar(atual.mudancas);
  };

  const aoRolar = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey) {
      mudarZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
      return;
    }
    deslocamento.current.x += e.shiftKey ? e.deltaY : e.deltaX;
    deslocamento.current.y += e.shiftKey ? 0 : e.deltaY;
    limitarDeslocamento();
    redesenhar();
  };

  // desfazer e refazer mexem no mapa: ficam fora do atualizador do estado (que o React pode chamar duas vezes)
  const voltar = useCallback(() => {
    const mapa = mapaRef.current;
    if (!mapa || !historico.desfazer.length) return;
    setHistorico(desfazer(mapa, historico));
    setSujo(true);
    redesenhar();
  }, [historico, redesenhar]);

  const avancar = useCallback(() => {
    const mapa = mapaRef.current;
    if (!mapa || !historico.refazer.length) return;
    setHistorico(refazer(mapa, historico));
    setSujo(true);
    redesenhar();
  }, [historico, redesenhar]);

  const salvar = useCallback(async () => {
    const mapa = mapaRef.current;
    if (!mapa || !podeEditar) return;
    const problemas = errosDosObjetos(mapa);
    if (problemas.length) {
      setMensagem({ texto: `Corrija os objetos antes de salvar: ${problemas[0]}`, erro: true });
      return;
    }
    setSalvando(true);
    setMensagem(null);
    const r = await chamar(tokenFresco, `/api/mestre/conteudo/mapa/${id}`, { method: 'PUT', body: JSON.stringify({ dados: mapa, revisao }) });
    setSalvando(false);
    if (r.ok) {
      setRevisao((r.dados.conteudo as ConteudoDocumento).revisao);
      setSujo(false);
      setMensagem({ texto: 'Rascunho salvo. Para o jogo ver, publique no painel.', erro: false });
    } else {
      setMensagem({ texto: String(r.dados.error ?? 'Não foi possível salvar.'), erro: true });
    }
  }, [id, podeEditar, revisao, tokenFresco]);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) avancar();
        else voltar();
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        avancar();
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void salvar();
      } else if (!ctrl && podeEditar) {
        const f = FERRAMENTAS.find((x) => x.atalho.toLowerCase() === e.key.toLowerCase());
        if (f) setFerramenta(f.id);
      }
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [avancar, voltar, salvar, podeEditar]);

  const adicionarTileset = async (tilesetId: string) => {
    const mapa = mapaRef.current;
    if (!mapa || !tilesetId || mapa.tilesets.includes(tilesetId)) return;
    try {
      const novo = await carregarTileset(tokenFresco, tilesetId);
      mapa.tilesets.push(tilesetId);
      setTilesets((lista) => [...lista, novo]);
      setTilesetAtivo(mapa.tilesets.length - 1);
      setSujo(true);
    } catch (error) {
      setMensagem({ texto: error instanceof Error ? error.message : 'Falha ao abrir o tileset.', erro: true });
    }
  };

  const mapa = mapaRef.current;
  const botao = (ativo: boolean) => ({
    backgroundColor: ativo ? colors.accent.primary : colors.background.secondary,
    color: ativo ? colors.background.secondary : colors.text.primary,
    borderColor: ativo ? colors.accent.primary : `${OURO}66`,
  });
  const naoUsados = disponiveis.filter((t) => !mapa?.tilesets.includes(t.id));

  return (
    <main className="h-dvh w-full flex flex-col select-none" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <header className="flex items-center gap-2 px-2 py-1.5 border-b flex-wrap" style={{ borderColor: `${OURO}44` }}>
        <Link href="/mestre" className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-cinzel font-bold" style={{ borderColor: OURO, color: '#E6C775' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Painel
        </Link>
        <Link href={`/mestre/mapas/${id}/jogar`} title={sujo ? 'Salve antes: o teste usa o rascunho salvo' : 'Andar pelo rascunho do mapa'} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-cinzel font-bold" style={{ borderColor: '#7BC47F', color: '#7BC47F' }}>
          <Gamepad2 className="w-3.5 h-3.5" /> Jogar o mapa
        </Link>
        <span className="text-[12px] font-cinzel font-bold truncate" style={{ color: '#F5E3B3' }}>
          {nome || id} {sujo && <span style={{ color: '#E6C775' }}>· não salvo</span>}
        </span>
        <span className="text-[10px]" style={{ color: colors.text.secondary }}>
          {mapa ? `${mapa.largura} × ${mapa.altura} · revisão ${revisao}` : ''}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!historico.desfazer.length} onClick={voltar} className="p-1.5 rounded border disabled:opacity-40" style={botao(false)}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Refazer" title="Refazer (Ctrl+Y)" disabled={!historico.refazer.length} onClick={avancar} className="p-1.5 rounded border disabled:opacity-40" style={botao(false)}>
            <Redo2 className="w-4 h-4" />
          </button>
          {podeEditar && (
            <button type="button" onClick={() => void salvar()} disabled={salvando || !sujo} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded font-cinzel font-bold text-[11px] disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
              <Save className="w-3.5 h-3.5" /> {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap border-b" style={{ borderColor: `${OURO}22` }}>
        <div role="radiogroup" aria-label="Modo do editor" className="flex gap-1">
          <button type="button" role="radio" aria-checked={modo === 'tiles'} onClick={() => { setModo('tiles'); setMovendoObjeto(false); }} className="px-2 py-1 rounded border text-[11px] font-bold" style={botao(modo === 'tiles')}>Tiles</button>
          <button type="button" role="radio" aria-checked={modo === 'objetos'} onClick={() => setModo('objetos')} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-bold" style={botao(modo === 'objetos')}>
            <MapPinned className="w-3.5 h-3.5" /> Interativos
          </button>
        </div>
        <span className="w-px h-5 mx-1" style={{ backgroundColor: `${OURO}44` }} />
        {modo === 'tiles' ? (
          <>
            <div role="radiogroup" aria-label="Camada" className="flex gap-1">
              {CAMADAS_DO_MAPA.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={camada === c} onClick={() => setCamada(c)} className="px-2 py-1 rounded border text-[11px] font-bold" style={botao(camada === c)}>
                  {NOME_DA_CAMADA[c]}
                </button>
              ))}
            </div>
            <span className="w-px h-5 mx-1" style={{ backgroundColor: `${OURO}44` }} />
            <div role="radiogroup" aria-label="Ferramenta" className="flex gap-1">
              {FERRAMENTAS.filter((f) => podeEditar || f.id === 'mover').map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={ferramenta === f.id} aria-label={f.nome} title={`${f.nome} (${f.atalho})`} onClick={() => setFerramenta(f.id)} className="p-1.5 rounded border" style={botao(ferramenta === f.id)}>
                  {f.icone}
                </button>
              ))}
            </div>
            {podeEditar && (ferramenta === 'pincel' || ferramenta === 'borracha' || ferramenta === 'linha') && (
              <div role="radiogroup" aria-label="Tamanho do pincel" className="flex items-center gap-1">
                <span className="text-[10px]">Pincel</span>
                {TAMANHOS_DO_PINCEL.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={tamanhoPincel === t} aria-label={`Pincel de ${t}`} onClick={() => setTamanhoPincel(t)} className="px-1.5 py-1 rounded border text-[11px] font-bold" style={botao(tamanhoPincel === t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {podeEditar && carimbo && (
              <div role="group" aria-label="Carimbo" className="flex items-center gap-1">
                <span className="text-[10px]">Carimbo {carimbo.largura}×{carimbo.altura}</span>
                <button type="button" aria-label="Espelhar o carimbo" onClick={() => setCarimbo((c) => (c ? espelharCarimbo(c) : c))} className="px-1.5 py-1 rounded border text-[11px]" style={botao(false)}>Espelhar</button>
                <button type="button" aria-label="Girar o carimbo" onClick={() => setCarimbo((c) => (c ? girarCarimbo(c) : c))} className="px-1.5 py-1 rounded border text-[11px]" style={botao(false)}>Girar</button>
                <button type="button" aria-label="Descartar o carimbo" onClick={() => { setCarimbo(null); if (ferramenta === 'carimbo') setFerramenta('pincel'); }} className="px-1.5 py-1 rounded border text-[11px]" style={botao(false)}>Descartar</button>
              </div>
            )}
          </>
        ) : (
          <div role="radiogroup" aria-label="Ferramenta dos objetos" className="flex gap-1">
            <button type="button" role="radio" aria-checked={ferramenta !== 'mover'} onClick={() => setFerramenta('pincel')} className="px-2 py-1 rounded border text-[11px] font-bold" style={botao(ferramenta !== 'mover')}>{podeEditar ? 'Colocar e selecionar' : 'Selecionar'}</button>
            <button type="button" role="radio" aria-checked={ferramenta === 'mover'} aria-label="Arrastar o mapa" onClick={() => setFerramenta('mover')} className="p-1.5 rounded border" style={botao(ferramenta === 'mover')}><Hand className="w-4 h-4" /></button>
          </div>
        )}
        <span className="w-px h-5 mx-1" style={{ backgroundColor: `${OURO}44` }} />
        <button type="button" aria-label="Diminuir zoom" onClick={() => mudarZoom(1 / 1.25)} className="p-1.5 rounded border" style={botao(false)}><ZoomOut className="w-4 h-4" /></button>
        <span className="text-[10px] w-9 text-center">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Aumentar zoom" onClick={() => mudarZoom(1.25)} className="p-1.5 rounded border" style={botao(false)}><ZoomIn className="w-4 h-4" /></button>
        <button type="button" aria-label="Grade" aria-pressed={grade} onClick={() => setGrade((g) => !g)} className="p-1.5 rounded border" style={botao(grade)}><Grid3x3 className="w-4 h-4" /></button>
        <label className="inline-flex items-center gap-1 text-[11px] ml-1">
          <input type="checkbox" checked={mostrarColisao} onChange={(e) => setMostrarColisao(e.target.checked)} /> Ver colisão
        </label>
      </div>

      {/* altura fixa: a mensagem aparecer não pode empurrar o mapa e fazer o próximo toque cair no tile errado */}
      <div className="px-2 h-6 flex items-center overflow-hidden">
        {mensagem && (
          <p role={mensagem.erro ? 'alert' : 'status'} className="text-[11px] font-semibold truncate" style={{ color: mensagem.erro ? VERMELHO : '#7BC47F' }}>
            {mensagem.texto}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <div ref={caixaRef} className="flex-1 min-h-0 min-w-0 relative">
          {carregado ? (
            <canvas
              ref={canvasRef}
              aria-label={`Mapa ${nome}`}
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: 'none', cursor: ferramenta === 'mover' ? 'grab' : 'crosshair' }}
              onPointerDown={aoApertar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerCancel={aoSoltar}
              onWheel={aoRolar}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <p className="p-4 text-[12px]" style={{ color: colors.text.secondary }}>Abrindo o mapa...</p>
          )}
        </div>

        {modo === 'objetos' ? (
          <PainelDeObjetos
            tipo={tipoDeObjeto}
            setTipo={setTipoDeObjeto}
            objetos={mapa?.objetos ?? []}
            selecionado={selecionado}
            selecionar={setSelecionado}
            podeEditar={podeEditar}
            movendo={movendoObjeto}
            setMovendo={setMovendoObjeto}
            mudar={mudarObjeto}
            remover={tirarObjeto}
            erros={mapa ? errosDosObjetos(mapa) : []}
            mapas={opcoes.mapas}
            monstros={opcoes.monstros}
            cenas={opcoes.cenas}
            materiais={opcoes.materiais}
          />
        ) : (
        <Paleta
          tilesets={tilesets}
          ativo={tilesetAtivo}
          setAtivo={setTilesetAtivo}
          tileEscolhido={tileEscolhido}
          escolher={(valor) => {
            setTileEscolhido(valor);
            if (ferramenta !== 'pincel' && ferramenta !== 'balde' && ferramenta !== 'retangulo' && ferramenta !== 'linha') setFerramenta('pincel');
            if (camada === 'colisao') setCamada('chao');
          }}
          podeEditar={podeEditar}
          naoUsados={naoUsados}
          cheio={(mapa?.tilesets.length ?? 0) >= MAXIMO_DE_TILESETS}
          adicionar={(t) => void adicionarTileset(t)}
          terreno={regraEscolhida?.regra.nome ?? null}
          bordaAuto={bordaAuto}
          setBordaAuto={setBordaAuto}
        />
        )}
      </div>
    </main>
  );
}

function Paleta({
  tilesets,
  ativo,
  setAtivo,
  tileEscolhido,
  escolher,
  podeEditar,
  naoUsados,
  cheio,
  adicionar,
  terreno,
  bordaAuto,
  setBordaAuto,
}: {
  tilesets: TilesetCarregado[];
  ativo: number;
  setAtivo: (i: number) => void;
  tileEscolhido: number;
  escolher: (valor: number) => void;
  podeEditar: boolean;
  naoUsados: ResumoConteudo[];
  cheio: boolean;
  adicionar: (id: string) => void;
  /** Nome do terreno com borda automática a que o tile escolhido pertence, se houver. */
  terreno: string | null;
  bordaAuto: boolean;
  setBordaAuto: (v: boolean) => void;
}) {
  const { colors } = NOCTHERA_THEME;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ts = tilesets[ativo];
  const escala = ts ? Math.max(1, Math.round(32 / ts.dados.tamanhoDoTile)) : 1;
  const escolhido = useMemo(() => tileDoValor(tileEscolhido), [tileEscolhido]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ts) return;
    const { colunas, linhas, tamanhoDoTile } = ts.dados;
    const l = tamanhoDoTile * escala;
    canvas.width = colunas * l;
    canvas.height = linhas * l;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < colunas * linhas; i++) {
      const r = recorteDoTile(ts.dados, i);
      ctx.drawImage(ts.imagem, r.x, r.y, r.lado, r.lado, (i % colunas) * l, Math.floor(i / colunas) * l, l, l);
    }
    if (escolhido && escolhido.tileset === ativo) {
      ctx.strokeStyle = '#F5E3B3';
      ctx.lineWidth = 2;
      ctx.strokeRect((escolhido.tile % colunas) * l + 1, Math.floor(escolhido.tile / colunas) * l + 1, l - 2, l - 2);
    }
  }, [ts, escala, escolhido, ativo]);

  return (
    <aside className="h-48 md:h-auto md:w-72 shrink-0 border-t md:border-t-0 md:border-l flex flex-col min-h-0" style={{ borderColor: `${OURO}44`, backgroundColor: colors.background.secondary }}>
      <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
        <select aria-label="Tileset" value={ativo} onChange={(e) => setAtivo(Number(e.target.value))} className="rounded-sm border px-1.5 py-1 text-[11px] flex-1 min-w-0" style={{ backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary }}>
          {tilesets.length === 0 && <option value={0}>Nenhum tileset no mapa</option>}
          {tilesets.map((t, i) => (
            <option key={t.id} value={i}>{t.nome}</option>
          ))}
        </select>
        {podeEditar && !cheio && naoUsados.length > 0 && (
          <select
            aria-label="Adicionar tileset ao mapa"
            value=""
            onChange={(e) => adicionar(e.target.value)}
            className="rounded-sm border px-1.5 py-1 text-[11px] w-28"
            style={{ backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary }}
          >
            <option value="">+ Tileset</option>
            {naoUsados.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        )}
      </div>
      {terreno && (
        <label className="mx-2 mb-1 flex items-center gap-1.5 text-[11px]">
          <input type="checkbox" aria-label="Borda automática" checked={bordaAuto} onChange={(e) => setBordaAuto(e.target.checked)} />
          Borda automática: {terreno}
        </label>
      )}
      <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
        {ts ? (
          <canvas
            ref={canvasRef}
            aria-label={`Tiles de ${ts.nome}`}
            className="block"
            style={{ imageRendering: 'pixelated' }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const l = ts.dados.tamanhoDoTile * escala * (r.width / e.currentTarget.width);
              const coluna = Math.floor((e.clientX - r.left) / l);
              const linha = Math.floor((e.clientY - r.top) / l);
              if (coluna < 0 || linha < 0 || coluna >= ts.dados.colunas || linha >= ts.dados.linhas) return;
              escolher(valorDoTile(ativo, linha * ts.dados.colunas + coluna));
            }}
          />
        ) : (
          <p className="text-[11px] flex items-center gap-1" style={{ color: colors.text.secondary }}>
            <Plus className="w-3.5 h-3.5" /> {podeEditar ? 'Adicione um tileset ao mapa para pintar. Os tilesets são importados na aba Mapas do painel.' : 'Este mapa não usa tilesets ainda.'}
          </p>
        )}
      </div>
    </aside>
  );
}
