---
name: weapon-generator
description: Criação de armas e equipamentos em pixel art (96x96 ou 128x128) para Realms of Nocthera - espadas, machados, cajados, arcos, adagas, escudos, armaduras e acessórios. Use ao pedir arma/equipamento, definir materiais e raridade, montar o briefing/prompt ou iterar um item.
---

# weapon-generator — Armas e equipamentos

Siga `pixel-art-master` primeiro. Aqui: o específico de **itens de combate**.

## Briefing

Modelo: `studio/config/briefs/exemplo-arma-espada-longa.json` (`categoria: "arma"`). Ancore no jogo: `src/rules/armas.ts`, `armasCatalogo.ts`, `armaduras*.ts`, `materiaisArmas.ts` (categoria da arma, raridade, elemento, materiais da receita). O visual deve **contar a receita**: arma feita de "Presa de Lobo" mostra osso/presa; de metal enferrujado mostra ferrugem.

## Composição

- **Diagonal canônica**: base/cabo embaixo à esquerda → ponta em cima à direita (≈45°). Armas de haste (cajado, lança) podem ser quase verticais, mas com leve inclinação para ganhar dinamismo.
- **Sem mão, sem personagem, sem fundo.** Item isolado, sombra projetada **proibida** (a transparência é parte do contrato).
- **Extensão**: a maior dimensão do sprite ocupa ≥ 70% do canvas (limite 97%); margem ≥ 1–2 px.
- **Silhueta por partes**: lâmina / guarda / empunhadura / pomo precisam ser distinguíveis como massas diferentes em preto sólido.

## Materiais e rampas (use a paleta `nocthera-32`)

| Material | Rampa | Regra |
|---|---|---|
| Aço / ferro | `aco-0…aco-2`, `gelo-0` | **1 linha de realce contínua** do guarda à ponta; fio mais claro que o dorso; ferrugem = manchas `brasa-0`/`pele-0` em clusters, nunca pontos soltos |
| Couro / madeira | `pele-0`, `pele-1`, `sombra-*` | 2–3 tons; anéis de empunhadura como faixas de 2 px |
| Osso / presa | `osso-0…2` | realce `osso-2` só na borda iluminada |
| Ouro / bronze | `ouro-0…2` | brilho `ouro-2` em 1–2 clusters pequenos |
| Arcano | `arcano-0…2` | **gema/runas = ponto mais saturado**; um brilho, não aura difusa |
| Brasa / fogo | `brasa-0…2` | só em gume/ponta ativa |

## Raridade (leitura sem moldura)

comum: 2 materiais, foscos · raro: acento aço/azul · muito raro: gema saturada · épico: ornamentos + runa arcana · lendário: ouro+brasa, silhueta intrincada (asas, lâmina serrilhada de propósito), brilho dominante. Mais raridade = **mais variação de silhueta e 1 acento forte**, não mais ruído.

## Erros típicos

Lâmina de largura 1 px (some a 0,5×) · cabo e lâmina da mesma cor · ponta cortada pela borda · sombreado de "cilindro" concêntrico · glow/halo semitransparente (alfa parcial reprova) · cabo mais largo que a guarda · arma "dobrada" por reduzir ao 96.

## Execução

```bash
cd studio
python3 -m nocthera_studio gerar config/briefs/<briefing>.json
python3 -m nocthera_studio auditar assets/candidatos/armas/<id>.png -c arma --folha
```
Limite de **16 cores** para armas. Revisão visual e `aprovar` conforme `pixel-art-auditor`. Para variantes de raridade da mesma arma, gere a base aprovada e varie **apenas** rampas de acento (troca de paleta controlada), preservando a silhueta.


## Ferramentas integradas

- **Armas/itens por modelo**: `master_still.py prompt --class prop --finish hibit --identity "<lâmina, guarda, empunhadura, materiais>"` (ASF) dá o insumo certo; depois `posprocessar`/`hibit` e `auditar -c arma --folha`. Mantenha a diagonal canônica e ≥70% de extensão.
- **Variantes de raridade**: `pixel-art-studio` (rampas `ramp()`, troca de paleta) ou `palette_tool.py` do ASF, **preservando a silhueta** da arma-base aprovada; origem `codigo` para as variantes por troca de paleta.
- **Armas simples e geométricas** (adaga, escudo liso) podem sair do `pixel-art-studio` com revisão visual — declarar origem `codigo`.
- Custos e OAuth: `nocthera-art-direction` (seção 4).
