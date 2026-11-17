# Efeitos de combate em pixel art (pixelfx)

Os efeitos de golpe, os efeitos de status (DoTs e controles), a cura, o bloqueio e a morte do combate vêm do
[pixelfx](https://github.com/patch-gg/pixelfx) (MIT, créditos em `NOTICE.md`): cada efeito é um pequeno código que desenha
uma animação em pixel art, e a ferramenta dele exporta uma folha de quadros com transparência.

## O que está no jogo

`public/images/cacada/pixelfx/<nome>.webp` (quadros lado a lado, cortados rente ao desenho) e `src/assets/pixelfxManifesto.json`
(quadros, tamanho de cada quadro, quadros por segundo, repetição). `src/assets/efeitosPixelfx.ts` diz o tamanho do efeito em
alturas do alvo e onde ele ancora (centro, pés ou cabeça) e qual efeito é o de cada status.

| Nome | Efeito do pixelfx | Usado em |
|---|---|---|
| golpe-corte, golpe-garra | melee/sword-slash, claw-swipe | corte (herói), golpe físico do monstro |
| golpe-perfuracao, golpe-contusao | melee/thrust, impacts/blunt-hit | perfuração, contusão |
| golpe-simples, golpe-critico | impacts/hit-spark, crit-hit | golpe comum, crítico (por cima) |
| golpe-relampago | lightning/zap-hit | elemento relâmpago |
| magia-fogo, gelo, terra, vento, sagrado, sombrio | arcane/mana-burst com a paleta do elemento | golpes elementais e mágicos |
| bloqueio | impacts/shield-block | golpe sem dano |
| cura | holy/heal-aoe | cura |
| morte | spawn/poof | criatura derrotada |
| dot-* (9) | status/bleeding, sleep, confused; nature/toxic-puddle (veneno e, em vermelho, podridão); fire/spirit-flame; ice/ice-crystal; shadow/shadow-flames; lightning/spark-arc | os 9 status, em repetição sobre o alvo |

Os efeitos de status do próprio pixelfx desenham um boneco cinza por baixo (são feitos "no corpo"), por isso não servem para
os nossos monstros; usamos efeitos soltos equivalentes.

## Gerar de novo

```
git clone https://github.com/patch-gg/pixelfx ../pixelfx
PIXELFX_DIR=../pixelfx node scripts/pixelfx/construir.mjs   # renderiza as folhas (lista e paletas dentro do arquivo)
python3 scripts/pixelfx/empacotar.py                       # corta, empacota em WebP e escreve o manifesto
```

Para trocar um efeito, mude o id na lista de `construir.mjs`. Para as paletas dos elementos, mude `PAL`. Cada imagem fica
abaixo de 350 KB (o empacotador baixa a qualidade se precisar) e os testes conferem.
