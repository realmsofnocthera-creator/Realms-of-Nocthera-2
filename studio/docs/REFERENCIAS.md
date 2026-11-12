# Repositórios de referência

Conhecimento e algumas gerações vêm dos repositórios abaixo (clonados ao lado deste, em `../`). A arte **final** fica aqui (`Realms-of-Nocthera-2`). Nada deles é dependência de execução do estúdio.

| Repo | O que aproveitar | Onde ler |
|---|---|---|
| `codixel` | Método: **não desenhar da imaginação**; achar imagem real → pixelar → (rig) → animar, conferindo cada passo com o usuário. `core/pixel.js`: `removeBg`, `resize` (`mode`), `quantize`, `cleanup`, `smoothEdge`, `outline`/`selout`/`rimLight` | `../codixel/SKILL.md` |
| `pxl` | Pixel art como código (`.px.js`): espelhamento, outline automático, variantes por troca de paleta; **`lint`** (pixels órfãos, jaggies, pillow shading) e viewer ao vivo. Node ≥ 22.18 | `../pxl/SKILL.md`, `../pxl/reference.md` |
| `aseprite-ai-artist` | Skills `review`, `shade`, `palette`, `fix`, `rig`, `animate`; paletas prontas em `knowledge/palettes.json` (ex.: `endesga-32`, `apollo`, `pico8`) | `../aseprite-ai-artist/skills/*/SKILL.md` |

## Como se encaixam
- **Gerar**: provedor `comando_externo` pode chamar um script `pxl`/Aseprite; ou gere lá e entregue o PNG em `assets/entrada/` (provedor `manual`).
- **Pixelar referência real** (Codixel) → PNG bruto → `posprocessar`.
- **Revisar**: o checklist do `aprovar` espelha a "leitura fria" e as checagens do skill `review` do aseprite-ai-artist; `pxl lint` é um segundo par de olhos para órfãos/jaggies.
- **Paletas**: converta uma paleta externa para `.hex` e passe `--paleta arquivo.hex` (ou crie `config/paleta-<nome>.json`).

## Licenças
Verifique a licença de cada repositório/imagem antes de reutilizar código ou arte (o checklist inclui `originalidade`). Este estúdio apenas **lê** esses repositórios; não copia seus assets.
