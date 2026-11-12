---
name: icon-generator
description: Criação de ícones, colecionáveis, materiais, cartas e emblemas em pixel art (96x96 ou 128x128) para Realms of Nocthera. Use ao pedir ícone de item/material/habilidade/conquista, carta da alma, colecionável por raridade, ou ao padronizar um conjunto de ícones.
---

# icon-generator — Ícones e colecionáveis

Siga `pixel-art-master` primeiro. Ícones são vistos **pequenos** (listas, inventário, mercado): a legibilidade a 32 px manda.

## Briefing

Modelo: `studio/config/briefs/exemplo-icone-dente-afiado.json` (`categoria: "icone"`, `raridade`). Ancore em `src/rules/materiais.ts`, `raridades.ts` (comum→lendário, 1–5 estrelas), `colecionaveis`, `conquistas`, `skillIcons.ts`, e nas pastas `src/assets/icons|images`.

## Regras de design

1. **Um objeto, uma ideia.** Compacto, centrado, ocupa 55–95% do canvas. Nada de cenas.
2. **Teste de 32 px**: reduza mentalmente (ou na folha: silhueta 0,5×) — se não identifica, simplifique e engrosse a silhueta.
3. **Contorno forte** (1 px) e rampa de 3 tons por material; **um acento** de cor por ícone.
4. **Conjunto coerente**: mesma luz (superior esquerda), mesmo contorno, mesma largura de traço, mesma densidade de detalhe. Gere/revise em lote lado a lado no visualizador (modo "Lado a lado").
5. **Sem moldura/fundo embutido.** Moldura de raridade é componente de UI do jogo (`src/rules/molduras.ts`), não faz parte do sprite.
6. **Raridade pelo acento**: comum foscos e dessaturados · raro aço · muito raro joia saturada com 1 brilho · épico arcano + brilho de borda · lendário ouro/brasa com silhueta ornamentada.

## Colecionáveis e cartas

- Cartas da alma/colecionáveis: sujeito central + 1 elemento de contexto no máximo; sem texto (texto é renderizado pelo jogo).
- Séries (ex.: 10 criaturas de um bloco): fixe **a mesma semente de estilo e paleta**, varie descrição; revise a série inteira lado a lado antes de aprovar qualquer uma.

## Execução

```bash
cd studio
python3 -m nocthera_studio gerar config/briefs/<briefing>.json
python3 -m nocthera_studio auditar assets/candidatos/icones/<id>.png -c icone --folha
python3 -m nocthera_studio manifesto && python3 -m nocthera_studio servir   # comparar série no /viewer/
```
Limite de **16 cores**. Conferência final em `pixel-art-auditor`.

## Aviso sobre os ícones atuais do repositório

`src/assets/icons/*.png` (atributos, raças, recursos) são **ilustrações suaves** com milhares de cores e alfa parcial: o auditor as reprova em paleta/antialiasing/ruído. Se o jogo adotar pixel art nativa, eles precisam ser **refeitos**; não "pixelize por redução" esperando passar — a revisão visual decide.
