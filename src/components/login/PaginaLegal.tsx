import React from 'react';
import Link from 'next/link';
import type { SecaoDeTexto } from '@/content/termos';
import { FundoDoPortal } from './FundoDoPortal';

interface PaginaLegalProps {
  titulo: string;
  secoes: readonly SecaoDeTexto[];
}

/** Página de texto legal. Com `secoes` vazia, mostra o aviso de "em elaboração" (os textos ainda serão publicados). */
export function PaginaLegal({ titulo, secoes }: PaginaLegalProps) {
  return (
    <main className="relative min-h-screen px-4 py-10 text-[#E2D6B6]">
      <FundoDoPortal />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href="/login" className="inline-block mb-6 font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#D5C7A4] hover:text-[#ED8A0C]">
          ← Voltar
        </Link>
        <article className="border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C] bg-[#1C1B18]/92 p-5 sm:p-8">
          <h1 className="font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] text-base sm:text-xl leading-relaxed [text-shadow:0_3px_0_#7a4506]">{titulo}</h1>
          {secoes.length === 0 ? (
            <p className="mt-6 text-sm sm:text-base leading-relaxed">
              Este texto está em elaboração e será publicado antes da abertura do jogo ao público. Quando ele estiver pronto, você poderá ler tudo aqui.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              {secoes.map((s) => (
                <section key={s.titulo}>
                  <h2 className="font-[family-name:var(--font-silk)] uppercase tracking-widest text-sm text-[#F5F3E0]">{s.titulo}</h2>
                  {s.paragrafos.map((p, i) => (
                    <p key={i} className="mt-3 text-sm leading-relaxed">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
