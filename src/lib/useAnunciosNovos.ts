'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validarAnuncio } from '@/rules/anuncio';

const CHAVE = 'noctheraAnunciosVistos';

/** A assinatura dos anúncios que estão valendo (os ids, em ordem). */
export const assinaturaDosAnuncios = (ids: readonly string[]) => [...ids].sort().join('|');

/** Guarda quais anúncios o jogador já viu neste aparelho (só um conforto da tela; nada disso vai para o servidor). */
export function marcarAnunciosComoVistos(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(CHAVE, assinaturaDosAnuncios(ids));
  } catch {
    // sem armazenamento, o ponto só some quando não houver anúncio
  }
}

/** Há anúncio novo que o jogador ainda não viu neste aparelho? */
export function useAnunciosNovos(): boolean {
  const [novos, setNovos] = useState(false);
  useEffect(() => {
    let cancelado = false;
    const parar = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) return;
      void (async () => {
        try {
          const res = await fetch('/api/conteudo/anuncio', { headers: { Authorization: `Bearer ${await usuario.getIdToken()}` } });
          if (!res.ok) return;
          const { itens } = (await res.json()) as { itens: { id: string; dados: unknown }[] };
          const ids = itens.filter((i) => validarAnuncio(i.dados).ok).map((i) => i.id);
          let visto = '';
          try {
            visto = window.localStorage.getItem(CHAVE) ?? '';
          } catch {
            visto = '';
          }
          if (!cancelado) setNovos(ids.length > 0 && assinaturaDosAnuncios(ids) !== visto);
        } catch {
          // sem o ponto, o card continua funcionando
        }
      })();
    });
    return () => {
      cancelado = true;
      parar();
    };
  }, []);
  return novos;
}
