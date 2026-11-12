# Estúdio de Pixel Art — Realms of Nocthera

Infraestrutura para **produzir, validar e revisar** pixel art do jogo (criaturas, armas/equipamentos, ícones/colecionáveis) rodando 100% no ambiente cloud do Claude Code. Só precisa de **Python ≥ 3.10 + Pillow**.

> **Regra de ouro:** passar nas verificações técnicas **não aprova** um sprite. O melhor veredito automático é `pendente_revisao_visual`. Aprovação exige olhar a folha de revisão e registrar a revisão (`aprovar`).
>
> **Sem desenho de mentira:** o estúdio não gera arte com formas geométricas. A imagem vem de um modelo de imagens (via provedor), de referência real pixelada, de ferramenta de pixel art ou de um artista. Sem fonte, o fluxo para e avisa.

## Início rápido

```bash
cd studio
./setup.sh                     # confere Python/Pillow e roda os testes (35)
python3 -m nocthera_studio auditar caminho/sprite.png -c monstro --folha
python3 -m nocthera_studio manifesto && python3 -m nocthera_studio servir   # http://localhost:8000/viewer/
```

## Padrões

| Item | Regra |
|---|---|
| Resolução nativa | **96×96** ou **128×128** (arte menor ampliada é reprovada) |
| Formato | PNG com alfa **binário** (0 ou 255); sem fundo, sem xadrez falso |
| Antialiasing/blur | proibido (detectado por pixels que são média exata dos vizinhos) |
| Paleta | `config/paleta-nocthera-32.json`; máx. 24 cores (monstro) / 16 (arma, ícone) |
| Silhueta | legível em preto sólido a 0,5×; não retangular |
| Clusters | massas deliberadas; ruído de 1 px reprova |
| Contorno | 1 px contínuo |

Limiares: `config/padroes.json` · detalhes: `docs/PADROES_TECNICOS.md`.

## Estrutura

```
.claude/skills/            pixel-art-master · monster-generator · weapon-generator · icon-generator · pixel-art-auditor
studio/
├── setup.sh · requirements.txt
├── config/                padroes.json · paleta-nocthera-32.json · estilo_prompt.json · provedores.json · briefs/
├── nocthera_studio/       núcleo Python
│   ├── verificacoes.py    dimensões · transparência · paleta · pixels
│   ├── auditoria.py       veredito técnico (nunca "aprovado")
│   ├── posprocessar.py    bruto de modelo → PNG nativo (sem desenhar)
│   ├── manifesto.py       manifesto + portão de aprovação (checklist, hash)
│   ├── folha.py           folha de revisão visual (PNG)
│   ├── prompts.py         briefing → prompt
│   ├── geracao/           provedores: manual · comando_externo · http_api
│   ├── fluxo.py           briefing → … → manifesto
│   └── cli.py
├── scripts/               verificar_dimensoes|transparencia|paleta|pixels.py · auditar.py
├── viewer/index.html      visualizador responsivo (celular), zoom até 800%
├── assets/                entrada · bruto · candidatos · aprovados · relatorios · previews · manifesto.json
├── tests/                 35 testes (unittest)
└── docs/
```

## Comandos

| Comando | Para quê |
|---|---|
| `auditar <png\|pasta> -c <cat> [--folha] [--salvar] [--json]` | auditoria completa; saída 1 se reprovado |
| `scripts/verificar_{dimensoes,transparencia,paleta,pixels}.py` | cada verificação isolada (`--json`, `--metricas`) |
| `posprocessar <entrada> <saida> -c <cat> [--tamanho 96\|128] [--metodo box\|moda\|nearest] [--contorno]` | bruto → nativo com paleta |
| `gerar <briefing.json> [--provedor …]` | briefing → prompt → provedor → pós-processo → auditoria |
| `folha <png>` | folha de revisão (4×, 1×, silhueta, paleta, marcadores) |
| `checklist` / `aprovar <id> …` | revisão visual e portão de aprovação |
| `manifesto` | reconstrói `assets/manifesto.json` (lido pelo visualizador) |
| `servir [--porta 8000]` | serve a pasta para abrir `/viewer/` |

Todos via `python3 -m nocthera_studio <comando>`. Categorias (`-c`): `monstro`, `arma`, `icone`, `generico`.

## Documentação

- `docs/FLUXO_DE_TRABALHO.md` — do briefing à aprovação
- `docs/PADROES_TECNICOS.md` — cada verificação, limiares e como ler o relatório
- `docs/INTEGRACAO_API.md` — ligar um modelo de geração de imagens
- `docs/VISUALIZADOR.md` — uso no celular (zoom, grade, comparação)
- `docs/REFERENCIAS.md` — como usar `codixel`, `pxl` e `aseprite-ai-artist`
- `docs/RELATORIO_INICIAL.md` — o que foi construído, testado e o que falta
