'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MENSAGEM_MAXIMA, mensagemDaManutencao, mensagemDoSistema, SISTEMAS, type ConfiguracaoDeSistemas, type SistemaId } from '@/rules/sistemas';
import { dataDoLog } from '@/lib/mestreTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';
import type { SessaoDoPainel } from '@/components/mestre/MestrePainel';

type Token = () => Promise<string>;
const VERDE = '#7BC47F';

/**
 * Sistemas e manutenção (3.5.5.2): o Dono desliga e liga cada sistema do jogo, ou fecha o jogo todo, sem deploy,
 * com mensagem ao jogador. Quem tem papel no painel continua entrando. Toda mudança pede motivo e vai para o log.
 */
export function SistemasPainel({ sessao, tokenFresco }: { sessao: SessaoDoPainel; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const pode = sessao.permissoes.includes('sistemas.gerir');
  const [config, setConfig] = useState<ConfiguracaoDeSistemas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/mestre/sistemas');
    if (r.ok) setConfig(r.dados.configuracao as ConfiguracaoDeSistemas);
    else setErro(String(r.dados.error ?? 'Não foi possível carregar.'));
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const aplicar = async (corpo: Record<string, unknown>): Promise<string | null> => {
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/mestre/sistemas', { method: 'POST', body: JSON.stringify(corpo) });
    if (!r.ok) return String(r.dados.error ?? 'Não foi possível concluir.');
    setConfig(r.dados.configuracao as ConfiguracaoDeSistemas);
    setAviso('Feito. Vale na hora nesta instância do servidor e em até 10 segundos nas outras. Está no log.');
    return null;
  };

  if (!config) {
    return <Cartao titulo="Sistemas e manutenção"><p className="text-[12px]" style={{ color: erro ? VERMELHO : colors.text.secondary }}>{erro ?? 'Carregando...'}</p></Cartao>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Cartao titulo="Modo manutenção (fecha o jogo todo)">
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>
          Com a manutenção ligada, os jogadores não entram: veem a mensagem abaixo. Quem tem papel no painel continua entrando, para testar e religar.
        </p>
        <p className="text-[12px] font-semibold" style={{ color: config.manutencao.ativa ? VERMELHO : VERDE }}>
          {config.manutencao.ativa ? 'EM MANUTENÇÃO' : 'Jogo aberto'}
        </p>
        <Controle
          key={`manutencao-${config.atualizadoEm}`}
          pode={pode}
          ligado={!config.manutencao.ativa}
          rotuloLigar="Abrir o jogo"
          rotuloDesligar="Fechar o jogo (manutenção)"
          mensagemInicial={config.manutencao.mensagem}
          dica={`Padrão: "${mensagemDaManutencao({ ...config, manutencao: { ativa: true, mensagem: '' } })}"`}
          aplicar={(ligado, mensagem, motivo) => aplicar({ alvo: 'manutencao', ativo: !ligado, mensagem, motivo })}
          perigo
        />
      </Cartao>

      {SISTEMAS.map((s) => {
        const e = config.sistemas[s.id as SistemaId];
        return (
          <Cartao key={s.id} titulo={s.nome}>
            <p className="text-[12px] font-semibold" style={{ color: e.ativo ? VERDE : VERMELHO }}>{e.ativo ? 'Ligado' : 'DESLIGADO'}</p>
            <Controle
              key={`${s.id}-${config.atualizadoEm}`}
              pode={pode}
              ligado={e.ativo}
              rotuloLigar="Ligar"
              rotuloDesligar="Desligar"
              mensagemInicial={e.mensagem}
              dica={`Padrão: "${mensagemDoSistema({ ...config, sistemas: { ...config.sistemas, [s.id]: { ativo: false, mensagem: '' } } }, s.id as SistemaId)}"`}
              aplicar={(ligado, mensagem, motivo) => aplicar({ alvo: s.id, ativo: ligado, mensagem, motivo })}
            />
          </Cartao>
        );
      })}
      {config.atualizadoEm && <p className="text-[10px]" style={{ color: colors.text.secondary }}>Última mudança: {dataDoLog(config.atualizadoEm)} por {config.atualizadoPor}</p>}
      {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: VERDE }}>{aviso}</p>}
      {!pode && <p className="text-[11px]" style={{ color: colors.text.secondary }}>Seu papel só consulta. Quem liga e desliga é o Dono.</p>}
    </div>
  );
}

/** Formulário de um interruptor: o botão leva ao estado contrário ao atual, com mensagem ao jogador e motivo. */
function Controle({
  pode,
  ligado,
  rotuloLigar,
  rotuloDesligar,
  mensagemInicial,
  dica,
  aplicar,
  perigo = false,
}: {
  pode: boolean;
  /** Estado atual: true = funcionando. */
  ligado: boolean;
  rotuloLigar: string;
  rotuloDesligar: string;
  mensagemInicial: string;
  dica: string;
  aplicar: (ligarAgora: boolean, mensagem: string, motivo: string) => Promise<string | null>;
  perigo?: boolean;
}) {
  const { colors } = NOCTHERA_THEME;
  const [mensagem, setMensagem] = useState(mensagemInicial);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  if (!pode) return mensagemInicial ? <p className="text-[11px]" style={{ color: colors.text.secondary }}>Mensagem: {mensagemInicial}</p> : null;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setOcupado(true);
        setErro(null);
        const falha = await aplicar(!ligado, mensagem, motivo);
        setOcupado(false);
        if (falha) setErro(falha);
        else setMotivo('');
      }}
    >
      <label className="text-[11px] flex flex-col gap-0.5">Mensagem ao jogador ({mensagem.length}/{MENSAGEM_MAXIMA}; vazio = a padrão)
        <textarea value={mensagem} rows={2} maxLength={MENSAGEM_MAXIMA} onChange={(e) => setMensagem(e.target.value)} className={campo} style={estilo} />
      </label>
      <p className="text-[10px]" style={{ color: colors.text.secondary }}>{dica}</p>
      <label className="text-[11px] flex flex-col gap-0.5">Motivo (vai para o log)
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} style={estilo} required minLength={5} maxLength={300} />
      </label>
      <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: (perigo ? ligado : !ligado) ? VERMELHO : colors.accent.primary, color: colors.background.secondary }}>
        {ligado ? rotuloDesligar : rotuloLigar}
      </button>
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </form>
  );
}
