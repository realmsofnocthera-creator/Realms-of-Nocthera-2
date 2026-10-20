import { bipDaLetra, type Voz } from '@/rules/voz';

/**
 * Toca os bipes das vozes com Web Audio. O navegador só libera som depois de um toque do jogador; até lá, os bipes
 * simplesmente não tocam (o texto aparece igual). Um contexto de áudio só, reaproveitado.
 */
let contexto: AudioContext | null = null;
let ruidoBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!contexto) {
    try {
      contexto = new Ctor();
    } catch {
      return null;
    }
  }
  if (contexto.state === 'suspended') void contexto.resume().catch(() => {});
  return contexto;
}

/** Chame num toque/clique para destravar o som no celular. */
export function liberarSom(): void {
  audio();
}

function ruido(ctx: AudioContext): AudioBuffer {
  if (!ruidoBuffer || ruidoBuffer.sampleRate !== ctx.sampleRate) {
    ruidoBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = ruidoBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ruidoBuffer;
}

/** Toca um bipe da voz. */
export function tocarBip(voz: Voz, frequencia: number, frequenciaFinal: number): void {
  const ctx = audio();
  if (!ctx || ctx.state !== 'running') return;
  const agora = ctx.currentTime;
  const fim = agora + voz.duracaoMs / 1000;
  const saida = ctx.createGain();
  saida.gain.setValueAtTime(0.0001, agora);
  saida.gain.exponentialRampToValueAtTime(Math.max(0.0002, voz.volume), agora + 0.005);
  saida.gain.exponentialRampToValueAtTime(0.0001, fim);
  saida.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = voz.onda;
  osc.frequency.setValueAtTime(frequencia, agora);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequenciaFinal), fim);
  const tom = ctx.createGain();
  tom.gain.value = 1 - voz.ruido;
  osc.connect(tom).connect(saida);
  osc.start(agora);
  osc.stop(fim + 0.02);

  if (voz.ruido > 0) {
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruido(ctx);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = frequencia * 2;
    filtro.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = voz.ruido;
    fonte.connect(filtro).connect(g).connect(saida);
    fonte.start(agora);
    fonte.stop(fim + 0.02);
  }
}

/** Amostra para o editor: fala uma frase curta com a voz, no ritmo dela. */
export function ouvirVoz(voz: Voz, frase = 'Olá, viajante. Bem-vindo à Folhaviva.'): void {
  liberarSom();
  let contadas = 0;
  let t = 0;
  for (const c of frase) {
    if (/[\p{L}\p{N}]/u.test(c)) contadas++;
    const bip = bipDaLetra(voz, c, contadas, Math.random());
    if (bip) window.setTimeout(() => tocarBip(voz, bip.frequencia, bip.frequenciaFinal), t);
    t += voz.msPorLetra;
  }
}
