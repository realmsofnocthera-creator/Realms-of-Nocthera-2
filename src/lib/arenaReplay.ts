import type { ResultadoCombatePvp } from '@/game/combat';
import type { EfeitoStatus } from '@/rules/statusEffects';
import type { PainelLuta } from '@/lib/cacadaReplay';

/** Um lado da luta como a tela mostra (vida e escudo do começo). */
export interface LadoDoReplay {
  nome: string;
  nivel: number;
  hpMax: number;
  sobreescudo: number;
}

export interface QuadroDaArena {
  rodada: number;
  a: PainelLuta;
  b: PainelLuta;
  /** As últimas linhas do log (a mais nova por último). */
  linhas: string[];
}

const painel = (l: LadoDoReplay): PainelLuta => ({ nome: l.nome, nivel: l.nivel, hp: l.hpMax, hpMax: l.hpMax, escudo: l.sobreescudo, escudoMax: Math.max(1, l.sobreescudo), status: [], enfurecido: false });

/**
 * Os quadros do replay da Arena: um por golpe, com a vida e o escudo de quem apanhou (o log traz o que sobrou depois
 * de cada golpe), os status de cada lado (o PvP põe o nome do alvo nos eventos) e as curas do fim da rodada. O último
 * quadro usa a vida final do resultado.
 */
export function quadrosDaArena(resultado: ResultadoCombatePvp, ladoA: LadoDoReplay, ladoB: LadoDoReplay, maxLinhas = 5): QuadroDaArena[] {
  const a = painel(ladoA);
  const b = painel(ladoB);
  const de = (nome?: string) => (nome === a.nome ? a : nome === b.nome ? b : null);
  const status = new Map<PainelLuta, Set<EfeitoStatus>>([
    [a, new Set()],
    [b, new Set()],
  ]);
  const linhas: string[] = [...resultado.mensagens.slice(0, 1)];
  const quadros: QuadroDaArena[] = [];
  const foto = (rodada: number) => {
    a.status = [...status.get(a)!];
    b.status = [...status.get(b)!];
    quadros.push({ rodada, a: { ...a }, b: { ...b }, linhas: linhas.slice(-maxLinhas) });
  };
  foto(0);
  for (const t of resultado.logTurnos) {
    for (const atk of t.ataques) {
      const alvo = de(atk.defensor);
      if (alvo) {
        alvo.hp = Math.max(0, atk.hpRestante);
        alvo.escudo = Math.max(0, atk.sobreescudoRestante);
      }
      linhas.push(atk.mensagem);
      foto(t.numeroTurno);
    }
    let mudou = false;
    for (const e of t.eventosEfeitos) {
      const alvo = de(e.alvo);
      if (!alvo) continue;
      const s = status.get(alvo)!;
      if (e.tipo === 'aplicado' || e.tipo === 'renovado' || e.tipo === 'controle') s.add(e.efeito);
      if (e.tipo === 'expirado' || e.tipo === 'removido') s.delete(e.efeito);
      if (e.dano) {
        alvo.hp = Math.max(0, alvo.hp - e.dano);
        mudou = true;
      }
    }
    for (const c of t.eventosCura ?? []) {
      const alvo = de(c.combatente);
      if (!alvo) continue;
      alvo.hp = c.tipo === 'ressurreicao' ? c.valor : Math.min(alvo.hpMax, alvo.hp + c.valor);
      mudou = true;
    }
    for (const m of t.eventosMecanica ?? []) linhas.push(m);
    if (mudou || (t.eventosMecanica?.length ?? 0) > 0) foto(t.numeroTurno);
  }
  a.hp = resultado.finalA.hp;
  b.hp = resultado.finalB.hp;
  linhas.push(...resultado.mensagens.slice(1));
  foto(resultado.logTurnos.length);
  return quadros;
}
