import {
  ABAIXAR_MUSICA_DB, ABAIXAR_MUSICA_MS, canalDoSom, caminhoDaMusica, caminhoDoSom, CANAIS, ehSom, INTERVALO_MINIMO_DO_MESMO_SOM_MS, MAXIMO_DE_SONS_JUNTOS,
  PREFERENCIAS_PADRAO, preferenciasDoTexto, prioridadeDoSom, proximaFaixa, SONS_QUE_ABAIXAM_A_MUSICA, type Canal, type ContextoDeMusica, type IdDeMusica, type IdDeSom, type PreferenciasDeAudio,
} from '@/rules/audio';
import { SONS_INTERFACE } from '@/rules/audioSons';

/**
 * O motor de áudio do jogo (Web Audio): quatro canais de volume salvos no aparelho, no máximo 8 sons juntos (o de menor prioridade e mais antigo sai),
 * o mesmo som não repete em menos de 80 ms, a música abaixa 6 dB por 4 s nas conquistas, e tudo pausa quando a aba sai de cena.
 * Nada toca antes do primeiro toque do jogador. Os sons e as músicas só são baixados quando precisam (música: uma faixa por vez).
 * Tudo fica no aparelho: nenhuma leitura ou gravação no servidor.
 */
const CHAVE = 'nocthera.audio.v1';

interface Ativo { id: IdDeSom; prioridade: number; inicio: number; fonte: AudioBufferSourceNode }

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
const ganhoDoCanal: Partial<Record<Canal, GainNode>> = {};
let ganhoDaMusica: GainNode | null = null; // o ducking é aplicado aqui, por cima do volume do canal
const buffers = new Map<string, AudioBuffer>();
const baixando = new Map<string, Promise<AudioBuffer | null>>();
let ativos: Ativo[] = [];
const ultimoToque = new Map<string, number>();
let prefs: PreferenciasDeAudio = { volumes: { ...PREFERENCIAS_PADRAO.volumes }, mudo: false };
let carregouPrefs = false;
const ouvintes = new Set<() => void>();

let desbloqueado = false;
let contextoDeMusica: ContextoDeMusica | null = null;
let chaveDoContexto = '';
let musica: { el: HTMLAudioElement; id: IdDeMusica; ganho: GainNode } | null = null;
let ultimaFaixa: IdDeMusica | null = null;
let timerDaPausa: ReturnType<typeof setTimeout> | null = null;
let timerDoDucking: ReturnType<typeof setTimeout> | null = null;
let abaVisivel = true;

const avisar = () => ouvintes.forEach((f) => f());
export function observarAudio(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

function carregarPrefs() {
  if (carregouPrefs || typeof window === 'undefined') return;
  carregouPrefs = true;
  try {
    prefs = preferenciasDoTexto(JSON.parse(window.localStorage.getItem(CHAVE) ?? 'null'));
  } catch {
    prefs = preferenciasDoTexto(null);
  }
}

export function preferenciasAtuais(): PreferenciasDeAudio {
  carregarPrefs();
  return prefs;
}

function aplicarVolumes() {
  if (!ctx || !mestre) return;
  mestre.gain.value = prefs.mudo ? 0 : 1;
  for (const c of CANAIS) ganhoDoCanal[c]!.gain.value = prefs.volumes[c];
}

function gravarPrefs() {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(prefs));
  } catch {
    /* sem armazenamento: vale só até fechar a aba */
  }
  aplicarVolumes();
  avisar();
}

export function definirVolume(canal: Canal, valor: number) {
  carregarPrefs();
  prefs = { ...prefs, volumes: { ...prefs.volumes, [canal]: Math.min(1, Math.max(0, valor)) } };
  gravarPrefs();
}

export function definirMudo(mudo: boolean) {
  carregarPrefs();
  prefs = { ...prefs, mudo };
  gravarPrefs();
}

function contexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  carregarPrefs();
  mestre = ctx.createGain();
  mestre.connect(ctx.destination);
  for (const c of CANAIS) {
    const g = ctx.createGain();
    g.connect(mestre);
    ganhoDoCanal[c] = g;
  }
  ganhoDaMusica = ctx.createGain();
  ganhoDaMusica.connect(ganhoDoCanal.musica!);
  aplicarVolumes();
  return ctx;
}

async function buffer(id: IdDeSom): Promise<AudioBuffer | null> {
  const c = contexto();
  if (!c) return null;
  const pronto = buffers.get(id);
  if (pronto) return pronto;
  let p = baixando.get(id);
  if (!p) {
    p = fetch(caminhoDoSom(id))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('som não encontrado'))))
      .then((b) => c.decodeAudioData(b))
      .then((b) => {
        buffers.set(id, b);
        return b;
      })
      .catch(() => null)
      .finally(() => baixando.delete(id));
    baixando.set(id, p);
  }
  return p;
}

/** Toca um som (efeito, interface ou stinger). Antes do primeiro toque, ou se o som ainda não baixou, simplesmente não toca. */
export function tocar(id: IdDeSom): void {
  if (!desbloqueado || !abaVisivel || !ehSom(id)) return;
  carregarPrefs();
  if (prefs.mudo || prefs.volumes[canalDoSom(id)] === 0) return;
  const agora = Date.now();
  if (agora - (ultimoToque.get(id) ?? 0) < INTERVALO_MINIMO_DO_MESMO_SOM_MS) return;
  ultimoToque.set(id, agora);
  void buffer(id).then((b) => {
    const c = ctx;
    if (!b || !c || !abaVisivel) return;
    const prioridade = prioridadeDoSom(id);
    if (ativos.length >= MAXIMO_DE_SONS_JUNTOS) {
      // sai o de menor prioridade (o mais antigo entre os iguais); se o novo vale menos que todos, ele é que não toca
      const pior = [...ativos].sort((a, b2) => a.prioridade - b2.prioridade || a.inicio - b2.inicio)[0];
      if (pior.prioridade > prioridade) return;
      try { pior.fonte.stop(); } catch { /* já acabou */ }
      ativos = ativos.filter((a) => a !== pior);
    }
    const fonte = c.createBufferSource();
    fonte.buffer = b;
    fonte.connect(ganhoDoCanal[canalDoSom(id)]!);
    const ativo: Ativo = { id, prioridade, inicio: agora, fonte };
    ativos.push(ativo);
    fonte.onended = () => { ativos = ativos.filter((a) => a !== ativo); };
    fonte.start();
    if (SONS_QUE_ABAIXAM_A_MUSICA.includes(id)) abaixarMusica();
  });
}

/** Baixa já os sons de interface (cerca de 230 KB), para o primeiro toque não ficar mudo. */
export function precarregarInterface(): void {
  for (const id of SONS_INTERFACE) void buffer(id);
}

function abaixarMusica() {
  if (!ctx || !ganhoDaMusica) return;
  const g = ganhoDaMusica.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(Math.pow(10, -ABAIXAR_MUSICA_DB / 20), ctx.currentTime, 0.05);
  if (timerDoDucking) clearTimeout(timerDoDucking);
  timerDoDucking = setTimeout(() => ctx && g.setTargetAtTime(1, ctx.currentTime, 0.4), ABAIXAR_MUSICA_MS);
}

// ---- Música ----
// UMA faixa por vez: toda faixa criada fica registrada; ao começar outra, todas as anteriores param (com um fade curto). Um só timer de início.
const todasAsFaixas = new Set<{ el: HTMLAudioElement; ganho: GainNode }>();
let timerDeInicio: ReturnType<typeof setTimeout> | null = null;

function cancelarTimers() {
  if (timerDaPausa) { clearTimeout(timerDaPausa); timerDaPausa = null; }
  if (timerDeInicio) { clearTimeout(timerDeInicio); timerDeInicio = null; }
}

function soltarFaixa(f: { el: HTMLAudioElement; ganho: GainNode }, suave: boolean) {
  const fim = () => {
    f.el.onended = null;
    f.el.pause();
    f.el.removeAttribute('src');
    f.el.load();
    try { f.ganho.disconnect(); } catch { /* já solto */ }
    todasAsFaixas.delete(f);
  };
  if (suave && ctx) {
    f.ganho.gain.cancelScheduledValues(ctx.currentTime);
    f.ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(fim, 450);
  } else fim();
}

function pararMusica(suave: boolean) {
  cancelarTimers();
  musica = null;
  for (const f of [...todasAsFaixas]) soltarFaixa(f, suave);
}

function tocarFaixa(id: IdDeMusica, loop: boolean) {
  const c = contexto();
  if (!c || !ganhoDaMusica) return;
  // garantia: nenhuma outra faixa continua tocando por baixo
  for (const f of [...todasAsFaixas]) soltarFaixa(f, true);
  const el = new Audio(caminhoDaMusica(id));
  el.loop = loop;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  const ganho = c.createGain();
  ganho.gain.value = 0;
  c.createMediaElementSource(el).connect(ganho);
  ganho.connect(ganhoDaMusica);
  ganho.gain.setTargetAtTime(1, c.currentTime, 0.5);
  const faixa = { el, ganho };
  todasAsFaixas.add(faixa);
  musica = { el, id, ganho };
  ultimaFaixa = id;
  el.onended = () => {
    if (musica?.el !== el) return;
    const ctxAtual = contextoDeMusica;
    soltarFaixa(faixa, false);
    musica = null;
    if (!ctxAtual) return;
    const [min, max] = ctxAtual.pausaMs;
    cancelarTimers();
    timerDaPausa = setTimeout(iniciarMusica, min + Math.random() * (max - min));
  };
  if (abaVisivel) void el.play().catch(() => { /* o navegador ainda não deixou: o próximo toque tenta de novo */ });
}

function iniciarMusica() {
  timerDaPausa = null;
  timerDeInicio = null;
  if (!desbloqueado || !contextoDeMusica || musica) return;
  const faixa = proximaFaixa(contextoDeMusica, ultimaFaixa);
  tocarFaixa(faixa, contextoDeMusica.faixas.length === 1 && contextoDeMusica.pausaMs[1] === 0);
}

// A música da tela (rota) e a da luta: enquanto uma luta está na tela, a da luta manda; quando ela sai, volta a da tela (com uma folga, para
// lutas seguidas, como a Batalha Sangrenta, não reiniciarem a faixa a cada luta).
let musicaDaTela: { chave: string; c: ContextoDeMusica | null } = { chave: '', c: null };
let lutasNaTela = 0;
let timerDeVolta: ReturnType<typeof setTimeout> | null = null;

/** A música da tela (a rota). Durante uma luta, fica guardada e volta quando a luta sai. */
export function definirMusica(chave: string, c: ContextoDeMusica | null): void {
  musicaDaTela = { chave, c };
  if (lutasNaTela === 0) aplicarMusica(chave, c);
}

/** Uma luta entrou na tela: toca a música dela. Devolve a função que avisa que a luta saiu. */
export function entrarEmLuta(c: ContextoDeMusica): () => void {
  lutasNaTela++;
  if (timerDeVolta) { clearTimeout(timerDeVolta); timerDeVolta = null; }
  aplicarMusica(`luta:${c.faixas.join(',')}`, c);
  let saiu = false;
  return () => {
    if (saiu) return;
    saiu = true;
    lutasNaTela = Math.max(0, lutasNaTela - 1);
    if (lutasNaTela > 0) return;
    if (timerDeVolta) clearTimeout(timerDeVolta);
    timerDeVolta = setTimeout(() => {
      timerDeVolta = null;
      if (lutasNaTela === 0) aplicarMusica(musicaDaTela.chave, musicaDaTela.c);
    }, 1500);
  };
}

function aplicarMusica(chave: string, c: ContextoDeMusica | null): void {
  if (chave === chaveDoContexto) return;
  chaveDoContexto = chave;
  contextoDeMusica = c;
  // se a faixa que está tocando também serve para a tela nova, ela segue (a música não "pula" ao trocar de tela parecida)
  if (musica && c?.faixas.includes(musica.id)) return;
  pararMusica(true);
  if (c && desbloqueado) timerDeInicio = setTimeout(iniciarMusica, 500);
}

/** Baixa já uma lista de sons (os da luta, ao abrir a luta), para o primeiro golpe não sair mudo nem atrasado. */
export function precarregarSons(ids: readonly IdDeSom[]): void {
  if (!desbloqueado) return;
  for (const id of ids) void buffer(id);
}

/** Liga o som no primeiro toque (exigência do navegador). */
export function desbloquear(): void {
  const c = contexto();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  if (desbloqueado) {
    if (musica && musica.el.paused && abaVisivel) void musica.el.play().catch(() => {});
    return;
  }
  desbloqueado = true;
  precarregarInterface();
  if (contextoDeMusica && !musica) iniciarMusica();
}

/** A aba saiu de cena: pausa tudo; voltou: retoma. */
export function definirAbaVisivel(visivel: boolean): void {
  abaVisivel = visivel;
  if (!ctx) return;
  if (!visivel) {
    musica?.el.pause();
    void ctx.suspend().catch(() => {});
  } else {
    void ctx.resume().catch(() => {});
    if (musica) void musica.el.play().catch(() => {});
    else if (contextoDeMusica && desbloqueado && !timerDaPausa && !timerDeInicio) iniciarMusica();
  }
}
