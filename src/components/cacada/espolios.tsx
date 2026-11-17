import React from 'react';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { MATERIAIS_MUNDO_MAP } from '@/rules/materiaisArmas';
import { ORBES_ARMADURA_MAP } from '@/rules/armaduras';
import { BILHETE_DE_MELHORIA, nomeDoItem } from '@/game/forja';
import { ICONE_BILHETE } from '@/assets/forjaItens';
import { COR_RARIDADE } from '@/lib/cacadaTela';
import type { RaridadeMaterial } from '@/rules/raridades';
import type { EspolioDaLuta } from '@/components/cena/TelaDeFimDeLuta';
import { SlotDeArma } from '../forja/KitDaForja';
import { IconeDoMaterial, IconeDoOrbe } from '../forja/IconeDoMaterial';

/**
 * Os espólios de uma luta (o que caiu na mochila) prontos para a tela de vitória: materiais de monstro e de mundo, orbes
 * de armadura e o Bilhete de melhoria, cada um na moldura da sua raridade.
 */
export function espoliosDaLuta(drops: readonly { materialId: string; quantidade: number }[]): EspolioDaLuta[] {
  return drops.map(({ materialId: id, quantidade }) => {
    const nome = nomeDoItem(id);
    const orbe = ORBES_ARMADURA_MAP[id];
    const material = MATERIAIS_MAP[id] ?? MATERIAIS_MUNDO_MAP[id];
    const raridade: RaridadeMaterial = (orbe?.raridade ?? (material as { raridade?: RaridadeMaterial } | undefined)?.raridade ?? 'comum') as RaridadeMaterial;
    const cor = COR_RARIDADE[raridade];
    const miolo =
      id === BILHETE_DE_MELHORIA.id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ICONE_BILHETE} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
      ) : orbe ? (
        <IconeDoOrbe cor={cor} className="w-full h-full" />
      ) : (
        <IconeDoMaterial id={id} nome={nome} cor={cor} className="w-full h-full" tamanhoDaInicial="14px" />
      );
    return { id, nome, quantidade, icone: <SlotDeArma raridade={raridade} tamanho="100%">{miolo}</SlotDeArma> };
  });
}
