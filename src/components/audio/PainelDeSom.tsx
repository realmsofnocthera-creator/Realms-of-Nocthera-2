'use client';

import { useSyncExternalStore } from 'react';
import { definirMudo, definirVolume, observarAudio, preferenciasAtuais, tocar } from '@/lib/audio/motor';
import { CANAIS, PREFERENCIAS_PADRAO, ROTULO_DO_CANAL } from '@/rules/audio';

/** Os volumes do jogo (música, efeitos, interface, ambiente) e o mudo geral. Ficam só neste aparelho. */
export function PainelDeSom() {
  const prefs = useSyncExternalStore(observarAudio, preferenciasAtuais, () => PREFERENCIAS_PADRAO);
  return (
    <section aria-label="Som" className="w-full flex flex-col gap-2 p-3 border font-cinzel" style={{ borderColor: '#C8A656', backgroundColor: 'rgba(20,14,10,.85)', color: '#F5E3B3' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider">Som</h2>
        <button type="button" role="switch" aria-checked={prefs.mudo} onClick={() => definirMudo(!prefs.mudo)} className="px-2 py-1 text-[11px] font-bold uppercase border cursor-pointer" style={{ borderColor: '#C8A656' }}>
          {prefs.mudo ? 'Mudo: ligado' : 'Mudo: desligado'}
        </button>
      </div>
      {CANAIS.filter((c) => c !== 'ambiente').map((c) => (
        <label key={c} className="flex items-center gap-2 text-[11px]">
          <span className="w-20 shrink-0">{ROTULO_DO_CANAL[c]}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(prefs.volumes[c] * 100)}
            disabled={prefs.mudo}
            aria-label={`Volume: ${ROTULO_DO_CANAL[c]}`}
            onChange={(e) => definirVolume(c, Number(e.target.value) / 100)}
            onPointerUp={() => tocar(c === 'interface' ? 'ui_selecao' : c === 'efeitos' ? 'sfx_espada_golpe' : 'ui_selecao')}
            className="flex-1 min-w-0 accent-[#C8A656]"
          />
          <span className="w-9 text-right tabular-nums">{Math.round(prefs.volumes[c] * 100)}%</span>
        </label>
      ))}
    </section>
  );
}
