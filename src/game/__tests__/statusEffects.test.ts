import { describe, it, expect, beforeEach } from 'vitest';
import {
  EFEITOS_STATUS,
  EfeitoStatus,
} from '../../rules/statusEffects';
import { MONSTERS_MAP, MonsterDefinition } from '../../rules/monsters';
import { GAME_CONFIG } from '../../rules/config';
import {
  calcularDanoEfeito,
  EfeitoAtivo,
  formatarEventoEfeito,
  processarTickEfeitos,
  removerEfeitos,
  sorteioStatus,
  tentarAplicarEfeito,
} from '../statusEffects';
import { Combatente, resolverCombate } from '../combat';
import {
  applyCombatResult,
  createCharacter,
  getCharacterByUid,
  resetCharacterStore,
} from '../../server/characterService';

describe('ORDEM 23 — Efeitos de Dano ao Longo do Tempo (Bloco B)', () => {
  beforeEach(() => {
    resetCharacterStore();
  });

  describe('1. Dados de Efeitos (src/rules/statusEffects.ts)', () => {
    it('EFEITOS_STATUS tem exatamente os valores da Parte 1 e os monstros possuem efeitosAplicados', () => {
      expect(EFEITOS_STATUS.sangramento).toEqual({
        id: 'sangramento',
        nome: 'Sangramento',
        tipo: 'instantaneo',
        percentualHpMax: 30,
        chanceAtivacao: 7,
      });

      expect(EFEITOS_STATUS.veneno).toEqual({
        id: 'veneno',
        nome: 'Veneno',
        tipo: 'dot',
        percentualHpMax: 3,
        duracaoRodadas: 10,
        chanceAtivacao: 10,
      });

      expect(EFEITOS_STATUS.podridaoEscarlate).toEqual({
        id: 'podridaoEscarlate',
        nome: 'Podridão Escarlate',
        tipo: 'dot',
        percentualHpMax: 8,
        duracaoRodadas: 6,
        chanceAtivacao: 3,
      });

      expect(MONSTERS_MAP['rato-da-peste'].efeitosAplicados).toEqual(['veneno']);
      expect(MONSTERS_MAP['cavaleiro-do-vazio'].efeitosAplicados).toEqual(['sangramento']);
      expect(MONSTERS_MAP['cultista-das-sombras'].efeitosAplicados).toEqual(['podridaoEscarlate']);
    });
  });

  describe('2. Funções Puras de Efeitos (src/game/statusEffects.ts)', () => {
    it('tentarAplicarEfeito: testa fronteira (9.99 ativa Veneno, 10 não), DOT novo vs renovado sem empilhar, Sangramento instantâneo e imutabilidade do Map', () => {
      const mapaInicial = new Map<EfeitoStatus, EfeitoAtivo>();

      // Fronteira do Veneno (chanceAtivacao = 10): 10 não ativa, 9.99 ativa
      const naoAtivouFronteira = tentarAplicarEfeito(mapaInicial, 'veneno', 10);
      expect(naoAtivouFronteira.resultado).toBe('nao_ativou');
      expect(naoAtivouFronteira.efeitos.size).toBe(0);

      const naoAtivouAcima = tentarAplicarEfeito(mapaInicial, 'veneno', 45);
      expect(naoAtivouAcima.resultado).toBe('nao_ativou');

      // Sorteio 9.99 ativa Veneno como 'aplicado' com 10 rodadas
      const aplicado = tentarAplicarEfeito(mapaInicial, 'veneno', 9.99);
      expect(aplicado.resultado).toBe('aplicado');
      expect(aplicado.efeitos.size).toBe(1);
      expect(aplicado.efeitos.get('veneno')).toEqual({
        id: 'veneno',
        rodadasRestantes: 10,
      });
      // Map original permanece vazio (não mutado)
      expect(mapaInicial.size).toBe(0);

      // Simula que o Veneno já decaiu para 4 rodadas restantes e recebe nova aplicação -> 'renovado' volta para 10 rodadas, apenas 1 instância no Map
      const mapaComVenenoParcial = new Map<EfeitoStatus, EfeitoAtivo>([
        ['veneno', { id: 'veneno', rodadasRestantes: 4 }],
      ]);
      const renovado = tentarAplicarEfeito(mapaComVenenoParcial, 'veneno', 0);
      expect(renovado.resultado).toBe('renovado');
      expect(renovado.efeitos.size).toBe(1);
      expect(renovado.efeitos.get('veneno')?.rodadasRestantes).toBe(10);
      // Map anterior não foi mutado (continua com 4)
      expect(mapaComVenenoParcial.get('veneno')?.rodadasRestantes).toBe(4);

      // Sangramento (tipo 'instantaneo', chance 7): retorna 'instantaneo' e o Map continua vazio
      const sangramentoAtivo = tentarAplicarEfeito(mapaInicial, 'sangramento', 6.99);
      expect(sangramentoAtivo.resultado).toBe('instantaneo');
      expect(sangramentoAtivo.efeitos.size).toBe(0);

      const sangramentoFalho = tentarAplicarEfeito(mapaInicial, 'sangramento', 7);
      expect(sangramentoFalho.resultado).toBe('nao_ativou');
      expect(sangramentoFalho.efeitos.size).toBe(0);
    });

    it('calcularDanoEfeito: 3% de 100 = 3; 3% de 10 = 1 (mínimo); 30% de 10 = 3; 8% de 200 = 16', () => {
      expect(calcularDanoEfeito(100, 3)).toBe(3);
      expect(calcularDanoEfeito(10, 3)).toBe(1);
      expect(calcularDanoEfeito(10, 30)).toBe(3);
      expect(calcularDanoEfeito(200, 8)).toBe(16);
    });

    it('processarTickEfeitos: Veneno dá exatamente 10 ticks e expira no 10º; Podridão Escarlate dá exatamente 6 e expira; dois efeitos somam o dano e não mutam o Map recebido', () => {
      // 1) Veneno: 10 ticks exatos e expira no décimo
      let estadoVeneno = tentarAplicarEfeito(new Map(), 'veneno', 0).efeitos;
      const copiaInicialVeneno = new Map(estadoVeneno);
      let ticksVeneno = 0;
      let danoAcumuladoVeneno = 0;

      while (estadoVeneno.size > 0) {
        const res = processarTickEfeitos(estadoVeneno, 100); // 3% de 100 = 3 por tick
        ticksVeneno++;
        danoAcumuladoVeneno += res.danoTotal;
        estadoVeneno = res.efeitos;

        if (ticksVeneno < 10) {
          expect(res.eventos).toEqual([
            {
              tipo: 'dano',
              efeito: 'veneno',
              dano: 3,
              rodadasRestantes: 10 - ticksVeneno,
            },
          ]);
        } else {
          expect(res.eventos).toEqual([
            {
              tipo: 'dano',
              efeito: 'veneno',
              dano: 3,
              rodadasRestantes: 0,
            },
            {
              tipo: 'expirado',
              efeito: 'veneno',
              rodadasRestantes: 0,
            },
          ]);
        }
      }

      expect(ticksVeneno).toBe(10);
      expect(danoAcumuladoVeneno).toBe(30);
      // Confirma que o Map inicial não foi mutado
      expect(copiaInicialVeneno.get('veneno')?.rodadasRestantes).toBe(10);

      // 2) Podridão Escarlate: 6 ticks exatos e expira no sexto
      let estadoPodridao = tentarAplicarEfeito(new Map(), 'podridaoEscarlate', 0).efeitos;
      let ticksPodridao = 0;
      let danoAcumuladoPodridao = 0;

      while (estadoPodridao.size > 0) {
        const res = processarTickEfeitos(estadoPodridao, 200); // 8% de 200 = 16 por tick
        ticksPodridao++;
        danoAcumuladoPodridao += res.danoTotal;
        estadoPodridao = res.efeitos;

        if (ticksPodridao === 6) {
          expect(res.eventos.some((e) => e.tipo === 'expirado' && e.efeito === 'podridaoEscarlate')).toBe(
            true
          );
        }
      }

      expect(ticksPodridao).toBe(6);
      expect(danoAcumuladoPodridao).toBe(96);

      // 3) Dois efeitos simultâneos somam o dano e não mutam o Map recebido
      const mapaDuplo = new Map<EfeitoStatus, EfeitoAtivo>([
        ['veneno', { id: 'veneno', rodadasRestantes: 5 }],
        ['podridaoEscarlate', { id: 'podridaoEscarlate', rodadasRestantes: 3 }],
      ]);

      const tickDuplo = processarTickEfeitos(mapaDuplo, 100); // Veneno (3) + Podridão (8) = 11
      expect(tickDuplo.danoTotal).toBe(11);
      expect(tickDuplo.efeitos.get('veneno')?.rodadasRestantes).toBe(4);
      expect(tickDuplo.efeitos.get('podridaoEscarlate')?.rodadasRestantes).toBe(2);
      // Map original intacto
      expect(mapaDuplo.get('veneno')?.rodadasRestantes).toBe(5);
      expect(mapaDuplo.get('podridaoEscarlate')?.rodadasRestantes).toBe(3);
    });

    it('removerEfeitos: remove 1 (o de maior duração) e "todos" sem mutar o Map original', () => {
      const mapa = new Map<EfeitoStatus, EfeitoAtivo>([
        ['podridaoEscarlate', { id: 'podridaoEscarlate', rodadasRestantes: 4 }],
        ['veneno', { id: 'veneno', rodadasRestantes: 9 }],
      ]);

      // Remove 1 -> deve remover 'veneno' (9 rodadas > 4 rodadas)
      const remUm = removerEfeitos(mapa, 1);
      expect(remUm.removidos).toEqual(['veneno']);
      expect(remUm.efeitos.has('veneno')).toBe(false);
      expect(remUm.efeitos.get('podridaoEscarlate')?.rodadasRestantes).toBe(4);
      // Map original intacto
      expect(mapa.size).toBe(2);

      // Remove 'todos' -> esvazia tudo
      const remTodos = removerEfeitos(mapa, 'todos');
      expect(remTodos.removidos).toEqual(['veneno', 'podridaoEscarlate']);
      expect(remTodos.efeitos.size).toBe(0);
      expect(mapa.size).toBe(2);
    });

    it('sorteioStatus: determinístico, sempre em [0, 100), e produz valores diferentes para rodadas diferentes', () => {
      const v1 = sorteioStatus(42, 1, 0);
      const v2 = sorteioStatus(42, 1, 0);
      expect(v1).toBe(v2);

      const valoresPorRodada = new Set<number>();
      for (let rodada = 1; rodada <= 50; rodada++) {
        const s = sorteioStatus(12345, rodada, 0);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(100);
        valoresPorRodada.add(s);
      }
      expect(valoresPorRodada.size).toBeGreaterThan(1);
    });

    it('formatarEventoEfeito gera os textos legíveis esperados para o battle log', () => {
      expect(
        formatarEventoEfeito({ tipo: 'aplicado', efeito: 'veneno', rodadasRestantes: 10 }, 'Rato da Peste')
      ).toBe('O Rato da Peste envenenou você');
      expect(
        formatarEventoEfeito({ tipo: 'renovado', efeito: 'veneno', rodadasRestantes: 10 }, 'Rato da Peste')
      ).toContain('renovou o Veneno');
      expect(
        formatarEventoEfeito({ tipo: 'instantaneo', efeito: 'sangramento', dano: 30 }, 'Cavaleiro do Vazio')
      ).toBe('Sangramento causa 30 de dano');
      expect(
        formatarEventoEfeito({ tipo: 'dano', efeito: 'veneno', dano: 3, rodadasRestantes: 9 })
      ).toBe('Veneno causa 3 de dano (restam 9 rodadas)');
      expect(
        formatarEventoEfeito({ tipo: 'expirado', efeito: 'veneno', rodadasRestantes: 0 })
      ).toBe('O Veneno se dissipou');
    });
  });

  describe('3. Integração no Combate (src/game/combat.ts)', () => {
    it('Rato da Peste com ativação forçada: personagem recebe ticks de Veneno nas rodadas seguintes, dano direto no HP mesmo com Sobreescudo > 0 (Sobreescudo NÃO diminui por causa do tick)', () => {
      // Personagem com alto Sobreescudo (100) e mitigação (10) para que o ataque físico do Rato da Peste (2)
      // cause apenas 1 de dano no Sobreescudo, enquanto o Veneno causa 3% de 100 = 3 de dano DIRETO no HP!
      const personagemComEscudo: Combatente = {
        nome: 'Guardião Blindado',
        racaId: 'humano',
        classeId: 'barbaro',
        nivel: 1,
        hp: 100,
        hpMax: 100,
        sobreescudo: 100,
        mitigacao: 10,
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 3, // calcularDanoFisico(3) = 3 -> mata o Rato da Peste (12 HP) em 4 rodadas (1 ataque por rodada)
          vitalidade: 50,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1, // Igual à agilidade 1 do Rato da Peste -> 1 ataque por turno
        },
      };

      const rato = MONSTERS_MAP['rato-da-peste'];
      const resultado = resolverCombate(personagemComEscudo, rato, 42, {
        rngStatus: () => 0, // Força ativação de Veneno
      });

      // Foram necessárias 4 rodadas para derrotar o Rato (4 * 3 = 12)
      // Nas rodadas 1, 2 e 3 o Rato contra-ataca (aplicando/renovando Veneno) e o tick de fim de rodada ocorre!
      expect(resultado.logTurnos.length).toBe(4);

      const turno1 = resultado.logTurnos[0];
      expect(turno1.eventosEfeitos).toEqual([
        { tipo: 'aplicado', efeito: 'veneno', rodadasRestantes: 10 },
        { tipo: 'dano', efeito: 'veneno', dano: 3, rodadasRestantes: 9 },
      ]);

      // No ataque do Rato no Turno 1, o ataque físico consumiu apenas 1 de Sobreescudo (100 -> 99) e dejó HP em 100;
      // mas o tick de Veneno no fim do Turno 1 tirou 3 de HP diretamente sem mexer no Sobreescudo!
      expect(turno1.ataques[1].sobreescudoRestante).toBe(99);
      expect(turno1.ataques[1].hpRestante).toBe(100);

      // No Turno 2, quando o Rato ataca novamente, o Sobreescudo parte de 99 (provando que o tick do Turno 1 NÃO reduziu o Sobreescudo!)
      // e vai para 98, enquanto o HP já estava em 97 (100 - 3 do tick do Turno 1)!
      const turno2 = resultado.logTurnos[1];
      expect(turno2.ataques[1].sobreescudoRestante).toBe(98);
      expect(turno2.ataques[1].hpRestante).toBe(97);
      expect(turno2.eventosEfeitos).toEqual([
        { tipo: 'renovado', efeito: 'veneno', rodadasRestantes: 10 },
        { tipo: 'dano', efeito: 'veneno', dano: 3, rodadasRestantes: 9 },
      ]);
    });

    it('Cavaleiro do Vazio com ativação forçada: Sangramento causa 30% do HP máximo de uma vez, ignorando o Sobreescudo', () => {
      const personagemComEscudo: Combatente = {
        nome: 'Paladino de Ferro',
        racaId: 'humano',
        classeId: 'barbaro',
        nivel: 1,
        hp: 100,
        hpMax: 100,
        sobreescudo: 80, // Sobreescudo alto
        mitigacao: 20, // Mitigação alta -> ataque físico do Cavaleiro (9) causa apenas 1 de dano no Sobreescudo (80 -> 79)
        atributos: {
          vigor: 20,
          mente: 2,
          forca: 100, // Mata no contra-ataque da rodada 1
          vitalidade: 40,
          arcano: 0,
          inteligencia: 0,
          agilidade: 4, // Menor que 5 do Cavaleiro (Cavaleiro age primeiro), mas > 2.5 (Cavaleiro faz 1 ataque por turno)
        },
      };

      const cavaleiroVazio = MONSTERS_MAP['cavaleiro-do-vazio'];
      const resultado = resolverCombate(personagemComEscudo, cavaleiroVazio, 42, {
        rngStatus: () => 0, // Força ativação de Sangramento (30% de 100 = 30 de dano direto no HP)
      });

      const turno1 = resultado.logTurnos[0];
      // Ataque físico do Cavaleiro do Vazio tirou apenas 1 do Sobreescudo (80 -> 79)
      expect(turno1.ataques[0].sobreescudoRestante).toBe(79);
      // Sangramento disparou instantaneamente causando 30 de dano direto no HP (100 -> 70), ignorando os 79 de Sobreescudo!
      expect(turno1.eventosEfeitos).toEqual([
        { tipo: 'instantaneo', efeito: 'sangramento', dano: 30 },
      ]);
      expect(resultado.personagemFinal.hp).toBe(70);
    });

    it('Com ativação impedida (rngStatus: () => 99.9): combate é idêntico ao de antes desta ordem (sem eventosEfeitos)', () => {
      const personagem: Combatente = {
        nome: 'Aventureiro',
        racaId: 'humano',
        classeId: 'barbaro',
        nivel: 1,
        hp: 60,
        hpMax: 60,
        sobreescudo: 10,
        atributos: {
          vigor: 12,
          mente: 2,
          forca: 4,
          vitalidade: 5,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const monstroComEfeitos = MONSTERS_MAP['rato-da-peste'];
      const monstroSemEfeitos: MonsterDefinition = {
        ...monstroComEfeitos,
        efeitosAplicados: [],
      };

      const resImpedido = resolverCombate(personagem, monstroComEfeitos, 777, {
        rngStatus: () => 99.9,
      });
      const resSemEfeitos = resolverCombate(personagem, monstroSemEfeitos, 777);

      expect(resImpedido).toEqual(resSemEfeitos);
      for (const turno of resImpedido.logTurnos) {
        expect(turno.eventosEfeitos).toEqual([]);
      }
    });

    it('Efeito mata o personagem: o combate termina como derrota e aplica a regra de morte (perde até 50 de ouro sem negativar, HP e Mana restaurados)', () => {
      // Personagem com 20 de HP atual (100 HP máx) e 100 de Sobreescudo:
      // O golpe físico do Rato da Peste (2) bate apenas no Sobreescudo (100 -> 98),
      // mas o tick de Podridão Escarlate / Veneno ou Sangramento mata o personagem diretamente no HP!
      const personagemFerido: Combatente = {
        nome: 'Viajante Exausto',
        racaId: 'humano',
        classeId: 'barbaro',
        nivel: 1,
        hp: 3, // 3 HP restantes de 100 HP máx
        hpMax: 100,
        mana: 5,
        manaMax: 25,
        sobreescudo: 100, // Sobreescudo absorve 100% do ataque normal do Rato da Peste
        ouro: 35, // Menos de 50 para testar também que não fica negativo
        atributos: {
          vigor: 20, // 20 * 5 = 100 HP máx
          mente: 5, // 5 * 5 = 25 Mana máx
          forca: 2,
          vitalidade: 50,
          arcano: 0,
          inteligencia: 0,
          agilidade: 2,
        },
      };

      const rato = MONSTERS_MAP['rato-da-peste'];
      const resultado = resolverCombate(personagemFerido, rato, 42, {
        rngStatus: () => 0, // Veneno causa 3% de 100 = 3 de dano no fim da rodada 1 -> HP vai de 3 para 0!
      });

      expect(resultado.vencedor).toBe('monstro');
      expect(resultado.ouroPerdido).toBe(35);
      expect(resultado.personagemFinal.ouro).toBe(0);
      expect(resultado.personagemFinal.hp).toBe(100);
      expect(resultado.personagemFinal.mana).toBe(25);

      // Testa também com 120 de ouro (perde exatamente 50)
      const resultadoRico = resolverCombate(
        { ...personagemFerido, ouro: 120 },
        rato,
        42,
        { rngStatus: () => 0 }
      );
      expect(resultadoRico.vencedor).toBe('monstro');
      expect(resultadoRico.ouroPerdido).toBe(GAME_CONFIG.OURO_PERDIDO_MORTE);
      expect(resultadoRico.personagemFinal.ouro).toBe(70);
    });

    it('Efeitos não persistem: depois de resolverCombate, nenhum efeito aparece no retorno do combate nem no documento do personagem', async () => {
      const uid = 'user_sem_persistencia_efeitos';
      const char = await createCharacter(uid, {
        nome: 'Sentinela',
        racaId: 'humano',
        classeId: 'barbaro',
        pontos: {
          vigor: 4,
          mente: 0,
          forca: 4,
          vitalidade: 1,
          arcano: 0,
          inteligencia: 0,
          agilidade: 1,
        },
      });

      const combatente: Combatente = {
        nome: char.nome,
        racaId: char.racaId,
        classeId: char.classeId,
        nivel: char.nivel,
        hp: char.hpMax,
        hpMax: char.hpMax,
        sobreescudo: char.sobreescudoMax,
        atributos: char.atributos,
        ouro: char.ouro,
      };

      const resultado = resolverCombate(combatente, MONSTERS_MAP['rato-da-peste'], 42, {
        rngStatus: () => 0,
      });

      expect('efeitos' in resultado).toBe(false);
      expect('efeitosAtivos' in resultado.personagemFinal).toBe(false);

      const posCombate = await applyCombatResult(uid, resultado, 'Rato da Peste');
      const docSalvo = await getCharacterByUid(uid);

      expect('efeitos' in posCombate.character).toBe(false);
      expect('efeitosAtivos' in (docSalvo ?? {})).toBe(false);
    });

    it('Mesma seed = mesmo log completo (determinismo com sorteioStatus)', () => {
      const personagem: Combatente = {
        nome: 'Explorador',
        racaId: 'humano',
        classeId: 'cavaleiro',
        nivel: 5,
        hp: 120,
        hpMax: 120,
        sobreescudo: 30,
        atributos: {
          vigor: 24,
          mente: 4,
          forca: 4,
          vitalidade: 15,
          arcano: 0,
          inteligencia: 0,
          agilidade: 3,
        },
      };

      const cultista = MONSTERS_MAP['cultista-das-sombras'];
      const r1 = resolverCombate(personagem, cultista, 20260927);
      const r2 = resolverCombate(personagem, cultista, 20260927);

      expect(r1).toEqual(r2);
    });

    it('Profeta nível 5+ envenenado usa Bênção Divina e o Veneno é removido; Milagre Divino remove todos os efeitos ativos', () => {
      // 1) Profeta Nível 5:
      // Monstro ataca na Rodada 1 (aplicando Veneno); nas Rodadas 2 e 3 o monstro não aplica novos efeitos.
      // Na Rodada 3 (3ª ação do Profeta), o Profeta usa "Bênção Divina", removendo o Veneno ativo!
      // Como o Veneno foi removido na Rodada 3, não há tick de Veneno no fim da Rodada 3 nem na Rodada 4!
      const profetaLv5: Combatente = {
        nome: 'Profeta Purificador',
        racaId: 'humano',
        classeId: 'profeta',
        nivel: 5,
        hp: 100,
        hpMax: 100,
        mana: 100,
        manaMax: 100,
        sobreescudo: 50,
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 25,
          arcano: 5,
          inteligencia: 2, // Dano moderado (5 por golpe) para a luta durar 4+ rodadas
          agilidade: 1, // Igual à agilidade 1 do Rato -> 1 ação por rodada (Bênção Divina na Rodada 3)
        },
      };

      const monstroVeneno: MonsterDefinition = {
        ...MONSTERS_MAP['rato-da-peste'],
        hp: 20,
        efeitosAplicados: ['veneno'],
      };

      const resBencao = resolverCombate(profetaLv5, monstroVeneno, 42, {
        // Ativa Veneno apenas na rodada 1; nas demais rodadas retorna 99.9
        rngStatus: (rodada) => (rodada === 1 ? 0 : 99.9),
      });

      // Rodada 1: Veneno aplicado e 1º tick
      expect(resBencao.logTurnos[0].eventosEfeitos).toEqual([
        { tipo: 'aplicado', efeito: 'veneno', rodadasRestantes: 10 },
        { tipo: 'dano', efeito: 'veneno', dano: 3, rodadasRestantes: 9 },
      ]);
      // Rodada 2: 2º tick (restam 8 rodadas)
      expect(resBencao.logTurnos[1].eventosEfeitos).toEqual([
        { tipo: 'dano', efeito: 'veneno', dano: 3, rodadasRestantes: 8 },
      ]);
      // Rodada 3: Profeta aciona Bênção Divina -> Veneno é removido e NÃO ocorre tick no fim da Rodada 3!
      expect(resBencao.logTurnos[2].ataques[0].habilidadeAcionada).toBe('Bênção Divina');
      expect(resBencao.logTurnos[2].eventosEfeitos).toEqual([
        { tipo: 'removido', efeito: 'veneno' },
      ]);
      // Rodada 4: Nenhum efeito ativo resta
      expect(resBencao.logTurnos[3].eventosEfeitos).toEqual([]);

      // 2) Profeta Nível 30 com Milagre Divino (contadorMilagreDivino = 6 -> dispara na Rodada 1)
      // contra monstro que aplica simultaneamente Veneno e Podridão Escarlate antes do Profeta agir:
      const profetaLv30: Combatente = {
        nome: 'Sumo Profeta Purificador',
        racaId: 'humano',
        classeId: 'profeta',
        nivel: 30,
        hp: 150,
        hpMax: 200,
        mana: 150,
        manaMax: 200,
        sobreescudo: 50,
        contadorMilagreDivino: 6, // Próxima ação do Profeta é o 7º ataque -> Milagre Divino
        atributos: {
          vigor: 20,
          mente: 20,
          forca: 0,
          vitalidade: 25,
          arcano: 10,
          inteligencia: 10,
          agilidade: 2, // Monstro (agilidade 3) age primeiro na Rodada 1 com 1 único ataque
        },
      };

      const monstroDuploDot: MonsterDefinition = {
        ...MONSTERS_MAP['cultista-das-sombras'],
        hp: 100,
        atributos: {
          ...MONSTERS_MAP['cultista-das-sombras'].atributos,
          agilidade: 3, // Age antes do Profeta (2), mas < 4 (1 ataque por turno)
        },
        efeitosAplicados: ['veneno', 'podridaoEscarlate'],
      };

      const resMilagre = resolverCombate(profetaLv30, monstroDuploDot, 42, {
        rngStatus: (rodada) => (rodada === 1 ? 0 : 99.9),
      });

      const turno1Milagre = resMilagre.logTurnos[0];
      // Monstro aplicou Veneno e Podridão Escarlate, e na mesma rodada o Profeta usou Milagre Divino removendo AMBOS antes do tick!
      expect(turno1Milagre.ataques[1].habilidadeAcionada).toBe('Milagre Divino');
      expect(turno1Milagre.eventosEfeitos).toEqual([
        { tipo: 'aplicado', efeito: 'veneno', rodadasRestantes: 10 },
        { tipo: 'aplicado', efeito: 'podridaoEscarlate', rodadasRestantes: 6 },
        { tipo: 'removido', efeito: 'veneno' },
        { tipo: 'removido', efeito: 'podridaoEscarlate' },
      ]);
    });
  });
});
