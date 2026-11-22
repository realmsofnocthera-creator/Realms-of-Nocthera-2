'use client';

import React, { useState } from 'react';
import type { ResumoDaLimpeza } from '@/server/limpezaMestre';
import { Cartao, chamar, OURO, VERMELHO } from './comum';

type Token = () => Promise<string>;

/**
 * Limpeza de jogadores (só o Dono): primeiro o ensaio (conta o que seria apagado), depois, digitando a frase, apaga os dados e os logins de todos
 * os jogadores e mantém só o Dono. IRREVERSÍVEL e sem backup.
 */
export function LimpezaPainel({ tokenFresco }: { tokenFresco: Token }) {
  const [resumo, setResumo] = useState<ResumoDaLimpeza | null>(null);
  const [frase, setFrase] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  async function chamarLimpeza(corpo: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/mestre/limpeza', { method: 'POST', body: JSON.stringify(corpo) });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível.'), erro: true });
      return null;
    }
    return r.dados.resumo as ResumoDaLimpeza;
  }

  async function ensaio() {
    const r = await chamarLimpeza({ acao: 'ensaio' });
    if (r) setResumo(r);
  }

  async function apagar() {
    if (!resumo || frase !== resumo.frase) return;
    if (!window.confirm('Apagar TODOS os jogadores (menos você)? Não tem volta e não há backup.')) return;
    const r = await chamarLimpeza({ acao: 'executar', confirmar: frase });
    if (r) {
      setResumo(r);
      setFrase('');
      setAviso({ texto: 'Limpeza feita. Os jogadores foram apagados; só o seu personagem e o seu login ficaram. Reinicie o serviço no Cloud Run para limpar as memórias do servidor.', erro: false });
    }
  }

  return (
    <Cartao titulo="Limpeza de jogadores">
      <div className="flex flex-col gap-2 text-[12px]">
        <p style={{ color: VERMELHO }}>
          Apaga os dados e os logins (e-mails) de TODOS os jogadores, menos o seu. Não tem volta e não há backup. Os papéis do Mestre, os mapas e as
          configurações não são tocados.
        </p>
        <div>
          <button type="button" onClick={() => void ensaio()} disabled={ocupado} className="rounded-sm border px-3 py-1 text-[12px] font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
            {ocupado && !resumo ? 'Contando...' : '1. Ver o que seria apagado (ensaio)'}
          </button>
        </div>
        {resumo && (
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className="font-bold">{resumo.executado ? 'Apagado:' : 'Seria apagado:'} {resumo.total} itens ({resumo.logins} logins)</p>
            <ul className="text-[11px] leading-snug">
              {Object.entries(resumo.colecoesInteiras).map(([c, n]) => <li key={c}>{c}: {n} (coleção inteira)</li>)}
              {Object.entries(resumo.colecoesPorJogador).map(([c, n]) => <li key={c}>{c}: {n} (menos o seu)</li>)}
              <li>Logins do Firebase Auth: {resumo.logins}</li>
            </ul>
            <p className="text-[11px]">Mantidos: {resumo.mantidas.join(', ')}, o seu personagem e o seu login ({resumo.donoPreservado}).</p>
            {resumo.avisoDaCota && <p className="text-[11px]" style={{ color: VERMELHO }}>{resumo.avisoDaCota}</p>}
            {!resumo.executado && (
              <>
                <label className="text-[11px] flex flex-col gap-0.5">
                  2. Para apagar de verdade, digite: <span className="font-mono select-all">{resumo.frase}</span>
                  <input value={frase} onChange={(e) => setFrase(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} className="rounded-sm border px-2 py-1 text-[12px] w-full font-mono" style={{ borderColor: `${OURO}66`, backgroundColor: '#1a1410', color: '#F5E3B3' }} aria-label="Frase de confirmação" />
                </label>
                <div>
                  <button type="button" onClick={() => void apagar()} disabled={ocupado || frase !== resumo.frase} className="rounded-sm border px-3 py-1 text-[12px] font-bold disabled:opacity-40" style={{ borderColor: VERMELHO, backgroundColor: '#4A1914', color: '#FFD9D4' }}>
                    {ocupado ? 'Apagando...' : '3. Apagar todos os jogadores'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-[12px]" style={{ color: aviso.erro ? VERMELHO : '#7BC47F' }}>{aviso.texto}</p>}
      </div>
    </Cartao>
  );
}
