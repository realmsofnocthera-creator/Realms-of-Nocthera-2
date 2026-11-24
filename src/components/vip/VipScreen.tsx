'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { ARENA_UI } from '@/assets/arenaUi';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { BarraVip } from '@/components/vip/BarraVip';
import { PreviaDaRecompensa } from '@/components/vip/PreviaDaRecompensa';
import { previaDaRecompensa } from '@/assets/vipArte';
import { NIVEIS_DO_VIP, nivelDoVip, NIVEL_MAXIMO_DO_VIP } from '@/rules/vip';
import { NOME_DO_TIPO_DE_RECOMPENSA, recompensaDisponivel, recompensasDoNivel, recompensasParaResgatar, type RecompensaDoVip, type TipoDeRecompensaVip } from '@/rules/vipRecompensas';

const OURO = '#C8A656';
const CREME = '#F5E3B3';

const ESTILOS = `
@keyframes vp-brilho { 0% { transform: translateX(-130%) skewX(-18deg); } 55%, 100% { transform: translateX(260%) skewX(-18deg); } }
@keyframes vp-pulso { 0%, 100% { opacity: .6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes vp-flutua { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.vp-brilho { position: relative; overflow: hidden; }
.vp-brilho::after { content: ''; position: absolute; inset: 0; width: 38%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent); animation: vp-brilho 3.6s ease-in-out infinite; pointer-events: none; }
.vp-pulso { animation: vp-pulso 2.2s ease-in-out infinite; }
.vp-flutua { animation: vp-flutua 3s ease-in-out infinite; }
.vp-pix { image-rendering: pixelated; }
@media (prefers-reduced-motion: reduce) { .vp-brilho::after, .vp-pulso, .vp-flutua { animation: none !important; } }
`;

const GEMA_POR_TIPO: Readonly<Record<TipoDeRecompensaVip, string>> = { moldura: '▣', titulo: '✦', skin: '♜', aura: '✺', efeito: '✧', emblema: '❖', decoracao: '❝' };

/** Uma recompensa do nível: medalhão com a moldura da Coleção, o tipo e o nome, e o estado (resgatada, pronta, arte em produção ou bloqueada). */
function CartaoDeRecompensa({ x, nivelDoJogador, resgatada }: { x: RecompensaDoVip; nivelDoJogador: number; resgatada: boolean }) {
  const aberto = x.nivel <= nivelDoJogador;
  const previa = previaDaRecompensa(x);
  const pronta = aberto && recompensaDisponivel(x) && !resgatada;
  const moldura = pronta ? TELAS_UI.molduraDourada : aberto ? TELAS_UI.molduraAzul : TELAS_UI.molduraCinza;
  const estado = resgatada ? 'Resgatada' : !aberto ? 'Bloqueada' : recompensaDisponivel(x) ? 'Pronta para resgatar' : x.arte ? 'Arte pronta, entrega em breve' : 'Arte em produção';
  return (
    <li aria-label={`${NOME_DO_TIPO_DE_RECOMPENSA[x.tipo]}: ${x.nome}. ${estado}`} className="flex flex-col items-center gap-1 text-center">
      <div className={`relative w-full max-w-[110px] ${pronta ? 'vp-brilho' : ''}`} style={{ aspectRatio: '1 / 1' }}>
        <div className="absolute flex items-center justify-center overflow-hidden" style={{ inset: '10%', background: pronta ? 'radial-gradient(circle, rgba(243,177,60,.4), #2a1a06 70%)' : 'radial-gradient(circle, rgba(90,167,240,.18), #0e1418 70%)', filter: aberto ? undefined : 'grayscale(1) brightness(.55)' }}>
          {previa ? (
            <PreviaDaRecompensa previa={previa} descricao={`${NOME_DO_TIPO_DE_RECOMPENSA[x.tipo]}: ${x.nome}`} />
          ) : (
            <span className={pronta ? 'vp-flutua' : ''} style={{ fontSize: 34, color: pronta ? '#FFE2A3' : '#BFE0FF', textShadow: `0 0 10px ${pronta ? '#F3B13C' : '#5AA7F0'}` }} aria-hidden="true">{GEMA_POR_TIPO[x.tipo]}</span>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={moldura} alt="" aria-hidden="true" draggable={false} className="vp-pix absolute inset-0 w-full h-full" />
        {!aberto && <Lock className="absolute right-[14%] bottom-[14%] w-4 h-4" style={{ color: '#C9C0A8' }} aria-hidden="true" />}
        {resgatada && <span className="absolute right-[10%] bottom-[10%] text-[8px] font-black px-1 rounded-sm" style={{ backgroundColor: '#3a7a3d', color: '#E6FFE6' }}>✓</span>}
      </div>
      <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: OURO }}>{NOME_DO_TIPO_DE_RECOMPENSA[x.tipo]}</span>
      <span className="text-[10px] font-bold leading-tight" style={{ color: CREME }}>{x.nome}</span>
      <span className="text-[8px] uppercase tracking-wider" style={{ color: pronta ? '#9fd4a0' : '#9a8f78' }}>{estado}</span>
    </li>
  );
}

/**
 * A tela do VIP: o nível do jogador e, com as setas, as recompensas e os bônus de cada nível (sem dizer quantos pontos faltam para chegar neles).
 * Quando há recompensas para resgatar, aparece o baú com o botão "Resgatar" embaixo delas.
 */
export function VipScreen({ gastoCentavos, vipResgatados, aoResgatar }: {
  gastoCentavos: number | undefined;
  vipResgatados: readonly string[] | undefined;
  aoResgatar: () => Promise<{ ok: boolean; mensagem: string }>;
}) {
  const nivelDoJogador = nivelDoVip(gastoCentavos);
  const [visto, setVisto] = useState(nivelDoJogador);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const nivel = NIVEIS_DO_VIP[visto];
  const recompensas = recompensasDoNivel(visto);
  const feitas = useMemo(() => new Set(vipResgatados ?? []), [vipResgatados]);
  const paraResgatar = recompensasParaResgatar({ gastoReal: gastoCentavos, vipResgatados });
  const estado = visto < nivelDoJogador ? 'Conquistado' : visto === nivelDoJogador ? 'Seu nível' : 'Próximo';
  const conquistado = visto <= nivelDoJogador;

  async function resgatar() {
    setOcupado(true);
    setAviso(null);
    const r = await aoResgatar();
    setOcupado(false);
    setAviso({ texto: r.mensagem, erro: !r.ok });
  }

  const bonus: string[] = [];
  if (nivel.xp > 0) bonus.push(`+${nivel.xp}% de XP nos combates`);
  if (nivel.ouro > 0) bonus.push(`+${nivel.ouro}% de ouro nos combates`);
  if (nivel.ouroDiario > 0) bonus.push(`${nivel.ouroDiario} de ouro por dia pelo Correio`);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 pb-10" style={{ backgroundColor: '#0D0A07', backgroundImage: `radial-gradient(ellipse at top, rgba(194,123,240,.3) 0%, rgba(13,10,7,0) 55%), linear-gradient(rgba(10,7,5,.8), rgba(10,7,5,.94)), url(${TELAS_UI.fundoPerfil})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed', color: CREME }}>
      <style>{ESTILOS}</style>
      <div className="w-full max-w-[520px] flex flex-col gap-4">
        <div className="flex items-center gap-2 pt-3">
          <Link href="/loja-premium" aria-label="Voltar à Loja" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-cinzel font-black italic uppercase tracking-[0.22em] text-xl" style={{ color: '#FFE2A3', textShadow: '0 2px 0 #1A120B, 0 0 18px rgba(243,177,60,.55)' }}>VIP</h1>
        </div>

        <BarraVip gastoCentavos={gastoCentavos} href="/vip" />

        {/* o seletor de nível: as setas e os pontinhos */}
        <nav aria-label="Níveis do VIP" className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setVisto((v) => Math.max(0, v - 1))} disabled={visto === 0} aria-label="Nível anterior" className="p-1.5 rounded-sm border disabled:opacity-30 cursor-pointer" style={{ borderColor: OURO, backgroundColor: 'rgba(34,28,22,.95)' }}><ChevronLeft className="w-5 h-5" /></button>
          <ol className="flex flex-wrap items-center justify-center gap-1" aria-label="Escolher nível">
            {NIVEIS_DO_VIP.map((n) => (
              <li key={n.nivel}>
                <button type="button" onClick={() => setVisto(n.nivel)} aria-label={`VIP ${n.nivel}`} aria-current={n.nivel === visto ? 'true' : undefined} className="w-5 h-5 rounded-full text-[9px] font-black cursor-pointer" style={{ border: `1px solid ${n.nivel <= nivelDoJogador ? OURO : '#5b4a2e'}`, backgroundColor: n.nivel === visto ? OURO : n.nivel <= nivelDoJogador ? 'rgba(200,166,86,.25)' : 'rgba(20,14,9,.9)', color: n.nivel === visto ? '#1A140E' : '#E9D9AE' }}>{n.nivel}</button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setVisto((v) => Math.min(NIVEL_MAXIMO_DO_VIP, v + 1))} disabled={visto === NIVEL_MAXIMO_DO_VIP} aria-label="Próximo nível" className="p-1.5 rounded-sm border disabled:opacity-30 cursor-pointer" style={{ borderColor: OURO, backgroundColor: 'rgba(34,28,22,.95)' }}><ChevronRight className="w-5 h-5" /></button>
        </nav>

        {/* o nível visto */}
        <section aria-label={`VIP ${nivel.nivel}: ${nivel.nome}`} className={`rounded-sm p-3 flex flex-col gap-3 ${conquistado ? 'vp-brilho' : ''}`} style={{ background: 'linear-gradient(180deg, rgba(40,28,14,.97), rgba(14,10,7,.98))', border: `1.5px solid ${conquistado ? '#F3B13C' : '#5b4a2e'}`, boxShadow: conquistado ? '0 0 22px rgba(243,177,60,.4), inset 0 0 26px rgba(243,177,60,.1)' : 'inset 0 0 20px rgba(0,0,0,.5)' }}>
          <header className="flex items-center gap-3">
            <span className="relative shrink-0" style={{ width: 62, height: 65, filter: conquistado ? undefined : 'grayscale(.9) brightness(.7)' }} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/perfil/losango.webp" alt="" draggable={false} className="vp-pix absolute inset-0 w-full h-full" />
              <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black text-2xl" style={{ color: '#FFF1CC', textShadow: '0 2px 0 #1a0d2b' }}>{nivel.nivel}</span>
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: conquistado ? '#9fd4a0' : '#C8A25A' }}>{estado}</p>
              <h2 className="font-cinzel font-black text-xl" style={{ color: CREME }}>{nivel.nome}</h2>
              <p className="text-[10px]" style={{ color: '#C8A25A' }}>VIP {nivel.nivel} de {NIVEL_MAXIMO_DO_VIP}</p>
            </div>
          </header>

          <div>
            <h3 className="font-cinzel font-black uppercase tracking-widest text-[11px] mb-1" style={{ color: OURO }}>Bônus</h3>
            {bonus.length || nivel.beneficios.some((b) => b.estado === 'ativo') ? (
              <ul className="text-[11px] flex flex-col gap-0.5 list-disc pl-4" style={{ color: '#E9D9AE' }}>
                {bonus.map((b) => <li key={b}>{b}</li>)}
                {nivel.beneficios.filter((b) => b.estado === 'ativo').map((b) => <li key={b.texto}>{b.texto}</li>)}
              </ul>
            ) : <p className="text-[11px]" style={{ color: '#9a8f78' }}>Sem bônus neste nível.</p>}
            <p className="text-[9px] mt-1" style={{ color: '#9a8f78' }}>Os bônus de XP e de ouro de um nível substituem os do anterior (não somam).</p>
          </div>

          <div>
            <h3 className="font-cinzel font-black uppercase tracking-widest text-[11px] mb-1.5" style={{ color: OURO }}>Recompensas exclusivas</h3>
            {recompensas.length ? (
              <ul className={`grid gap-2 ${recompensas.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {recompensas.map((x) => <CartaoDeRecompensa key={x.id} x={x} nivelDoJogador={nivelDoJogador} resgatada={feitas.has(x.id)} />)}
              </ul>
            ) : <p className="text-[11px]" style={{ color: '#9a8f78' }}>Este nível só traz os bônus acima.</p>}
          </div>
        </section>

        {/* o baú: só aparece quando há o que resgatar */}
        {paraResgatar.length > 0 && (
          <section aria-label="Recompensas para resgatar" className="flex items-center justify-center gap-3 rounded-sm p-3" style={{ background: 'linear-gradient(180deg, rgba(60,40,12,.9), rgba(20,14,8,.95))', border: '1px solid #F3B13C', boxShadow: '0 0 18px rgba(243,177,60,.5)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TELAS_UI.bauAberto} alt="" aria-hidden="true" draggable={false} className="vp-pix vp-flutua" style={{ width: 54, filter: 'drop-shadow(0 0 10px #F3B13C)' }} />
            <div className="flex flex-col gap-1 leading-tight">
              <span className="text-[11px] font-bold" style={{ color: CREME }}>{paraResgatar.length === 1 ? '1 recompensa para resgatar' : `${paraResgatar.length} recompensas para resgatar`}</span>
              <button type="button" onClick={() => void resgatar()} disabled={ocupado} className="relative h-9 w-40 font-cinzel font-black uppercase tracking-widest text-[13px] cursor-pointer disabled:opacity-60" style={{ color: '#2A1A06' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ARENA_UI.botao} alt="" aria-hidden="true" draggable={false} className="vp-pix absolute inset-0 w-full h-full" />
                <span className="relative">{ocupado ? 'Resgatando...' : 'Resgatar'}</span>
              </button>
            </div>
          </section>
        )}
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm text-center font-semibold" style={{ color: aviso.erro ? '#FF9A8F' : '#9fd4a0' }}>{aviso.texto}</p>}
      </div>
    </main>
  );
}
