import type { CharacterDocument } from '@/server/characterService';
import type { AtaqueLog, ResultadoCombate } from '@/game/combat';
import type { EventoEfeito } from '@/game/statusEffects';
import type { MonsterDefinition } from '@/rules/monsters';
import { EfeitoStatus, EFEITOS_STATUS } from '@/rules/statusEffects';
import { getClassById } from '@/rules/classes';
import { getClassSkillIcon } from '@/rules/skillIcons';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { iconeDaHabilidadeSubclasse } from '@/rules/subclasseAssets';
import { habilidadeDoKitLiberada } from '@/lib/subclasseTela';

/**
 * Tela de combate da Caçada (decidida pelo Yuri em 12/10/2026): a luta é resolvida no servidor e a tela
 * só a reproduz. Esta lógica transforma o registro da luta em quadros (sem React).
 */

export interface PainelLuta {
  nome: string;
  nivel: number;
  hp: number;
  hpMax: number;
  escudo: number;
  escudoMax: number;
  status: EfeitoStatus[];
  enfurecido: boolean;
}

export type TipoLinha = 'ataque' | 'habilidade' | 'dano' | 'status' | 'cura' | 'info';

export interface LinhaLog {
  texto: string;
  tipo: TipoLinha;
}

export type EspacoTela = 'ataqueBasico' | 'habilidadeEspecial' | 'passivaI' | 'passivaII' | 'ultimate';

export interface HabilidadeTela {
  espaco: EspacoTela;
  nome: string;
  icone: string | null;
  bloqueada: boolean;
  /** 0 a 1: quanto falta para ativar (1 = pronta / ativa). */
  progresso: number;
  texto: string;
  ativandoAgora: boolean;
}

export interface QuadroLuta {
  turno: number;
  linhas: LinhaLog[];
  jogador: PainelLuta;
  monstro: PainelLuta;
  habilidades: HabilidadeTela[];
}

/** Ciclo das habilidades de classe: a especial a cada 3 ataques e o ultimate a cada 7 (todas as classes). */
export const CICLO_ESPECIAL = 3;
export const CICLO_ULTIMATE = 7;

const CARGAS_MAXIMAS: Readonly<Record<string, number>> = { feiticeiro: 3, bandido: 3, samurai: 3, profeta: 2 };

const nomeStatus = (e: EfeitoStatus) => EFEITOS_STATUS[e]?.nome ?? e;

interface EspacoBase {
  espaco: EspacoTela;
  nomes: string[];
  nome: string;
  icone: string | null;
  nivel: number;
}

/** Nomes e ícones dos 5 espaços do personagem (a habilidade da subclasse equipada entra no lugar da da classe). */
export function espacosDoPersonagem(c: Pick<CharacterDocument, 'classeId' | 'subclasseAtualId' | 'subclasseTiers' | 'habilidadesEquipadas'>): EspacoBase[] {
  const classe = getClassById(c.classeId);
  if (!classe) return [];
  const textos = c.subclasseAtualId ? TEXTOS_SUBCLASSE[c.subclasseAtualId] : undefined;
  const ordem: { espaco: EspacoTela; kit?: 'basico' | 'especial' | 'ultimate' }[] = [
    { espaco: 'ataqueBasico', kit: 'basico' },
    { espaco: 'habilidadeEspecial', kit: 'especial' },
    { espaco: 'passivaI' },
    { espaco: 'passivaII' },
    { espaco: 'ultimate', kit: 'ultimate' },
  ];
  return ordem.map(({ espaco, kit }, i) => {
    const marco = classe.progressao[espaco];
    let nome = marco.nome;
    let icone = getClassSkillIcon(classe.id, i);
    const nomes = [marco.nome];
    if (kit && textos && c.subclasseAtualId && habilidadeDoKitLiberada(c, c.subclasseAtualId, kit)) {
      const daSub = textos[kit];
      nomes.push(daSub.nome);
      if (c.habilidadesEquipadas?.[espaco as 'ataqueBasico' | 'habilidadeEspecial' | 'ultimate'] === daSub.id) {
        nome = daSub.nome;
        icone = iconeDaHabilidadeSubclasse(daSub.id);
      }
    }
    return { espaco, nomes, nome, icone, nivel: marco.nivel };
  });
}

function textoDoAtaque(a: AtaqueLog): LinhaLog[] {
  if (a.incapacitado || a.distraido) {
    return [{ texto: `${a.atacante} perdeu a ação (${a.incapacitado ?? 'distração'}).`, tipo: 'info' }];
  }
  const linhas: LinhaLog[] = [];
  if (a.racialAcionada) linhas.push({ texto: `${a.atacante} aciona ${a.racialAcionada}!`, tipo: 'habilidade' });
  linhas.push(
    a.habilidadeAcionada
      ? { texto: `${a.atacante} usou ${a.habilidadeAcionada}.`, tipo: 'habilidade' }
      : { texto: `${a.atacante} atacou.`, tipo: 'ataque' }
  );
  if (a.imortalidadeBreve) {
    linhas.push({ texto: `${a.defensor} não sofreu dano.`, tipo: 'info' });
  } else if (a.danoEfetivo > 0 || a.danoBruto > 0) {
    const crit = a.golpesCriticos ? ' (crítico!)' : '';
    linhas.push({ texto: `${a.defensor} recebeu ${a.danoEfetivo} de dano${crit}.`, tipo: 'dano' });
  }
  if (a.curaHp && a.curaHp > 0) linhas.push({ texto: `${a.atacante} recuperou ${Math.round(a.curaHp)} de vida.`, tipo: 'cura' });
  if (a.danoRedirecionado) linhas.push({ texto: `${a.atacante} recebeu ${a.danoRedirecionado} de volta.`, tipo: 'dano' });
  return linhas;
}

function textoDoEvento(e: EventoEfeito, nomeJogador: string): LinhaLog | null {
  const alvo = e.alvo ?? nomeJogador;
  const n = nomeStatus(e.efeito);
  switch (e.tipo) {
    case 'aplicado':
    case 'renovado':
    case 'controle':
      return { texto: `${alvo} sofreu ${n}.`, tipo: 'status' };
    case 'instantaneo':
      return { texto: `${alvo} sofreu ${n}${e.dano ? ` (${e.dano} de dano)` : ''}.`, tipo: 'status' };
    case 'dano':
      return { texto: `${alvo} recebeu ${e.dano ?? 0} de ${n}.`, tipo: 'dano' };
    case 'imune':
      return { texto: `${alvo} é imune a ${n}.`, tipo: 'info' };
    case 'expirado':
    case 'removido':
      return { texto: `${n} acabou em ${alvo}.`, tipo: 'info' };
    default:
      return null;
  }
}

/**
 * Transforma o resultado do servidor em quadros: um por ataque e um no fim de cada turno com os efeitos.
 * Cada quadro traz as barras, os status, as últimas linhas do log e as 5 habilidades com o quanto falta.
 */
export function montarQuadros(
  resultado: ResultadoCombate,
  personagem: CharacterDocument,
  monstro: MonsterDefinition,
  maxLinhas = 6
): QuadroLuta[] {
  const espacos = espacosDoPersonagem(personagem);
  const jogador: PainelLuta = {
    nome: personagem.nome,
    nivel: personagem.nivel,
    hp: personagem.hpMax,
    hpMax: personagem.hpMax,
    escudo: personagem.sobreescudoMax,
    escudoMax: personagem.sobreescudoMax,
    status: [],
    enfurecido: false,
  };
  const inimigo: PainelLuta = {
    nome: monstro.nome,
    nivel: monstro.nivel,
    hp: monstro.hp,
    hpMax: monstro.hp,
    escudo: 0,
    escudoMax: 0,
    status: [],
    enfurecido: false,
  };
  const linhas: LinhaLog[] = [];
  const quadros: QuadroLuta[] = [];
  let ataquesDoJogador = 0;
  let cargas = 0;
  let passivaIAtiva = false;

  const painelDe = (nome: string) => (nome === personagem.nome ? jogador : inimigo);
  const habilidades = (acionada?: string): HabilidadeTela[] =>
    espacos.map((e) => {
      const bloqueada = personagem.nivel < e.nivel;
      const ativandoAgora = !!acionada && e.nomes.includes(acionada);
      let progresso = 1;
      let texto = 'Pronta';
      if (bloqueada) {
        progresso = 0;
        texto = `Nv ${e.nivel}`;
      } else if (e.espaco === 'habilidadeEspecial' || e.espaco === 'ultimate') {
        const ciclo = e.espaco === 'ultimate' ? CICLO_ULTIMATE : CICLO_ESPECIAL;
        const feitos = ataquesDoJogador % ciclo;
        progresso = ativandoAgora ? 1 : feitos / ciclo;
        texto = ativandoAgora ? 'Ativou!' : `Faltam ${ciclo - feitos}`;
      } else if (e.espaco === 'passivaII' && CARGAS_MAXIMAS[personagem.classeId]) {
        const max = CARGAS_MAXIMAS[personagem.classeId];
        progresso = cargas / max;
        texto = `Cargas ${cargas}/${max}`;
      } else if (e.espaco === 'passivaI' && personagem.classeId === 'barbaro') {
        progresso = passivaIAtiva ? 1 : 0;
        texto = passivaIAtiva ? 'Ativa' : 'Inativa';
      } else if (e.espaco === 'passivaI' || e.espaco === 'passivaII') {
        texto = 'Ativa';
      }
      return { espaco: e.espaco, nome: e.nome, icone: e.icone, bloqueada, progresso, texto, ativandoAgora };
    });

  const empurrar = (turno: number, acionada?: string) => {
    quadros.push({
      turno,
      linhas: linhas.slice(-maxLinhas),
      jogador: { ...jogador, status: [...jogador.status] },
      monstro: { ...inimigo, status: [...inimigo.status] },
      habilidades: habilidades(acionada),
    });
  };

  empurrar(1);
  for (const turno of resultado.logTurnos) {
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
      if (a.atacante === personagem.nome && !a.incapacitado && !a.distraido) {
        ataquesDoJogador += 1;
        const restantes = a.cargasAcumuloRestantes ?? a.cargasSedeSangueBandidoRestantes;
        if (restantes !== undefined) cargas = restantes;
        if (a.instintoSobrevivenciaAtivo !== undefined) passivaIAtiva = a.instintoSobrevivenciaAtivo;
      }
      linhas.push(...textoDoAtaque(a));
      empurrar(turno.numeroTurno, a.atacante === personagem.nome ? a.habilidadeAcionada : undefined);
    }
    const eventos = turno.eventosEfeitos ?? [];
    if (eventos.length > 0 || (turno.eventosCura?.length ?? 0) > 0) {
      for (const e of eventos) {
        const painel = e.alvo ? painelDe(e.alvo) : jogador;
        if (e.tipo === 'aplicado' || e.tipo === 'renovado' || e.tipo === 'controle' || e.tipo === 'instantaneo') {
          if (!painel.status.includes(e.efeito)) painel.status.push(e.efeito);
        }
        if (e.tipo === 'expirado' || e.tipo === 'removido') painel.status = painel.status.filter((s) => s !== e.efeito);
        if ((e.tipo === 'dano' || e.tipo === 'instantaneo') && e.dano) painel.hp = Math.max(0, painel.hp - e.dano);
        const l = textoDoEvento(e, personagem.nome);
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
      empurrar(turno.numeroTurno);
    }
  }

  // Fim: quem perdeu fica com a vida zerada
  if (resultado.vencedor === 'personagem') inimigo.hp = 0;
  else jogador.hp = 0;
  linhas.push({
    texto: resultado.vencedor === 'personagem' ? `${monstro.nome} foi abatido!` : `${personagem.nome} caiu em combate.`,
    tipo: 'info',
  });
  empurrar(resultado.logTurnos.length || 1);
  return quadros;
}

/** Barra única de vida e escudo: largura da vida (vermelha) e do escudo azul por cima, em %. */
export function larguraDasBarras(p: Pick<PainelLuta, 'hp' | 'hpMax' | 'escudo' | 'escudoMax'>): { vida: number; escudo: number } {
  const vida = p.hpMax > 0 ? Math.max(0, Math.min(100, (p.hp / p.hpMax) * 100)) : 0;
  const escudo = p.escudoMax > 0 ? Math.max(0, Math.min(100, (p.escudo / p.escudoMax) * 100)) : 0;
  return { vida, escudo };
}
