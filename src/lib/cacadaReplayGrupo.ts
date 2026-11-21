import { sobreescudoInicialDoMonstro } from '@/game/combate/sobreescudoMonstro';
import type { ReplayDoTeste } from '@/rules/testeEquipe';
import { acaoDoAtaque, textoDoAtaque, textoDoEvento, type AcaoDaLuta, type LinhaLog, type PainelLuta } from '@/lib/cacadaReplay';

/**
 * A luta em grupo (Teste de Equipe) vira quadros, como a luta de um herói só (`montarQuadros`): um por golpe e um no fim do turno de
 * cada aliado com os efeitos. A cada rodada, cada aliado de pé age na ordem e o chefe responde a ele; as barras do chefe são as
 * mesmas para todos (a vida dele vem de cada golpe, já com o dano dos outros).
 */
export type QuemAgiu = { lado: 'aliado'; i: number } | { lado: 'chefe'; alvo: number } | null;

export interface QuadroGrupo {
  rodada: number;
  linhas: LinhaLog[];
  aliados: PainelLuta[];
  chefe: PainelLuta;
  agiu: QuemAgiu;
  /** `de` = 'jogador' para um aliado e 'monstro' para o chefe. */
  acao: AcaoDaLuta | null;
}

export function montarQuadrosEmGrupo(replay: ReplayDoTeste, maxLinhas = 5): QuadroGrupo[] {
  const aliados: PainelLuta[] = replay.aliados.map((a) => ({
    nome: a.nome, nivel: a.nivel, hp: a.hpMax, hpMax: a.hpMax, escudo: a.sobreescudoMax, escudoMax: a.sobreescudoMax, status: [], enfurecido: false,
  }));
  const escudoInicial = sobreescudoInicialDoMonstro(replay.chefe.hp);
  const chefe: PainelLuta = { nome: replay.chefe.nome, nivel: replay.chefe.nivel, hp: replay.chefe.hp, hpMax: replay.chefe.hp, escudo: escudoInicial, escudoMax: escudoInicial, status: [], enfurecido: false };
  const indiceDe = (nome: string) => aliados.findIndex((a) => a.nome === nome);
  const painelDe = (nome: string) => (nome === chefe.nome ? chefe : (aliados[indiceDe(nome)] ?? chefe));

  const linhas: LinhaLog[] = [];
  const quadros: QuadroGrupo[] = [];
  const empurrar = (rodada: number, agiu: QuemAgiu = null, acao: AcaoDaLuta | null = null) => {
    quadros.push({
      rodada,
      linhas: linhas.slice(-maxLinhas),
      aliados: aliados.map((a) => ({ ...a, status: [...a.status] })),
      chefe: { ...chefe, status: [...chefe.status] },
      agiu,
      acao,
    });
  };

  empurrar(1);
  // os turnos de todos, na ordem em que aconteceram (rodada e, dentro dela, a ordem dos aliados)
  const sequencia = replay.turnos.flatMap((lista, i) => lista.map((t) => ({ i, rodada: t.rodada, turno: t.turno })));
  sequencia.sort((a, b) => a.rodada - b.rodada || a.i - b.i);
  for (const { i, rodada, turno } of sequencia) {
    const dono = aliados[i];
    for (const a of turno.ataques) {
      const def = painelDe(a.defensor);
      const atk = painelDe(a.atacante);
      def.hp = Math.max(0, a.hpRestante);
      def.escudo = Math.max(0, a.sobreescudoRestante);
      def.escudoMax = Math.max(def.escudoMax, def.escudo);
      if (a.curaHp) atk.hp = Math.min(atk.hpMax, atk.hp + a.curaHp);
      if (a.danoRedirecionado) atk.hp = Math.max(0, atk.hp - a.danoRedirecionado);
      if (a.enfurecidoAtivo && !atk.enfurecido) {
        atk.enfurecido = true;
        linhas.push({ texto: `${a.atacante} está Enfurecido!`, tipo: 'info' });
      }
      linhas.push(...textoDoAtaque(a));
      const doChefe = a.atacante === chefe.nome;
      const agente = a.incapacitado || a.distraido ? null : doChefe ? 'monstro' : 'jogador';
      const agiu: QuemAgiu = !agente ? null : doChefe ? { lado: 'chefe', alvo: Math.max(0, indiceDe(a.defensor)) } : { lado: 'aliado', i: Math.max(0, indiceDe(a.atacante)) };
      empurrar(rodada, agiu, agente ? acaoDoAtaque(a, agente) : null);
    }
    for (const texto of turno.eventosMecanica ?? []) linhas.push({ texto, tipo: 'info' });
    const eventos = turno.eventosEfeitos ?? [];
    if (eventos.length > 0 || (turno.eventosCura?.length ?? 0) > 0) {
      for (const e of eventos) {
        const painel = e.alvo ? painelDe(e.alvo) : dono;
        if (e.tipo === 'aplicado' || e.tipo === 'renovado' || e.tipo === 'controle' || e.tipo === 'instantaneo') {
          if (!painel.status.includes(e.efeito)) painel.status.push(e.efeito);
        }
        if (e.tipo === 'expirado' || e.tipo === 'removido') painel.status = painel.status.filter((s) => s !== e.efeito);
        if ((e.tipo === 'dano' || e.tipo === 'instantaneo') && e.dano) painel.hp = Math.max(0, painel.hp - e.dano);
        const l = textoDoEvento(e, dono.nome);
        if (l) linhas.push(l);
      }
      for (const c of turno.eventosCura ?? []) {
        const painel = painelDe(c.combatente);
        if (c.tipo === 'ressurreicao') {
          painel.hp = Math.min(painel.hpMax, c.valor);
          linhas.push({ texto: `${c.combatente} voltou à luta com ${Math.round(c.valor)} de vida!`, tipo: 'cura' });
        } else if (c.valor) {
          painel.hp = Math.min(painel.hpMax, painel.hp + c.valor);
          linhas.push({ texto: `${c.combatente} recuperou ${Math.round(c.valor)} de vida.`, tipo: 'cura' });
        }
      }
      empurrar(rodada);
    }
  }

  // Fim: o chefe cai na vitória; na derrota, quem não está de pé fica com a vida zerada
  if (replay.venceu) chefe.hp = 0;
  linhas.push({ texto: replay.venceu ? `${chefe.nome} foi abatido!` : `${chefe.nome} resistiu.`, tipo: 'info' });
  empurrar(quadros[quadros.length - 1]?.rodada ?? 1);
  return quadros;
}
