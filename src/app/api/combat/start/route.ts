import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../server/auth';
import { limitarEscrita } from '../../../../server/rateLimit';
import {
  getCharacterByUid,
  applyCombatResult,
  calcularXpComBonusRacial,
  runWithUserMutex,
} from '../../../../server/characterService';
import { gerarSemente, combatIdValido } from '../../../../server/combatSeed';
import { MONSTERS_MAP } from '../../../../rules/monsters';
import { getRaceById } from '../../../../rules/races';
import { PersistenciaIndisponivelError } from '../../../../server/persistence';
import { resolverCombate, Combatente } from '../../../../game/combat';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para iniciar o combate.' },
        { status: 401 }
      );
    }

    const limitado = limitarEscrita(req, user.uid, 'combat-start');
    if (limitado) return limitado;

    const body = await req.json().catch(() => ({}));
    const { monsterId } = body;
    // A semente NUNCA vem do cliente (0.5-B1). O cliente só pode enviar um combatId para
    // que reenvios da mesma requisição não apliquem XP e ouro duas vezes (0.5-B3).
    const combatId: string = combatIdValido(body.combatId) ? body.combatId : crypto.randomUUID();

    if (!monsterId || typeof monsterId !== 'string') {
      return NextResponse.json(
        { error: 'Identificador de monstro inválido.' },
        { status: 400 }
      );
    }

    const monstro = MONSTERS_MAP[monsterId];
    if (!monstro) {
      return NextResponse.json(
        { error: `Monstro "${monsterId}" não encontrado.` },
        { status: 404 }
      );
    }

    // Leitura do personagem, resolução do combate e gravação do resultado 100% dentro do mutex por UID
    const postCombatData = await runWithUserMutex(user.uid, async () => {
      // 1. Busca o personagem atual do usuário dentro do mutex
      const character = await getCharacterByUid(user.uid);
      if (!character) {
        throw new Error('Personagem não encontrado. Crie um personagem antes de batalhar.');
      }

      // 2. Prepara o combatente com HP cheio e Sobreescudo calculados
      const combatentePersonagem: Combatente = {
        nome: character.nome,
        racaId: character.racaId,
        classeId: character.classeId,
        linhagem: character.linhagem,
        nivel: character.nivel,
        hp: character.hpMax,
        hpMax: character.hpMax,
        sobreescudo: character.sobreescudoMax,
        atributos: character.atributos,
        habilidadesEquipadas: character.habilidadesEquipadas,
        subclasseAtualId: character.subclasseAtualId,
        subclasseTiers: character.subclasseTiers,
        ouro: character.ouro,
        mitigacao: 0,
      };

      // 3. Resolução 100% no servidor
      const combateSeed = gerarSemente();
      const resultado = resolverCombate(combatentePersonagem, monstro, combateSeed);

      // Se venceu e o personagem possui passiva bonusXpPercentual, aplica por cima do XP base do monstro (arredondado para baixo)
      if (resultado.vencedor === 'personagem') {
        const raca = getRaceById(character.racaId);
        if (raca && raca.passivaRacial.efeito === 'bonusXpPercentual') {
          const xpComBonus = calcularXpComBonusRacial(monstro.xpConcedido, character.racaId);
          resultado.xpGanho = xpComBonus;
          resultado.mensagens.push(
            `Passiva Racial (${raca.passivaRacial.nome}): +${raca.passivaRacial.valor}% de XP aplicado (${monstro.xpConcedido} → ${xpComBonus} XP).`
          );
        }
      }

      // 4. Aplica alterações de status, XP, ouro e transações no servidor
      const postCombat = await applyCombatResult(user.uid, resultado, monstro.nome, {
        combatId,
        auditoria: { seed: combateSeed, monsterId },
      });

      return { postCombat };
    });

    return NextResponse.json(
      {
        combatId,
        repetido: postCombatData.postCombat.repetido,
        resultado: postCombatData.postCombat.resultadoCombate,
        character: postCombatData.postCombat.character,
        levelUps: postCombatData.postCombat.levelUps,
        transaction: postCombatData.postCombat.transaction,
        mensagens: postCombatData.postCombat.mensagens,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PersistenciaIndisponivelError) {
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : 'Erro durante a batalha.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
