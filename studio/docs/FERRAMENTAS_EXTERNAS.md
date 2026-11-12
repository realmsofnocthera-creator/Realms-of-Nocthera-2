# Ferramentas externas integradas

Integradas em 12/11/2026. Todas **vendorizadas em `.claude/skills/`** (versionadas no repositório, sobrevivem ao contêiner efêmero). As 5 skills do Nocthera foram preservadas; só receberam uma seção "Ferramentas integradas" **acrescentada** (0 linhas removidas) e há a nova skill `nocthera-art-direction`.

## Agent Sprite Forge (ASF)
| | |
|---|---|
| Origem | https://github.com/0x0funky/agent-sprite-forge — v0.5.0, commit `6b3da5c` (2026-11-07) |
| Licença | MIT (sem código de terceiros embutido; pixelfx é opcional e externo) |
| Instalação | instalador oficial: `python tools/install_skills.py --apply --dest <repo>/.claude/skills` → 171 arquivos, manifesto sha256 em `.claude/skills/.agent-sprite-forge.install.json`, **nenhum backup necessário** (sem conflito de nomes) |
| Skills | `generate2dsprite` (masters e sprites), `video2dsprite` (clipes de vídeo → set de animação), `generate2dmap` (mapas), `generate2dmedia` (**camada de rotas**: `route_media.py`), `codeart2d` (arte por código; último recurso) |
| Verbatim | nenhum arquivo do ASF foi modificado (`forge_doctor.py` confirma "171 files match the install manifest") |
| Rotas de imagem | 1) API com chave (OpenAI, Gemini, xAI, BytePlus, fal.ai) → 2) Codex/Grok CLI logado → 3) codeart2d só se pedido |
| **Atenção** | para o ASF, **chave configurada = consentimento**: com `FAL_KEY` etc. no ambiente, ele envia a requisição sem perguntar. Por isso o estúdio embrulha o `route_media` num provedor com portão de gasto (`asf_route`). **Não configure chaves de API sem decisão do dono.** |
| Limite do fal no ASF | a rota fal é **edição por imagem de referência** (exige ≥1 `--reference`); texto→imagem pelo fal só pelo MCP |

## Pixel Art Studio
| | |
|---|---|
| Origem | https://github.com/Gamezxz/pixel-art-studio — commit `f8c2466` (2026-07-11) |
| Licença | MIT |
| Instalado | `SKILL.md`, `LICENSE`, `scripts/` (`pixelstudio.py`, `pixelpipe.py`, `study.py`, `lpc.py`), `references/`, `examples/` |
| Não instalado (peso) | `docs/` (756 KB de GIFs/site) e `pixel-art/` (680 KB de galeria) |
| **Patches locais** | (1) `SKILL.md`: caminhos `/Users/game/Projects/...` → `/home/user/Realms-of-Nocthera-2/.claude/skills/pixel-art-studio/scripts` (o README do upstream manda ajustar); (2) `SKILL.md`: **prefixo na `description`** apontando para `nocthera-art-direction`/`pixel-art-master` (o gatilho original "pixel art, sprite" competia com as skills do Nocthera); (3) `examples/slime-build.py` e `slime-bounce.py`: mesmo caminho. Atualizar o upstream exige reaplicar estes 3 patches |
| Modo de uso | o próprio Claude desenha pixel a pixel via Pillow (`pixelstudio.py`), olha o preview e corrige; `pixelpipe.py` limpa PNG sujo (recupera grade, tira fundo, endurece alfa, trava paleta) |

## fal MCP remoto
Ver `docs/FAL_MCP_OAUTH.md`. Configurado em `.mcp.json` (sem segredo). **Pendente: OAuth do usuário.**

## Dependências Python (instaladas e persistentes via `./setup.sh --completo`)
`numpy>=1.26`, `Pillow>=10.1`, `scipy>=1.11`, `resvg-py>=0.5,<0.6` (SVG do codeart2d), `PyYAML`, `jsonschema`, `pytest` (só para testar o ASF). Versões neste ambiente: numpy 2.5.3, scipy 1.18.1, Pillow 12.3.0, resvg-py 0.5.0, pytest 9.2.0. Do sistema: `ffmpeg 6.1.1` (ASF pede ≥5.1, só para vídeo), `node 22` (FX/pixelfx).
**O contêiner é efêmero**: `pip install` some entre sessões. Rode `./setup.sh --completo` no início de cada sessão — ou peça para colocar esse comando no *setup script* do ambiente (decisão do usuário; não alterado).

## Como cada ferramenta se liga ao estúdio
| Ferramenta | Ligação |
|---|---|
| ASF `route_media` | provedor `asf_route` (`gerar --provedor asf_route --planejar` / `--autorizo-gasto USD`) |
| ASF `master_still.py prompt` | gera o prompt "arte lisa para virar pixel" (hibit) — usável sem custo |
| ASF `pixel_reduce.py`, `palette_tool.py`, `finish_frames.py` | conformação/segundo par de olhos antes de `auditar` |
| Pixel Art Studio | ícones simples, retoques, variantes de paleta; `pixelpipe` para limpeza; origem `codigo` |
| fal MCP | (após OAuth) imagens para `assets/entrada/<id>.png` + provedor `manual`; cobra créditos |
| Auditor Nocthera | juiz único de qualquer saída |

## Correção sobre os ícones atuais do jogo
O relatório inicial dizia que `src/assets/icons/*.png` são "ilustrações suaves, não pixel art nativa". **Isso estava incompleto.** O `pixelpipe` recuperou do `attr-forca.png` uma grade de **43×43 (fator ~3×, ampliação suavizada)** e reduziu 668 → 15 cores sem perder o desenho: são pixel art de ~43 px **ampliada com interpolação suave** até 128 px. O auditor os reprova (milhares de cores, alfa parcial) corretamente para o padrão 96/128 nativo, mas o diagnóstico "foram feitos como ilustração suave" estava errado. Duas consequências:
1. O auditor só detecta ampliação **exata** (vizinho mais próximo). Um estimador de período fracionário que testei para ampliação suavizada **não foi confiável** (R≈0,08 vs. ruído 0,07) e não foi adicionado.
2. **Decisão do dono**: o padrão 96/128 nativo conflita com ícones cuja resolução real é ~43 px. Manter 43 px nativos (e ampliar só na UI com `image-rendering: pixelated`) ou refazer a 96/128.
