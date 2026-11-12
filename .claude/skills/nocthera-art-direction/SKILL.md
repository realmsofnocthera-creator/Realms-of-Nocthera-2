---
name: nocthera-art-direction
description: Direção de arte de Realms of Nocthera e roteador de ferramentas do estúdio. Use ANTES de gerar ou editar qualquer arte do jogo para decidir estilo, tamanho, paleta, raridade e qual ferramenta usar (Agent Sprite Forge, Pixel Art Studio, fal MCP, auditor Nocthera), e sempre que houver risco de custo (geração paga) ou dúvida sobre origem da arte. Tem precedência sobre as skills de terceiros generate2dsprite, generate2dmedia, video2dsprite, generate2dmap, codeart2d e pixel-art-studio em pedidos de ativos do Nocthera.
---

# nocthera-art-direction — Direção de arte e roteamento de ferramentas

Esta skill **decide**; `pixel-art-master` **conduz o fluxo**; `monster-/weapon-/icon-generator` dão as regras por categoria; `pixel-art-auditor` **barra**. As ferramentas de terceiros são **motores**, nunca juízes.

## 1. Regras de ouro (valem para qualquer ferramenta)

1. **Padrão do jogo é o do estúdio**: 96×96 ou 128×128 nativo, PNG com alfa binário, paleta `nocthera-32` (≤24 cores monstro, ≤16 arma/ícone), contorno 1 px, luz no canto superior esquerdo, silhueta legível a 0,5×. Nenhuma ferramenta externa muda isso.
2. **Passar na máquina não aprova.** Só `aprovar` (checklist visual + leitura fria + auditoria sem erros + hash + **origem declarada**) libera um ativo.
3. **Nenhum gasto sem autorização expressa do usuário** (seção 4).
4. **Declare a origem** de cada ativo (`origem <id> --tipo modelo|codigo|humano|referencia`). Arte desenhada por código **nunca** é apresentada como saída de modelo.
5. **Sem desenho de mentira**: se não houver rota de imagem, informe o bloqueio ou use o caminho por código **declarando-o** — não finja geração.

## 2. Direção de arte (resumo; detalhes em `pixel-art-master`)

- Dark fantasy sujo e legível. Sombras violeta (`sombra-*`), nunca `#000`. Foco (olhos/gume/gema) = ponto mais claro e saturado.
- Tamanho: **96** criaturas comuns e ícones; **128** elites/chefes, armas e silhuetas grandes.
- Raridade pelo acento de cor + riqueza de silhueta (comum fosco → lendário ouro/brasa), nunca por moldura embutida (ver `src/rules/raridades.ts`, `molduras.ts`).
- Ancore no jogo: `src/rules/monsters.ts`, `armas*.ts`, `materiais.ts`. A arte deve contar o que a regra diz (fraqueza, elemento, material da receita).

## 3. Roteador: situação → ferramenta

| Situação | Caminho |
|---|---|
| **Ativo novo, com modelo de imagem** | `generate2dsprite/scripts/master_still.py prompt --finish hibit` (prompt de arte lisa, sem contorno, ≤3 tons/material: o insumo certo para virar pixel) → imagem pela rota que existir (ASF `route_media`, fal MCP autenticado, ou imagem trazida) → conformar: ASF `finish_frames.py hibit --canvas 96x96` **ou** `posprocessar` do estúdio → `auditar --folha` |
| **Sem rota de imagem** | `python3 -m nocthera_studio diagnostico` e relate. Opções: o usuário autoriza OAuth/chave; traz a imagem (provedor `manual`); ou arte por código declarada |
| **Imagem existente suja ou "pixel art" ampliada** | ASF `pixel_reduce.py` (grade inteira, recusa imagem sem grade) e/ou `pixel-art-studio/scripts/pixelpipe.py` (limpa, trava paleta). Conferir resolução nativa real com `auditar` (ampliação) |
| **Ícone simples, variante de paleta, retoque fino** | `pixel-art-studio` (Pillow, rampas, outline seletivo) — origem `codigo`, 2–3 passadas de ver→criticar→corrigir |
| **Criatura complexa, personagem, chefe** | **Não** desenhar por código (o próprio Codixel/ASF avisam: resulta ruim; codeart2d só até ~48 px). Use modelo + conformação, ou referência real pixelada |
| **Animação / spritesheet** | ASF `video2dsprite` (exige rota de vídeo + ffmpeg 5.1+) ou frames do `pixel-art-studio`. **Ainda não validado neste ambiente** |
| **Mapa / tileset / cenário** | ASF `generate2dmap` — fora do escopo atual do estúdio |
| **Efeitos (fogo, impacto)** | `fx_pixelfx.py` (projeto pixelfx, MIT, exige clonar à parte + Node) ou `codeart2d` fx — declarar origem `codigo` |

**Conflitos de padrão a resolver sempre:** o acabamento `hd` do ASF **não** serve (não é pixel art nativa) — use `hibit` ou `pixel`. Os 80 px do hibit e os 32 px do codeart2d não são 96/128: ajuste `--canvas`/PixelSpec. A paleta aprendida por personagem do ASF vira `nocthera-32` depois (`python3 -m nocthera_studio paleta --exportar-hex` → `palette_tool.py apply`, ou `posprocessar`). O veredito final é do auditor, não da ferramenta.

**Precedência de gatilhos:** para pedido de ativo do Nocthera, comece por esta skill e `pixel-art-master`. As skills de terceiros só entram pelo roteador acima.

## 4. Política de custo e credenciais (inegociável)

- **Plano antes de gerar**: `python3 -m nocthera_studio gerar <briefing> --provedor asf_route --planejar` mostra rota e estimativa **sem enviar nada**. Mostre ao usuário.
- **Só gere com `--autorizo-gasto <USD>` se o usuário, nesta conversa, autorizou um teto.** Aprovação de um lote não vale para o próximo. Nunca invente o teto nem o passe "por conveniência".
- O ASF trata "chave configurada" como consentimento: **não configure chaves de API** (`FAL_KEY` etc.) por conta própria nem as grave em arquivo/repositório. Chaves vão em segredo do ambiente, configuradas pelo usuário.
- Ferramentas MCP geradoras (fal após OAuth; qualquer `*_generate_*`, inclusive ElevenLabs) **cobram créditos**: pergunte antes de cada geração ou lote, diga o que será gerado e a estimativa quando houver. Nunca repita uma chamada "para tentar de novo" (cobra de novo).
- Autenticação OAuth é feita **pelo usuário no navegador**. Nunca peça para colar token/chave no chat, no código ou no repositório.
- Resultado de geração paga fica em `assets/bruto/` com `.forge/ledger.jsonl` (assets/.forge) — registro de gasto versionado.

## 5. Origem e divulgação

`modelo` (API/CLI + pós-processo) · `codigo` (pixel-art-studio, codeart2d, pxl, pixelfx) · `humano` · `referencia` (pixelada de imagem real licenciada). Verifique licença de referência e de qualquer ferramenta (ASF, Pixel Art Studio e pixelfx são MIT; ver `studio/docs/FERRAMENTAS_EXTERNAS.md`). O `aprovar` exige origem; arte por código deve ser divulgada como tal.

## 6. Checagens rápidas

```bash
cd studio
python3 -m nocthera_studio diagnostico            # o que realmente gera imagem agora
python3 -m nocthera_studio gerar B.json --provedor asf_route --planejar
python3 -m nocthera_studio auditar X.png -c monstro --folha
python3 -m nocthera_studio origem ID --tipo modelo --detalhe "fal nano-banana-2 + hibit"
```
