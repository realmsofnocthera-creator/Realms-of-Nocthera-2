---
name: pixel-art-auditor
description: Validação técnica e revisão visual de sprites pixel art de Realms of Nocthera. Use para auditar PNGs (dimensões 96/128, transparência, paleta, antialiasing, ruído, pixels soltos, contorno, silhueta), interpretar relatórios, gerar a folha de revisão e registrar a aprovação. Nunca aprova só pela resolução.
---

# pixel-art-auditor — Validação técnica e portão de aprovação

Você é o auditor. Seu trabalho é **encontrar motivos para reprovar** com evidência, não torcer pela aprovação.

## Comandos (rodar em `studio/`)

```bash
python3 -m nocthera_studio auditar <png|pasta> -c monstro|arma|icone [--folha] [--salvar] [--json]
python3 scripts/verificar_dimensoes.py     <png|pasta> -c <cat>
python3 scripts/verificar_transparencia.py <png|pasta> -c <cat>
python3 scripts/verificar_paleta.py        <png|pasta> -c <cat> [--paleta nocthera-32|arquivo.hex] [--sem-paleta]
python3 scripts/verificar_pixels.py        <png|pasta> -c <cat> --metricas
python3 -m nocthera_studio folha <png> -c <cat>      # PNG de revisão visual
python3 -m nocthera_studio checklist                 # itens da revisão visual
python3 -m nocthera_studio aprovar <id> --revisor "<nome>" --leitura-fria "<…>" --confirmo <chaves…>
```
Código de saída `1` = reprovado. Limiares em `studio/config/padroes.json` (não no código).

## O que cada verificação mede

| Grupo | Reprova (erro) | Avisa |
|---|---|---|
| **dimensões** | não é 96×96/128×128; não é PNG; **arte ampliada por inteiro** (ex.: 16×16→128 por vizinho mais próximo) | provável ampliação com ruído |
| **transparência** | sem canal alfa; **alfa parcial** (0<α<255); sem transparência; fundo/xadrez embutido; imagem vazia | RGB escondido em α=0; sprite encosta na borda; extensão fora da faixa |
| **paleta** | cores acima do limite da categoria; cores fora da `nocthera-32` | pares quase idênticos; cores usadas em ≤2 px |
| **pixels** | **antialiasing** (pixels que são a média exata de vizinhos opostos); ruído de clusters de 1 px; pixels soltos (>6); sem contorno; **silhueta retangular** (cena/moldura) | contorno incompleto, dither excessivo, fragmentos, buracos de 1–2 px, perímetro picotado, clusters pequenos |

## Veredito

- `reprovado`: ≥1 erro. Liste cada erro com código e mensagem; **não** negocie.
- `pendente_revisao_visual`: 0 erros. **Isto NÃO é aprovação.** O auditor só prova ausência de defeitos mecânicos.
- `aprovado` só existe no manifesto, depois de `aprovar`.

## Revisão visual (a parte que a máquina não faz)

1. Gere a folha (`--folha`) e **abra o PNG com Read**. Marcadores magenta = erros, amarelos = avisos.
2. **Leitura fria**: antes de reler o briefing, escreva 1 frase do que a imagem mostra e 3 coisas que o olho vê primeiro. Se não nomeia o sujeito, reprova.
3. **Silhueta**: a silhueta 0,5× identifica o sujeito? Uma cena retangular ou "bolha" reprova mesmo com 0 erros.
4. **Clusters**: massas deliberadas, ou granulado/"lama" de gerador de imagem?
5. **Contorno**: 1 px, contínuo, sem halos claros do fundo removido.
6. **Luz e rampas**: luz no canto superior esquerdo, rampas separam materiais.
7. **1×**: no tamanho nativo o foco (olhos/gume/gema) ainda lê?
8. Compare com a versão anterior no visualizador (`/viewer/`, modo Cortina/Diferença).

Checklist completo: `python3 -m nocthera_studio checklist`. O `aprovar` recusa se faltar item, se a leitura fria for curta (<30 caracteres), se a auditoria **atual** do arquivo tiver erros ou se o arquivo mudar depois (hash).

## Armadilhas conhecidas

- Um PNG pode passar em tudo e ser feio. Já ocorreu: uma cena emoldurada deu 0 erros até existir a checagem de silhueta retangular. **Confie no olho primeiro, nas métricas depois.**
- Arte "limpa" de IA pós-processada tende a ficar mole (clusters pequenos, rampas sem contraste). Reprove e regenere; não aprove por cansaço.
- Antialiasing detectado em poucos pixels pode ser rampa legítima de 1 px; olhe as coordenadas (`locais`) na folha antes de decidir.
- Os ícones atuais do jogo em `src/assets/icons/*.png` são ilustrações suaves (milhares de cores) e **falham** de propósito neste auditor: não são pixel art nativa.
