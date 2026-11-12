---
name: monster-generator
description: Criação de criaturas e monstros de RPG em pixel art (96x96 ou 128x128) para Realms of Nocthera. Use ao pedir um monstro, chefe, besta, morto-vivo, cultista ou qualquer inimigo, ao montar o briefing, o prompt para o modelo de imagens ou ao iterar um sprite de criatura.
---

# monster-generator — Criaturas de RPG

Siga primeiro `pixel-art-master` (princípios, paleta, fluxo, proibição de "desenho de mentira"). Esta skill acrescenta o que é específico de **criaturas**.

## Briefing

Copie `studio/config/briefs/exemplo-monstro-rato-da-peste.json`. Campos que importam:

- `id`: `monstro-<slug>` · `categoria`: `monstro` · `tamanho`: **96** (comuns) ou **128** (elites/chefes/silhuetas grandes).
- `descricao` (inglês, para o modelo): anatomia, postura, 1 traço marcante, expressão. Ex.: *hunched, patchy fur, bleary eyes, long tail*.
- `materiais`: 3–4 materiais com cor (pelo, osso, carapaça, sangue…) — cada um vira uma rampa.
- `elemento` (fogo, gelo, veneno, relâmpago, terra, vento) → acento de cor; `raridade` para chefes/raros.
- Ancore no jogo: `src/rules/monsters.ts` (nome, nível, `categoriaCorporal`, fraquezas, `efeitosAplicados`). Fraqueza a fogo ⇒ não use laranja forte no corpo; veneno ⇒ verde-musgo nas pústulas.

## Design de criatura

1. **Silhueta única**: 1 característica exagerada (chifres, cauda, mandíbula, capuz). Teste: preto sólido a 0,5× ainda diz "rato", "cultista", "cavaleiro".
2. **Foco = olhos**: o ponto mais claro/saturado do sprite, com **2 px** e um brilho de 1 px de cor da rampa clara. Olho de 1 px sem brilho é morto.
3. **Pose de leitura**: de frente ou 3/4, peso visível (patas apoiadas, ombros). Evite poses de perfil perfeito sem profundidade.
4. **Anatomia por massas**: cabeça, torso, membros em blocos de cluster ≥ 3×3 px antes do detalhe. Detalhe pequeno só onde conta (dentes, garras, joias).
5. **Rampas**: 3–4 tons por material; luz no canto superior esquerdo; sombra de núcleo embaixo/direita; **uma** luz de reflexo opcional no lado oposto.
6. **Tamanho relativo** (para o combate): rato/praga ≈ 60–70% da tela; humanoide ≈ 85%; chefe ocupa 90–95% do 128.
7. **Contorno**: 1 px seletivo (rampa escura do material) — mais vivo que preto; `sombra-0` em partes em contato com o fundo.

## Prompt (montado por `prompts.py`)

O estúdio concatena: tipo (criatura), descrição, materiais, bloco de estilo fixo (`config/estilo_prompt.json`: *authentic pixel art, crisp 1px outline, ≤24 colors, top-left light, flat magenta background*) e lista de **negativos** (anti-aliasing, blur, gradients, painterly, 3d, noise…). Edite o estilo ali, não por ativo.

Dicas de iteração:
- Modelo devolve "ilustração com cara de pixel": reduza detalhes na descrição, peça *"chunky pixels, 16-color look"*, aumente contraste de silhueta e regenere com outra `semente`.
- Parta de referência real quando possível (Codixel): foto/arte licenciada do animal/armadura → modelo/`posprocessar` → rever.
- Para sequências (idle/ataque) gere o **frame base aprovado** primeiro; só depois variações, mantendo paleta e semente.

## Execução

```bash
cd studio
python3 -m nocthera_studio gerar config/briefs/<briefing>.json [--provedor http_api]
# sem provedor ⇒ "⏸ aguardando imagem": coloque assets/entrada/<id>.png e rode de novo
python3 -m nocthera_studio auditar assets/candidatos/monstros/<id>.png -c monstro --folha
```
Depois, **abra a folha com Read**, faça a leitura fria e use `pixel-art-auditor` para aprovar. Candidatos ficam em `assets/candidatos/monstros/`; aprovados são copiados para `assets/aprovados/monstro/`.

## Reprovação típica de monstros

Olhos ilegíveis · corpo em "bolha" sem silhueta · rampa única (tudo da mesma cor) · patas fundidas com o fundo (sem contorno) · textura de ruído no pelo/pele (use 2 tons em clusters, não pontos aleatórios) · cabeça/olhos fora do terço superior · sprite mole (clusters médios < 3 px).


## Ferramentas integradas

- **Prompt de criatura para modelo**: além do bloco do estúdio, o ASF oferece `generate2dsprite/scripts/master_still.py prompt --class mob --finish hibit --identity "<descrição longa e precisa>"` (arte lisa, sem contorno, ≤3 tons/material — o insumo ideal para virar pixel). Use `--identity` com anatomia, cores e traços do briefing; `--facing right`.
- **Conformação**: saída de modelo → `posprocessar` (estúdio) ou `finish_frames.py hibit --canvas 96x96` (ASF) → `auditar -c monstro --folha`.
- **Imagem suja/ampliada** de criatura: `pixel_reduce.py` (ASF) → `pixelpipe.py` (Pixel Art Studio) → auditar resolução nativa.
- **Não** desenhe criatura complexa por código (`pixel-art-studio`/`codeart2d`): fica ruim; use só para retoques e variantes de paleta, com origem `codigo`.
- Custos e OAuth: regras em `nocthera-art-direction` (seção 4).
