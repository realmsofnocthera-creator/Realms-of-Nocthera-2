'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { falanteDaTela, fundoDaTela, vozDaTela, type CenaDados } from '@/rules/cena';
import { bipDaLetra, letraQueSoa, MS_POR_LETRA_SEM_VOZ, pausaDepois } from '@/rules/voz';
import { liberarSom, tocarBip } from '@/lib/vozBip';

const CHAVE_DO_SOM = 'nocthera.somDasCenas';

function somLigadoSalvo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DO_SOM) !== 'desligado';
  } catch {
    return true;
  }
}

/**
 * Toca uma cena (cutscene ou diálogo): uma tela por vez, com o fundo da cena, o texto na caixa de baixo e, quando
 * alguém fala, o retrato dele logo acima da caixa. O texto aparece letra a letra, com a voz "bip" de quem fala.
 * Toque/clique ou Enter: com o texto ainda aparecendo, mostra tudo; depois, avança. "Pular" encerra.
 */
export function CenaPlayer({
  cena,
  jogador,
  aoTerminar,
  permitirPular = true,
}: {
  cena: CenaDados;
  jogador: { nome: string; retrato?: string };
  aoTerminar: () => void;
  permitirPular?: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const [mostradas, setMostradas] = useState(0);
  const [som, setSom] = useState(true);
  const somRef = useRef(true);
  const tela = cena.telas[indice];
  const ultima = indice >= cena.telas.length - 1;
  const falante = tela ? falanteDaTela(cena, tela, jogador) : null;
  const fundo = tela ? fundoDaTela(cena, indice) : null;
  const letras = tela ? Array.from(tela.texto) : [];
  const completo = mostradas >= letras.length;

  useEffect(() => {
    const salvo = somLigadoSalvo();
    somRef.current = salvo;
    setSom(salvo);
  }, []);

  // letra a letra, com o bipe da voz de quem fala
  useEffect(() => {
    if (!tela) return;
    const todas = Array.from(tela.texto);
    const voz = vozDaTela(cena, tela);
    let contadas = 0;
    let i = 0;
    let timer = 0;
    setMostradas(0);
    const proxima = () => {
      const c = todas[i];
      i++;
      setMostradas(i);
      if (letraQueSoa(c)) contadas++;
      if (voz && somRef.current) {
        const bip = bipDaLetra(voz, c, contadas, Math.random());
        if (bip) tocarBip(voz, bip.frequencia, bip.frequenciaFinal);
      }
      if (i < todas.length) timer = window.setTimeout(proxima, (voz?.msPorLetra ?? MS_POR_LETRA_SEM_VOZ) + pausaDepois(c));
    };
    timer = window.setTimeout(proxima, 120);
    return () => window.clearTimeout(timer);
  }, [cena, tela]);

  const tocar = useCallback(() => {
    liberarSom();
    if (!completo) return setMostradas(letras.length);
    if (ultima) aoTerminar();
    else setIndice((i) => i + 1);
  }, [completo, letras.length, ultima, aoTerminar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tocar();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [tocar]);

  if (!tela) return null;
  return (
    <div role="dialog" aria-label={cena.titulo} data-testid="cena" className="fixed inset-0 z-50 flex flex-col justify-end bg-black text-white" onClick={tocar}>
      {fundo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fundo} alt="" className="absolute inset-0 h-full w-full object-cover" data-testid="cena-fundo" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          aria-label={som ? 'Desligar o som das vozes' : 'Ligar o som das vozes'}
          aria-pressed={som}
          className="rounded border border-white/40 bg-black/50 px-2 py-1"
          onClick={(e) => {
            e.stopPropagation();
            liberarSom();
            const novo = !som;
            somRef.current = novo;
            setSom(novo);
            try {
              window.localStorage.setItem(CHAVE_DO_SOM, novo ? 'ligado' : 'desligado');
            } catch {
              // sem armazenamento: vale só nesta tela
            }
          }}
        >
          {som ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        {permitirPular && (
          <button
            type="button"
            className="rounded border border-white/40 bg-black/50 px-3 py-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              aoTerminar();
            }}
          >
            Pular
          </button>
        )}
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-1 px-3 pb-4">
        {falante?.retrato && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={falante.retrato} alt={falante.nome} data-testid="cena-retrato" className="ml-2 h-40 w-auto max-w-[60%] self-start object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] sm:h-56" />
        )}
        <div className="rounded-md border border-white/30 bg-black/75 px-4 py-3">
          {falante && <p className="mb-1 text-sm font-bold text-amber-300" data-testid="cena-nome">{falante.nome}</p>}
          {/* o resto do texto fica invisível, ocupando o lugar: a caixa não muda de tamanho enquanto as letras aparecem */}
          <p className={`whitespace-pre-line text-[15px] leading-relaxed ${tela.tipo === 'narracao' ? 'italic' : ''}`} data-testid="cena-texto" aria-label={tela.texto}>
            <span aria-hidden="true">{letras.slice(0, mostradas).join('')}</span>
            <span aria-hidden="true" className="invisible">{letras.slice(mostradas).join('')}</span>
          </p>
          <p className="mt-2 text-right text-[11px] text-white/60">{!completo ? 'Toque para ver tudo' : ultima ? 'Toque para fechar' : 'Toque para continuar'} · {indice + 1}/{cena.telas.length}</p>
        </div>
      </div>
    </div>
  );
}
