'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  auth,
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  logoutUser,
} from '@/lib/firebase';
import { CharacterCreateForm } from '@/components/CharacterCreateForm';
import { mensagemErroAutenticacao, SENHA_TAMANHO_MINIMO, validarSenhaNova } from '@/lib/senha';
import { CharacterDocument } from '@/server/characterService';
import Link from 'next/link';
import { BotaoDeAcao } from '@/components/login/BotaoDeAcao';
import { CamposDeIdadeETermos } from '@/components/login/CamposDeIdadeETermos';
import { FundoDoPortal } from '@/components/login/FundoDoPortal';
import { LOGO_DA_PAGINA_INICIAL } from '@/assets/landing';
import { validarIdadeMinima } from '@/rules/idadeMinima';
import { VERSAO_DOS_TERMOS, type AceiteDoCliente } from '@/rules/termos';

interface SessionUser {
  uid: string;
  email: string | null;
}


/** A resposta diz que a conta está suspensa ou banida (3.5.4.3)? Aí vai para a tela da apelação (6.5-7). */
async function contaSancionada(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const corpo = (await res.json().catch(() => null)) as { contaSancionada?: boolean } | null;
  return corpo?.contaSancionada === true;
}

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modo do formulário: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Idade mínima (16 anos) e aceite dos Termos: pedidos no cadastro, ou na confirmação para quem entrou sem cadastro (Google)
  const [dataNascimento, setDataNascimento] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceite, setAceite] = useState<AceiteDoCliente | null>(null);
  const [erroAceite, setErroAceite] = useState<string | null>(null);

  // Recuperação de senha (apenas modo login)
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Estado do personagem
  const [character, setCharacter] = useState<CharacterDocument | null>(null);
  const [charLoading, setCharLoading] = useState(false);
  // Só depois de saber se há personagem é que a confirmação de idade pode aparecer (evita piscar para quem já joga)
  const [personagemVerificado, setPersonagemVerificado] = useState(false);

  // Função para buscar o personagem a partir de um token
  const loadCharacterData = async (token: string) => {
    setCharLoading(true);
    try {
      const res = await fetch('/api/character/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const loadedChar = data.character || null;
        setCharacter(loadedChar);
        if (loadedChar) {
          router.replace('/hub');
        }
      } else if (await contaSancionada(res)) {
        router.replace('/conta-sancionada');
      } else {
        setCharacter(null);
      }
    } catch {
      setCharacter(null);
    } finally {
      setCharLoading(false);
      setPersonagemVerificado(true);
    }
  };

  // Monitora estado da autenticação do Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email });
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          const res = await fetch('/api/character/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            const loadedChar = data.character || null;
            setCharacter(loadedChar);
            if (loadedChar) {
              router.replace('/hub');
            }
          } else if (await contaSancionada(res)) {
            router.replace('/conta-sancionada');
            return;
          } else {
            setCharacter(null);
          }
        } catch {
          setIdToken(null);
          setCharacter(null);
        }
        setPersonagemVerificado(true);
        setAuthLoading(false);
        return;
      }

      setPersonagemVerificado(false);
      setUser(null);
      setIdToken(null);
      setCharacter(null);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  /** Mensagem de erro se a data de nascimento não chega a 16 anos ou os Termos não foram aceitos; senão null. */
  const erroDoAceite = (): string | null => {
    const erroIdade = validarIdadeMinima(dataNascimento);
    if (erroIdade) return erroIdade;
    if (!aceitouTermos) return 'Aceite os Termos de Uso e a Política de Privacidade para continuar.';
    return null;
  };

  const confirmarAceite = (e: React.FormEvent) => {
    e.preventDefault();
    const erro = erroDoAceite();
    setErroAceite(erro);
    if (!erro) setAceite({ dataNascimento, termosVersao: VERSAO_DOS_TERMOS });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setFormLoading(true);

    if (mode === 'signup') {
      const erroSenha = validarSenhaNova(password);
      if (erroSenha) {
        setAuthError(erroSenha);
        setFormLoading(false);
        return;
      }
      const erroDeAceite = erroDoAceite();
      if (erroDeAceite) {
        setAuthError(erroDeAceite);
        setFormLoading(false);
        return;
      }
    }

    try {
      if (mode === 'signup') {
        const cred = await signUpWithEmail(email, password);
        setAceite({ dataNascimento, termosVersao: VERSAO_DOS_TERMOS });
        try {
          await sendEmailVerification(cred.user);
          setAuthNotice(
            'Conta criada com sucesso! Enviamos um e-mail de verificação — confira sua caixa de entrada.'
          );
        } catch {
          setAuthNotice(
            'Conta criada com sucesso! Não foi possível enviar o e-mail de verificação agora, mas você poderá reenviá-lo no Hub.'
          );
        }
        const token = await cred.user.getIdToken();
        setUser({ uid: cred.user.uid, email: cred.user.email });
        setIdToken(token);
        await loadCharacterData(token);
      } else {
        const cred = await loginWithEmail(email, password);
        const token = await cred.user.getIdToken();
        setUser({ uid: cred.user.uid, email: cred.user.email });
        setIdToken(token);
        await loadCharacterData(token);
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setAuthError(mensagemErroAutenticacao(firebaseError.code));
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setFormLoading(true);
    try {
      const cred = await loginWithGoogle();
      const token = await cred.user.getIdToken();
      setUser({ uid: cred.user.uid, email: cred.user.email });
      setIdToken(token);
      await loadCharacterData(token);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      setAuthError(mensagemErroAutenticacao(firebaseError.code));
    } finally {
      setFormLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setResetError('Informe um endereço de e-mail válido.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess('Se esse e-mail existir, enviamos um link de recuperação');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      // Por segurança, não revelar se a conta existe
      if (firebaseError.code === 'auth/user-not-found') {
        setResetSuccess('Se esse e-mail existir, enviamos um link de recuperação');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setResetError('Informe um endereço de e-mail válido.');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setResetError('Muitas tentativas recentes. Aguarde alguns instantes e tente novamente.');
      } else if (firebaseError.code === 'auth/network-request-failed') {
        setResetError('Erro de conexão de rede. Verifique sua internet e tente novamente.');
      } else {
        setResetError('Não foi possível processar a solicitação no momento. Tente novamente.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setIdToken(null);
    setCharacter(null);
    setPersonagemVerificado(false);
    setAceite(null);
    setAceitouTermos(false);
    setDataNascimento('');
  };

  const CAMPO =
    'w-full bg-[#0D0D0D]/80 border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C99] px-3 py-2.5 text-[#F5F3E0] placeholder-[#E2D6B6]/35 focus:outline-none focus:shadow-[0_0_0_2px_#ED8A0C] hover:shadow-[0_0_0_2px_#D5C7A4] transition-shadow text-sm';
  const ROTULO = 'block text-xs uppercase font-cinzel tracking-wider text-[#D5C7A4] mb-1.5';
  const AVISO_ERRO = 'mb-4 p-3 bg-[#6B1212]/55 border-2 border-[#6B1212] text-[#F5F3E0] text-xs leading-relaxed';
  const AVISO_INFO = 'mb-4 p-3 bg-[#2B2824]/90 border-2 border-[#ED8A0C]/60 text-[#E2D6B6] text-xs leading-relaxed';

  if (authLoading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center text-[#E2D6B6]">
        <FundoDoPortal />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#ED8A0C] border-t-transparent animate-spin" />
          <span className="font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#F5F3E0]">Consultando os Reinos...</span>
        </div>
      </main>
    );
  }

  const precisaConfirmarAceite = !!user && personagemVerificado && !charLoading && !character && !aceite;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-3 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
      <FundoDoPortal />

      <header className="relative z-10 mb-6 sm:mb-8 text-center px-2">
        <Link href="/" className="inline-block" aria-label="Realms of Nocthera, voltar à página inicial">
          {LOGO_DA_PAGINA_INICIAL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_DA_PAGINA_INICIAL} alt="Realms of Nocthera" width={1000} height={136} className="mx-auto w-[260px] sm:w-[380px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]" />
          ) : (
            <span className="font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] text-lg sm:text-3xl [text-shadow:0_3px_0_#7a4506]">Realms of Nocthera</span>
          )}
        </Link>
        <p className="mt-3 font-[family-name:var(--font-silk)] text-xs text-[#D5C7A4] tracking-[0.25em] uppercase">Portal de Acesso e Consagração</p>
      </header>

      <div className="relative z-10 w-full flex justify-center">
        {!user ? (
          /* Formulário de Login / Cadastro */
          <div className="w-full max-w-md border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C,0_16px_48px_rgba(0,0,0,0.85)] bg-[#1C1B18]/93 p-5 sm:p-7 backdrop-blur-sm">
            {/* Seletor de modo */}
            <div className="flex gap-2 mb-6">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setAuthError(null);
                    if (m === 'signup') {
                      setShowResetForm(false);
                      setResetError(null);
                      setResetSuccess(null);
                    }
                  }}
                  aria-pressed={mode === m}
                  className={`flex-1 py-2.5 font-[family-name:var(--font-pixel)] text-[10px] uppercase tracking-wider border-4 transition-colors ${
                    mode === m
                      ? 'border-[#ED8A0C] bg-[#ED8A0C]/15 text-[#ED8A0C]'
                      : 'border-[#1A120B] bg-[#120F0C] text-[#E2D6B6]/70 hover:text-[#F5F3E0]'
                  }`}
                >
                  {m === 'login' ? 'Entrar' : 'Criar Conta'}
                </button>
              ))}
            </div>

            {authError && <div role="alert" className={AVISO_ERRO}>{authError}</div>}
            {authNotice && <div role="status" className={AVISO_INFO}>{authNotice}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label htmlFor="emailInput" className={ROTULO}>E-mail</label>
                <input id="emailInput" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guerreiro@nocthera.com" className={CAMPO} />
              </div>

              <div>
                <label htmlFor="passwordInput" className={ROTULO}>Senha</label>
                <input
                  id="passwordInput"
                  type="password"
                  required
                  minLength={mode === 'signup' ? SENHA_TAMANHO_MINIMO : undefined}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={CAMPO}
                />
              </div>

              {mode === 'signup' && (
                <CamposDeIdadeETermos idBase="cadastro" dataNascimento={dataNascimento} aceitou={aceitouTermos} onDataNascimento={setDataNascimento} onAceitou={setAceitouTermos} />
              )}

              <div className="pt-1">
                <BotaoDeAcao type="submit" disabled={formLoading}>
                  {formLoading ? 'Processando...' : mode === 'signup' ? 'Criar Conta no Reino' : 'Acessar o Reino'}
                </BotaoDeAcao>
              </div>
            </form>

            {mode === 'login' && (
              <div className="mt-4">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showResetForm;
                      setShowResetForm(nextState);
                      setResetError(null);
                      setResetSuccess(null);
                      if (nextState && !resetEmail && email) {
                        setResetEmail(email);
                      }
                    }}
                    className="font-[family-name:var(--font-silk)] text-xs tracking-wider uppercase text-[#D5C7A4] hover:text-[#ED8A0C] transition-colors cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {showResetForm && (
                  <form onSubmit={handlePasswordReset} className="mt-3 p-3.5 bg-[#120F0C]/90 border-2 border-[#B2A66C]/40 space-y-3">
                    <div>
                      <label htmlFor="resetEmailInput" className={ROTULO}>E-mail para recuperação</label>
                      <input id="resetEmailInput" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="guerreiro@nocthera.com" className={CAMPO} />
                    </div>

                    {resetError && <div role="alert" className="p-2.5 bg-[#6B1212]/55 border-2 border-[#6B1212] text-[#F5F3E0] text-xs leading-relaxed">{resetError}</div>}
                    {resetSuccess && <div role="status" className="p-2.5 bg-[#2B2824]/90 border-2 border-[#ED8A0C]/60 text-[#E2D6B6] text-xs leading-relaxed">{resetSuccess}</div>}

                    <BotaoDeAcao type="submit" disabled={resetLoading}>
                      {resetLoading ? 'Enviando...' : 'Enviar link'}
                    </BotaoDeAcao>
                  </form>
                )}
              </div>
            )}

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-[#B2A66C]/30"></div>
              </div>
              <span className="relative bg-[#1C1B18] px-3 font-[family-name:var(--font-silk)] text-[11px] uppercase tracking-widest text-[#D5C7A4]">Ou continue com</span>
            </div>

            <BotaoDeAcao onClick={handleGoogleLogin} disabled={formLoading}>
              <span className="inline-flex items-center justify-center gap-2.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google
              </span>
            </BotaoDeAcao>
            {mode === 'signup' && <p className="mt-3 text-center text-[11px] text-[#E2D6B6]/70 leading-snug">Quem entra pelo Google confirma a idade e aceita os Termos na próxima tela.</p>}
          </div>
        ) : charLoading || character ? (
          <div className="text-center py-12 text-[#E2D6B6]">
            <div className="w-8 h-8 border-4 border-[#ED8A0C] border-t-transparent animate-spin mx-auto mb-3" />
            <span className="font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#F5F3E0]">{character ? 'Entrando no Hub...' : 'Buscando seu aventureiro...'}</span>
          </div>
        ) : precisaConfirmarAceite ? (
          /* Confirmação de idade e Termos: quem não passou pelo cadastro (Google, ou conta sem personagem) */
          <form onSubmit={confirmarAceite} className="w-full max-w-md border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C,0_16px_48px_rgba(0,0,0,0.85)] bg-[#1C1B18]/93 p-5 sm:p-7 space-y-5">
            <h2 className="font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] text-xs sm:text-sm leading-relaxed text-center [text-shadow:0_2px_0_#7a4506]">Antes de começar</h2>
            <p className="text-xs text-[#E2D6B6] leading-relaxed text-center">Confirme sua idade e aceite os Termos para criar seu personagem.</p>
            {erroAceite && <div role="alert" className={AVISO_ERRO}>{erroAceite}</div>}
            <CamposDeIdadeETermos idBase="confirmacao" dataNascimento={dataNascimento} aceitou={aceitouTermos} onDataNascimento={setDataNascimento} onAceitou={setAceitouTermos} />
            <div className="space-y-3">
              <BotaoDeAcao type="submit">Continuar</BotaoDeAcao>
              <button type="button" onClick={handleLogout} className="block mx-auto font-[family-name:var(--font-silk)] text-xs uppercase tracking-wider text-[#D5C7A4] hover:text-[#ED8A0C]">
                Sair
              </button>
            </div>
          </form>
        ) : (
          /* Formulário de criação de personagem se ainda não tiver */
          <div className="w-full max-w-2xl flex flex-col items-center gap-4">
            {authNotice && (
              <div role="status" className="w-full p-3.5 bg-[#1C1B18]/95 border-2 border-[#ED8A0C]/70 text-[#E2D6B6] text-xs sm:text-sm font-cinzel tracking-wide text-center shadow-lg">
                {authNotice}
              </div>
            )}
            <CharacterCreateForm
              idToken={idToken || ''}
              aceite={aceite ?? undefined}
              onCharacterCreated={() => {
                router.replace('/hub');
              }}
              onLogout={handleLogout}
              userEmail={user.email || ''}
            />
          </div>
        )}
      </div>
    </main>
  );
}
