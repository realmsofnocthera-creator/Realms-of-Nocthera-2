'use client';

import React, { useEffect, useState } from 'react';
import { NOCTHERA_THEME } from '@/theme/theme';

interface Privacidade {
  escondidoNoRanking: boolean;
  escondidoNaBusca: boolean;
}

/** Os dois interruptores de privacidade (7.1): aparecer ou não no Ranking e na Busca. Quem some do Ranking sai do retrato já guardado. */
export function PrivacidadeSocial({ tokenFresco, campo, aoMudar }: { tokenFresco: () => Promise<string | null>; campo: keyof Privacidade; aoMudar?: () => void }) {
  const { colors } = NOCTHERA_THEME;
  const [valor, setValor] = useState<Privacidade | null>(null);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const token = await tokenFresco();
        const res = await fetch('/api/character/privacidade', { headers: { Authorization: `Bearer ${token ?? ''}` } });
        if (!res.ok) throw new Error('falhou');
        const dados = (await res.json()) as Privacidade;
        if (!cancelado) setValor(dados);
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erro) return null;
  if (!valor) return null;
  const aparece = !valor[campo];
  const rotulo = campo === 'escondidoNoRanking' ? 'Aparecer no ranking' : 'Aparecer na busca';

  async function alternar() {
    if (!valor) return;
    setSalvando(true);
    setErro(false);
    try {
      const token = await tokenFresco();
      const res = await fetch('/api/character/privacidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ [campo]: !valor[campo] }),
      });
      if (!res.ok) throw new Error('falhou');
      setValor((await res.json()) as Privacidade);
      aoMudar?.();
    } catch {
      setErro(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.text.secondary }}>
      <input type="checkbox" checked={aparece} disabled={salvando} onChange={() => void alternar()} className="w-4 h-4" />
      {rotulo}
    </label>
  );
}
