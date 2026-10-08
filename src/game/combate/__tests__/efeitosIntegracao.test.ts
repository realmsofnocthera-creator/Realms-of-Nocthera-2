import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../../../rules/config';
import {
  aplicarDefesaCavaleiro,
  calcularGolpeFeiticeiro,
  calcularGolpeSamurai,
} from '../../combat';
import {
  aplicarBonusContraSobreescudo,
  reduzirDanoPercentual,
} from '../efeitos';
import { aplicarDano, calcularDefesaFisica } from '../../index';

describe('ORDEM 45b — Testes de Equivalência e Integração dos Efeitos de Combate', () => {
  // Fórmulas antigas reescritas dentro do próprio teste (conforme especificação da Ordem 45b)
  const formulaAntigaSobreescudo = (dano: number, sobreescudoAlvo: number, bonus: number): number => {
    if (sobreescudoAlvo <= 0 || bonus <= 0) {
      return dano;
    }
    return Math.ceil((dano * (100 + bonus)) / 100);
  };

  const formulaAntigaReducao = (danoBruto: number, reducao: number): number => {
    return Math.max(
      GAME_CONFIG.DANO_MINIMO,
      Math.floor((danoBruto * Math.max(0, 100 - reducao)) / 100)
    );
  };

  describe('Equivalência pura direta das fórmulas antigas vs helpers', () => {
    it('aplicarBonusContraSobreescudo é estritamente equivalente à fórmula antiga em todos os cenários', () => {
      const danos = [1, 5, 13, 27, 50, 77, 100, 250, 999];
      const escudos = [0, -5, 1, 10, 50, 100];
      const bonusList = [0, -10, 10, 20, 25, 50];

      for (const dano of danos) {
        for (const escudo of escudos) {
          for (const bonus of bonusList) {
            const esperado = formulaAntigaSobreescudo(dano, escudo, bonus);
            const obtido = aplicarBonusContraSobreescudo(dano, escudo, bonus);
            expect(obtido).toBe(esperado);
          }
        }
      }
    });

    it('reduzirDanoPercentual é estritamente equivalente à fórmula antiga para reduções 0, 10, 20, 25, acumuladas e extremas', () => {
      const danos = [0, 1, 2, 7, 13, 25, 50, 79, 100, 250, 500, 1000];
      const reducoes = [0, 10, 20, 25, 30, 35, 45, 55, 100, 120];

      for (const dano of danos) {
        for (const red of reducoes) {
          const esperado = formulaAntigaReducao(dano, red);
          const obtido = reduzirDanoPercentual(dano, red);
          expect(obtido).toBe(esperado);
        }
      }
    });
  });

  describe('Integração Real 1: Feiticeiro Ultimate (Cataclismo Arcano)', () => {
    it('com sobreescudoAlvo = 0: não aplica bônus contra sobreescudo (equivalente à fórmula antiga)', () => {
      const inteligencias = [10, 20, 35, 50, 80];

      for (const intBase of inteligencias) {
        const resultado = calcularGolpeFeiticeiro({
          inteligenciaBase: intBase,
          nivel: 30,
          contadorExplosao: 0,
          contadorAcumulo: 0,
          cargasAcumulo: 0,
          contadorCataclismo: 6, // 7º ataque -> dispara Cataclismo Arcano (400% dano, +25% vs Sobreescudo)
          sobreescudoAlvo: 0,
          mitigacaoMagicaAlvo: 0,
        });

        expect(resultado.habilidadeAcionada).toBe('Cataclismo Arcano');
        expect(resultado.bonusSobreescudoCataclismoAtivo).toBe(false);

        // Dano sem bônus de sobreescudo
        const danoBase = resultado.danoMagicoBase;
        const danoAntesBonus = Math.ceil((danoBase * 400) / 100);
        const danoEsperado = formulaAntigaSobreescudo(danoAntesBonus, 0, 25);

        expect(resultado.danoBruto).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoEsperado));
      }
    });

    it('com sobreescudoAlvo > 0: aplica bônus de 25% contra sobreescudo estritamente idêntico à fórmula antiga', () => {
      const inteligencias = [12, 25, 40, 60, 95];
      const escudos = [10, 50, 200];

      for (const intBase of inteligencias) {
        for (const escudo of escudos) {
          const resultado = calcularGolpeFeiticeiro({
            inteligenciaBase: intBase,
            nivel: 30,
            contadorExplosao: 0,
            contadorAcumulo: 0,
            cargasAcumulo: 0,
            contadorCataclismo: 6,
            sobreescudoAlvo: escudo,
            mitigacaoMagicaAlvo: 0,
          });

          expect(resultado.habilidadeAcionada).toBe('Cataclismo Arcano');
          expect(resultado.bonusSobreescudoCataclismoAtivo).toBe(true);

          const danoBase = resultado.danoMagicoBase;
          const danoAntesBonus = Math.ceil((danoBase * 400) / 100);
          const danoEsperado = formulaAntigaSobreescudo(danoAntesBonus, escudo, 25);

          expect(resultado.danoBruto).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoEsperado));
        }
      }
    });
  });

  describe('Integração Real 2: Samurai Ultimate (Corte do Vazio)', () => {
    it('com sobreescudoAlvo = 0: não aplica bônus contra sobreescudo (equivalente à fórmula antiga)', () => {
      const forcas = [10, 22, 45, 70, 110];

      for (const forca of forcas) {
        const resultado = calcularGolpeSamurai({
          forcaBase: forca,
          nivel: 30,
          contadorIaijutsu: 0,
          contadorFocoAbsoluto: 0,
          cargasFocoAbsoluto: 0,
          contadorCorteDoVazio: 6, // 7º ataque -> dispara Corte do Vazio (450% dano, +25% vs Sobreescudo)
          sobreescudoAlvo: 0,
          mitigacaoFisicaAlvo: 0,
        });

        expect(resultado.habilidadeAcionada).toBe('Corte do Vazio');
        expect(resultado.bonusSobreescudoCorteDoVazioAtivo).toBe(false);

        const danoBase = resultado.danoFisicoBase;
        const danoAntesBonus = Math.ceil((danoBase * 450) / 100);
        const danoEsperado = formulaAntigaSobreescudo(danoAntesBonus, 0, 25);

        expect(resultado.danoBrutoPrincipal).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoEsperado));
      }
    });

    it('com sobreescudoAlvo > 0: aplica bônus de 25% contra sobreescudo estritamente idêntico à fórmula antiga', () => {
      const forcas = [15, 30, 55, 85, 120];
      const escudos = [15, 60, 150];

      for (const forca of forcas) {
        for (const escudo of escudos) {
          const resultado = calcularGolpeSamurai({
            forcaBase: forca,
            nivel: 30,
            contadorIaijutsu: 0,
            contadorFocoAbsoluto: 0,
            cargasFocoAbsoluto: 0,
            contadorCorteDoVazio: 6,
            sobreescudoAlvo: escudo,
            mitigacaoFisicaAlvo: 0,
          });

          expect(resultado.habilidadeAcionada).toBe('Corte do Vazio');
          expect(resultado.bonusSobreescudoCorteDoVazioAtivo).toBe(true);

          const danoBase = resultado.danoFisicoBase;
          const danoAntesBonus = Math.ceil((danoBase * 450) / 100);
          const danoEsperado = formulaAntigaSobreescudo(danoAntesBonus, escudo, 25);

          expect(resultado.danoBrutoPrincipal).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoEsperado));
        }
      }
    });
  });

  describe('Integração Real 3: Cavaleiro Defesa (aplicarDefesaCavaleiro)', () => {
    const danos = [1, 5, 12, 25, 50, 100, 250, 500];

    it('redução 0%: sem postura, sem juramento, hp cheio (Último Bastião inativo)', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 100,
          hpMax: 100,
          nivel: 1,
          ehDanoFisico: true,
          posturaAtiva: false,
          juramentoAtivo: false,
        });

        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 0);
        const defesaFisica = calcularDefesaFisica(10, { classeId: 'cavaleiro', nivel: 1 });
        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, 0, 100);

        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });

    it('redução 10%: Último Bastião ativo com dano físico (HP <= 30%)', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 25,
          hpMax: 100,
          nivel: 20,
          ehDanoFisico: true,
          posturaAtiva: false,
          juramentoAtivo: false,
        });

        expect(resultado.ultimoBastiaoAtivo).toBe(true);
        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 10);
        let defesaFisica = calcularDefesaFisica(10, { classeId: 'cavaleiro', nivel: 20 });
        defesaFisica = Math.ceil((defesaFisica * 115) / 100); // +15% de defesa do Último Bastião

        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, 0, 25);
        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });

    it('redução 20%: Postura do Guardião ativa (nível >= 5)', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 100,
          hpMax: 100,
          nivel: 10,
          ehDanoFisico: true,
          posturaAtiva: true,
          juramentoAtivo: false,
        });

        expect(resultado.posturaAplicada).toBe(true);
        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 20);
        const defesaFisica = calcularDefesaFisica(12, { classeId: 'cavaleiro', nivel: 10 }); // +2 vit
        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, 4, 100); // +4 sobreescudo fixo

        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.sobreescudo).toBe(esperado.sobreescudo);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });

    it('redução 25%: Juramento do Guardião ativo (nível >= 30)', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 100,
          hpMax: 100,
          nivel: 30,
          ehDanoFisico: true,
          posturaAtiva: false,
          juramentoAtivo: true,
        });

        expect(resultado.juramentoAplicado).toBe(true);
        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 25);
        let defesaFisica = calcularDefesaFisica(15, { classeId: 'cavaleiro', nivel: 30 }); // +5 vit
        defesaFisica = Math.ceil((defesaFisica * 120) / 100); // +20% def
        const sobreescudoEfetivo = Math.ceil((10 * 120) / 100); // 5*2 = 10 fixo, +20% escudo = 12
        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, sobreescudoEfetivo, 100);

        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.sobreescudo).toBe(esperado.sobreescudo);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });

    it('reduções acumuladas: Postura (20%) + Juramento (25%) = 45%', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 100,
          hpMax: 100,
          nivel: 30,
          ehDanoFisico: true,
          posturaAtiva: true,
          juramentoAtivo: true,
        });

        expect(resultado.posturaAplicada).toBe(true);
        expect(resultado.juramentoAplicado).toBe(true);
        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 45);
        let defesaFisica = calcularDefesaFisica(17, { classeId: 'cavaleiro', nivel: 30 }); // +2 +5 vit
        defesaFisica = Math.ceil((defesaFisica * 120) / 100);
        const sobreescudoEfetivo = Math.ceil((14 * 120) / 100); // 4 + 10 = 14 fixo, +20% escudo = 17
        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, sobreescudoEfetivo, 100);

        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.sobreescudo).toBe(esperado.sobreescudo);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });

    it('reduções acumuladas: Postura (20%) + Juramento (25%) + Último Bastião (10%) = 55%', () => {
      for (const danoBruto of danos) {
        const resultado = aplicarDefesaCavaleiro({
          danoBruto,
          vitalidadeBase: 10,
          sobreescudoAtual: 0,
          hpAtual: 20,
          hpMax: 100,
          nivel: 30,
          ehDanoFisico: true,
          posturaAtiva: true,
          juramentoAtivo: true,
        });

        expect(resultado.posturaAplicada).toBe(true);
        expect(resultado.juramentoAplicado).toBe(true);
        expect(resultado.ultimoBastiaoAtivo).toBe(true);

        const danoReduzidoEsperado = formulaAntigaReducao(danoBruto, 55);
        let defesaFisica = calcularDefesaFisica(17, { classeId: 'cavaleiro', nivel: 30 });
        defesaFisica = Math.ceil((defesaFisica * 135) / 100); // +20% juramento + 15% ultimo bastiao
        const sobreescudoEfetivo = Math.ceil((14 * 135) / 100); // 14 fixo, +20% juramento + 15% ultimo bastiao = 35%
        const esperado = aplicarDano(danoReduzidoEsperado, defesaFisica, sobreescudoEfetivo, 20);

        expect(resultado.hp).toBe(esperado.hp);
        expect(resultado.sobreescudo).toBe(esperado.sobreescudo);
        expect(resultado.danoEfetivo).toBe(Math.max(GAME_CONFIG.DANO_MINIMO, danoReduzidoEsperado - defesaFisica));
      }
    });
  });
});
