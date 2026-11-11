'use client';

import React, { useEffect, useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { resolveAvatarSrc } from '@/assets/avatars';
import { EMBLEMAS_UI, ESPACOS_DO_CIRCULO } from '@/assets/emblemasUi';
import { BRASAO_DE_EMBLEMA } from '@/assets/resgateUi';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { SLOTS_EMBLEMA } from '@/game/emblemas';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { atributosDoEmblemaEmTexto, atributosDosEquipadosEmTexto, habilidadesEmAcao, inventarioDeEmblemas, slotsDeEmblema } from '@/lib/emblemasTela';
import { BotaoRedondo, PainelDaForja } from '@/components/forja/KitDaForja';
import { Estrelas } from './FichaEmblemas';

interface FichaEmblemasPixelProps {
  character: CharacterDocument;
  /** Equipa ou desequipa um emblema pelo id. Devolve a mensagem de erro, se houver. */
  onEmblemaAcao?: (id: string, acao: 'equipar' | 'desequipar') => Promise<string | null>;
  /** Funde emblemas iguais (mesmo tipo e estrela). */
  onFundirEmblemas?: (tipo: string, estrelas: number) => Promise<string | null>;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const CONTORNO = '0.2cqw 0 0 #05070D, -0.2cqw 0 0 #05070D, 0 0.2cqw 0 #05070D, 0 -0.2cqw 0 #05070D';

/** Uma placa de texto sobre uma das molduras (título ou botão): o texto fica centrado entre as pontas ornamentadas. */
function Placa({ src, aspecto, largura, children, onClick, rotulo, margens = [14, 14] }: { src: string; aspecto: string; largura: string; children: React.ReactNode; onClick?: () => void; rotulo?: string; margens?: [number, number] }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-label={rotulo} className={`relative block shrink-0 ${onClick ? 'cursor-pointer active:translate-y-px' : ''}`} style={{ width: largura, aspectRatio: aspecto }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
      <span className="absolute inset-y-0 flex items-center justify-center font-cinzel font-extrabold uppercase tracking-wide leading-[1.4] text-[#DFF3FF] text-center" style={{ left: `${margens[0]}%`, right: `${margens[1]}%`, fontSize: '2.7cqw', textShadow: CONTORNO }}>
        <span className="truncate">{children}</span>
      </span>
    </Tag>
  );
}

/** O inventário de emblemas em pop-up: equipar, desequipar e fundir emblemas iguais (as regras são as de antes). */
function InventarioDeEmblemas({ character, aoFechar, onEmblemaAcao, onFundirEmblemas }: { character: CharacterDocument; aoFechar: () => void } & Pick<FichaEmblemasPixelProps, 'onEmblemaAcao' | 'onFundirEmblemas'>) {
  const t = TEXTOS_DA_FICHA.emblemas;
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = inventarioDeEmblemas(character);
  const ocupados = (character.emblemasEquipados ?? []).length;
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);

  const executar = async (acao: () => Promise<string | null> | undefined) => {
    setOcupado(true);
    setErro(null);
    const msg = (await acao()) ?? null;
    setOcupado(false);
    if (msg) setErro(msg);
  };
  const botao = 'font-cinzel font-extrabold uppercase text-[2.1cqw] leading-none px-[2cqw] py-[1.2cqw] border cursor-pointer active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div role="dialog" aria-modal="true" aria-label={t.inventario} onClick={aoFechar} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[4cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.62)', left: 0, right: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[92cqw]">
        <BotaoRedondo tipo="x" rotulo={TEXTOS_DA_FICHA.conta.fechar} onClick={aoFechar} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
        <PainelDaForja borda="3cqw" className="max-h-[86dvh] overflow-y-auto forja-rolagem">
          <div className="flex flex-col gap-[2cqw]">
            <h2 className="font-cinzel font-extrabold uppercase text-[3.2cqw] leading-tight text-[#DFF3FF]" style={{ textShadow: CONTORNO }}>
              {t.titulo} <span className="text-[2.4cqw] text-[#9CC4E0]">({textoDaFicha(t.equipados, { n: ocupados, max: SLOTS_EMBLEMA })})</span>
            </h2>
            {erro && <p role="alert" className="font-cinzel font-bold text-[2.4cqw] text-[#FFB4B4]">{erro}</p>}
            {grupos.length === 0 ? (
              <p role="status" className="font-cinzel font-bold text-[2.7cqw] text-center leading-snug text-[#9CC4E0] py-[5cqw]">{t.semInventario}</p>
            ) : (
              grupos.map((g) => (
                <div key={g.tipo.id} className="flex flex-col gap-[1.2cqw] p-[2cqw] border bg-[#080C16]/80" style={{ borderColor: `${g.cor}99` }}>
                  <div>
                    <div className="font-cinzel font-extrabold text-[2.9cqw] leading-tight" style={{ color: g.cor, textShadow: CONTORNO }}>Emblema {g.nome}</div>
                    <div className="font-cinzel text-[2.1cqw] text-[#9CC4E0]">{g.raridadeNome}</div>
                  </div>
                  <p className="font-cinzel text-[2.1cqw] text-[#C9D6EA]">Atributos: {g.tipo.atributos.map((a) => ATTRIBUTE_DISPLAY_NAMES[a]).join(', ')}</p>
                  <ul className="flex flex-col gap-[0.6cqw]">
                    {g.tipo.habilidades.map((h, i) => (
                      <li key={h.nome} className="font-cinzel text-[2.1cqw] leading-snug text-[#E9DDC0]"><Estrelas n={i + 1} /> <b>{h.nome}:</b> {h.descricao}</li>
                    ))}
                  </ul>
                  {g.porEstrela.map((e) => (
                    <div key={e.estrelas} className="flex items-center gap-[1.4cqw] flex-wrap border-t border-[#2B5C80] pt-[1.2cqw]">
                      <span className="font-cinzel font-bold text-[2.3cqw] text-[#F5F3E0]">
                        <Estrelas n={e.estrelas} /> x{e.total}{' '}
                        <span className="text-[2cqw] font-normal text-[#9CC4E0]">({atributosDoEmblemaEmTexto({ tipo: g.tipo.id, estrelas: e.estrelas })} cada){e.equipados > 0 ? ` · ${e.equipados === 1 ? t.equipadoUm : textoDaFicha(t.equipadoVarios, { n: e.equipados })}` : ''}</span>
                      </span>
                      <span className="flex-1" />
                      {e.equipados > 0 && (
                        <button type="button" disabled={ocupado} onClick={() => void executar(() => onEmblemaAcao?.(e.idsEquipados[0], 'desequipar'))} className={`${botao} border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]`}>{t.desequipar}</button>
                      )}
                      {e.livres.length > 0 && (
                        <button type="button" disabled={ocupado || ocupados >= SLOTS_EMBLEMA} onClick={() => void executar(() => onEmblemaAcao?.(e.livres[0], 'equipar'))} className={`${botao} border-[#6FE3EE] text-[#DFF3FF] bg-[#0F5A6E]`}>{t.equipar}</button>
                      )}
                      {e.custoDaFusao !== null && (
                        <button type="button" disabled={ocupado || !e.podeFundir} onClick={() => void executar(() => onFundirEmblemas?.(g.tipo.id, e.estrelas))} className={`${botao} bg-[#0B1220]`} style={{ borderColor: g.cor, color: g.cor }} title={`Funde ${e.custoDaFusao} emblemas iguais em 1 com uma estrela a mais`}>{textoDaFicha(t.fundir, { n: e.custoDaFusao })}</button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </PainelDaForja>
      </div>
    </div>
  );
}

/**
 * A aba Emblemas da ficha em pixel (molduras do Yuri): o personagem à esquerda e, à direita, o círculo com os 4 espaços
 * de emblema; embaixo, as habilidades que os emblemas dão e o botão do inventário. Tocar num espaço abre o inventário.
 * Os emblemas ainda não têm arte própria: usam o brasão do Yuri, com a cor da raridade na moldura e as estrelas.
 */
export function FichaEmblemasPixel({ character, onEmblemaAcao, onFundirEmblemas, className = '' }: FichaEmblemasPixelProps) {
  const t = TEXTOS_DA_FICHA.emblemas;
  const [aberto, setAberto] = useState(false);
  const slots = slotsDeEmblema(character);
  const habilidades = habilidadesEmAcao(character);
  const atributos = atributosDosEquipadosEmTexto(character);
  const avatarSrc = resolveAvatarSrc(character.avatarId, character.classeId);

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3cqw] flex flex-col items-center gap-[2cqw] ${className}`}>
      <div className="flex items-end justify-center w-full shrink-0 gap-[1cqw]">
        <div className="shrink-0 flex items-end justify-center pointer-events-none" style={{ width: '40cqw', height: '58cqw' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt={`Arte de corpo inteiro de ${character.nome}`} draggable={false} className="h-full w-auto max-w-full object-contain object-bottom select-none drop-shadow-[0_1.4cqw_2cqw_rgba(0,0,0,0.9)]" />
        </div>
        <section aria-label={t.titulo} className="relative shrink-0" style={{ width: '54cqw', aspectRatio: '620 / 627' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={EMBLEMAS_UI.circulo} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
          {slots.map((s) => {
            const [x, y] = ESPACOS_DO_CIRCULO.centros[s.indice];
            return (
              <button key={s.indice} type="button" onClick={() => setAberto(true)} aria-label={s.emblema ? `${textoDaFicha(t.espaco, { n: s.indice + 1 })}: Emblema ${s.emblema.nome}. Trocar` : `${textoDaFicha(t.espaco, { n: s.indice + 1 })}: ${t.vazio.toLowerCase()}`} className="absolute flex flex-col items-center justify-center cursor-pointer active:translate-y-px" style={{ left: `${x}%`, top: `${y}%`, width: `${ESPACOS_DO_CIRCULO.lado}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
                {s.emblema ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={BRASAO_DE_EMBLEMA} alt="" aria-hidden="true" draggable={false} className="w-[78%] h-[78%] object-contain" style={{ ...pixel, filter: `drop-shadow(0 0 1.6cqw ${s.emblema.cor})` }} />
                    <Estrelas n={s.emblema.estrelas} className="absolute -bottom-[0.6cqw] text-[2.6cqw] leading-none [text-shadow:0_0_2px_#05070D,0_0_2px_#05070D]" />
                  </>
                ) : (
                  <span className="font-cinzel font-black text-[5cqw] leading-none text-[#3A4A66]">+</span>
                )}
              </button>
            );
          })}
        </section>
      </div>

      <Placa src={EMBLEMAS_UI.painelLargo} aspecto="900 / 198" largura="86cqw" margens={[10, 10]}>{t.habilidades}</Placa>
      <section aria-label={t.habilidades} className="w-full shrink-0">
        <PainelDaForja borda="2.6cqw" className="flex flex-col gap-[1.4cqw]">
          {atributos && (
            <p className="font-cinzel font-bold text-[2.3cqw] leading-snug text-[#EDB44C]" aria-label={t.atributos}>
              {t.atributos}: <span className="text-[#F5F3E0]">{atributos}</span>
            </p>
          )}
          {habilidades.length === 0 ? (
            <p role="status" className="font-cinzel font-bold text-[2.5cqw] text-center leading-snug text-[#9CC4E0] py-[2cqw]">{t.semEmblemas}</p>
          ) : (
            habilidades.map((h) => (
              <div key={`${h.tipoNome}-${h.nome}`} className="font-cinzel leading-snug border-b border-dashed border-[#2B3F5C] pb-[1.2cqw] last:border-b-0">
                <span className="font-extrabold text-[2.6cqw]" style={{ color: h.cor, textShadow: CONTORNO }}>{h.nome}</span>
                <span className="font-black text-[2.4cqw] text-[#EDB44C]"> · Nv. {h.nivel}/4{h.multiplicador !== 1 ? ` (×${String(h.multiplicador).replace('.', ',')})` : ''}</span>
                {!h.vale && <span className="font-bold text-[2.1cqw] text-[#8FA3BF]"> · {t.naoVale}</span>}
                <span className="block text-[2.2cqw] text-[#E9DDC0]">{h.descricao}</span>
              </div>
            ))
          )}
        </PainelDaForja>
      </section>

      <Placa src={EMBLEMAS_UI.barraA} aspecto="520 / 131" largura="62cqw" onClick={() => setAberto(true)} rotulo={t.inventario} margens={[16, 14]}>{t.inventario}</Placa>

      {aberto && <InventarioDeEmblemas character={character} aoFechar={() => setAberto(false)} onEmblemaAcao={onEmblemaAcao} onFundirEmblemas={onFundirEmblemas} />}
    </div>
  );
}
