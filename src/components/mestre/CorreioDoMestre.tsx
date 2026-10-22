'use client';

import React, { useState } from 'react';
import { NOME_DO_CAMPO, type CampoDeAjuste } from '@/rules/ajustes';
import { TEXTO_MAXIMO, TITULO_MAXIMO } from '@/rules/correio';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from './comum';

type Token = () => Promise<string>;

/** Os campos de presente que o Correio aceita (os mesmos nomes dos ajustes). */
const CAMPOS_DO_PRESENTE: readonly CampoDeAjuste[] = [
  'ouro',
  'diamantes',
  'essenciaDeSoberano',
  'seloDesgastado',
  'seloEncantado',
  'seloEternidade',
  'seloOrigem',
  'fragmentosDeMemoria',
  'pedrasDaRecordacao',
  'avancosDeExpedicao',
];

/** Mandar uma mensagem pelo Correio, com ou sem presente, para o jogador aberto ou para todos (só o Dono). */
export function CorreioDoMestre({ tokenFresco, jogador }: { tokenFresco: Token; jogador: { uid: string; nome: string } | null }) {
  const { colors } = NOCTHERA_THEME;
  const [destino, setDestino] = useState<'jogador' | 'todos'>(jogador ? 'jogador' : 'todos');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [valores, setValores] = useState<Partial<Record<CampoDeAjuste, string>>>({});
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const paraTodos = destino === 'todos' || !jogador;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (paraTodos && !window.confirm('Mandar esta mensagem para TODOS os jogadores?')) return;
    setOcupado(true);
    setAviso(null);
    const campos = Object.fromEntries(Object.entries(valores).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, Number(v)]));
    const r = await chamar(tokenFresco, '/api/mestre/correio', {
      method: 'POST',
      body: JSON.stringify({ destino: paraTodos ? 'todos' : jogador!.uid, titulo, texto, campos }),
    });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível mandar.'), erro: true });
      return;
    }
    setAviso({ texto: paraTodos ? 'Mensagem enviada para todos. Está no log.' : `Mensagem enviada para ${jogador!.nome}. Está no log.`, erro: false });
    setTitulo('');
    setTexto('');
    setValores({});
  }

  return (
    <Cartao titulo="Correio">
      <form className="flex flex-col gap-2" onSubmit={enviar}>
        <div role="radiogroup" aria-label="Destino" className="flex gap-3 text-[12px]">
          <label className="flex items-center gap-1" style={{ opacity: jogador ? 1 : 0.5 }}>
            <input type="radio" name="destino" checked={!paraTodos} disabled={!jogador} onChange={() => setDestino('jogador')} />
            {jogador ? `Só para ${jogador.nome}` : 'Só para um jogador (busque acima)'}
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="destino" checked={paraTodos} onChange={() => setDestino('todos')} />
            Para todos
          </label>
        </div>
        <input className={campo} style={estiloCampo} value={titulo} maxLength={TITULO_MAXIMO} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" aria-label="Título da mensagem" />
        <textarea className={campo} style={estiloCampo} value={texto} maxLength={TEXTO_MAXIMO} rows={3} onChange={(e) => setTexto(e.target.value)} placeholder="Texto" aria-label="Texto da mensagem" />
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>Presente (opcional): deixe em branco o que não vai junto.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {CAMPOS_DO_PRESENTE.map((c) => (
            <label key={c} className="text-[11px] flex flex-col gap-0.5">
              {NOME_DO_CAMPO[c]}
              <input
                className={campo}
                style={estiloCampo}
                inputMode="numeric"
                value={valores[c] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [c]: e.target.value.replace(/[^0-9]/g, '') }))}
              />
            </label>
          ))}
        </div>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-[12px]" style={{ color: aviso.erro ? VERMELHO : '#7BC47F' }}>{aviso.texto}</p>}
        <div>
          <button type="submit" disabled={ocupado || titulo.trim().length < 3 || texto.trim().length < 3} className="rounded-sm border px-3 py-1 text-[12px] font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
            {paraTodos ? 'Mandar para todos' : 'Mandar'}
          </button>
        </div>
      </form>
    </Cartao>
  );
}
