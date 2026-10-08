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
import { CharacterDocument } from '@/server/characterService';
import Link from 'next/link';

interface SessionUser {
  uid: string;
  email: string | null;
}

const LOCAL_SESSION_KEY = 'nocthera_auth_session';

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

  // Recuperação de senha (apenas modo login)
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Estado do personagem
  const [character, setCharacter] = useState<CharacterDocument | null>(null);
  const [charLoading, setCharLoading] = useState(false);

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
      } else {
        setCharacter(null);
      }
    } catch {
      setCharacter(null);
    } finally {
      setCharLoading(false);
    }
  };

  // Monitora estado da autenticação oficial do Firebase ou sessão persistida do servidor
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
          } else {
            setCharacter(null);
          }
        } catch {
          setIdToken(null);
          setCharacter(null);
        }
        setAuthLoading(false);
        return;
      }

      // Verifica se há sessão de fallback salva localmente
      try {
        const rawSession = window.localStorage.getItem(LOCAL_SESSION_KEY);
        if (rawSession) {
          const parsed = JSON.parse(rawSession) as {
            user?: SessionUser;
            idToken?: string;
          };
          if (parsed.user?.uid && parsed.idToken) {
            setUser(parsed.user);
            setIdToken(parsed.idToken);
            await loadCharacterData(parsed.idToken);
            setAuthLoading(false);
            return;
          }
        }
      } catch {
        // Ignora falhas de leitura do localStorage
      }

      setUser(null);
      setIdToken(null);
      setCharacter(null);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const authenticateViaServerFallback = async (
    authMode: 'login' | 'signup',
    userEmail: string,
    userPassword: string
  ) => {
    const res = await fetch('/api/auth/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: authMode,
        email: userEmail,
        password: userPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorObj = new Error(data.error || 'Falha na autenticação.') as Error & {
        code?: string;
      };
      errorObj.code = data.code;
      throw errorObj;
    }

    const sessionUser: SessionUser = {
      uid: data.user.uid,
      email: data.user.email,
    };

    try {
      window.localStorage.setItem(
        LOCAL_SESSION_KEY,
        JSON.stringify({ user: sessionUser, idToken: data.idToken })
      );
    } catch {
      // Continua mesmo sem localStorage
    }

    setUser(sessionUser);
    setIdToken(data.idToken);
    await loadCharacterData(data.idToken);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setFormLoading(true);

    try {
      if (mode === 'signup') {
        const cred = await signUpWithEmail(email, password);
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
      const firebaseError = err as { code?: string; message?: string };

      // Quando o provedor Email/Password não está habilitado no console Firebase,
      // autentica de forma transparente pelo endpoint do servidor integrado ao Firestore (users/{uid})
      if (
        firebaseError.code === 'auth/operation-not-allowed' ||
        firebaseError.code === 'auth/configuration-not-found'
      ) {
        try {
          await authenticateViaServerFallback(mode, email, password);
          return;
        } catch (fallbackErr: unknown) {
          const fbErr = fallbackErr as { code?: string; message?: string };
          setAuthError(fbErr.message || 'Ocorreu um erro durante a autenticação.');
          return;
        }
      }

      if (firebaseError.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso. Tente fazer login.');
      } else if (
        firebaseError.code === 'auth/invalid-credential' ||
        firebaseError.code === 'auth/user-not-found' ||
        firebaseError.code === 'auth/wrong-password'
      ) {
        setAuthError('E-mail ou senha incorretos.');
      } else if (firebaseError.code === 'auth/weak-password') {
        setAuthError('A senha deve conter no mínimo 6 caracteres.');
      } else {
        setAuthError(firebaseError.message || 'Ocorreu um erro durante a autenticação.');
      }
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
      const firebaseError = err as { message?: string };
      setAuthError(firebaseError.message || 'Erro ao autenticar com Google.');
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
    try {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
    } catch {
      // Ignora
    }
    await logoutUser();
    setUser(null);
    setIdToken(null);
    setCharacter(null);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#120F0C_0%,_#0D0D0D_75%)] text-[#E2D6B6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ED8A0C] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-cinzel tracking-wider text-[#F5F3E0]">
            Consultando os Reinos...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_#120F0C_0%,_#0D0D0D_75%)] px-3 sm:px-6 py-8 sm:py-12 relative overflow-x-hidden">
      {/* Brilho ambiente sutil em dourado/âmbar */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(237,138,12,0.08)_0%,_transparent_60%)] pointer-events-none"
      />

      <header className="relative z-10 mb-6 sm:mb-8 text-center px-2">
        <Link href="/" className="group inline-block">
          <h1 className="text-2xl sm:text-5xl font-cinzel font-bold tracking-widest text-[#ED8A0C] uppercase drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] group-hover:text-[#F58C0C] transition-colors">
            Realms of Nocthera
          </h1>
        </Link>
        <div className="h-px w-32 sm:w-48 mx-auto my-2.5 bg-gradient-to-r from-transparent via-[#B2A66C]/60 to-transparent" />
        <p className="text-xs text-[#D5C7A4] tracking-[0.2em] uppercase font-cinzel">
          Portal de Acesso e Consagração
        </p>
      </header>

      <div className="relative z-10 w-full flex justify-center">
        {!user ? (
          /* Formulário de Login / Cadastro — Painel central com borda dourada fina */
          <div className="w-full max-w-md bg-[#1C1B18]/95 border border-[#B2A66C]/50 rounded-xl p-5 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-sm">
            {/* Seletor de Modo */}
            <div className="flex border-b border-[#B2A66C]/30 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError(null);
                }}
                className={`flex-1 pb-3 text-xs sm:text-sm font-cinzel tracking-widest uppercase font-semibold transition-colors border-b-2 ${
                  mode === 'login'
                    ? 'border-[#ED8A0C] text-[#ED8A0C]'
                    : 'border-transparent text-[#E2D6B6]/70 hover:text-[#F5F3E0]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setAuthError(null);
                  setShowResetForm(false);
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className={`flex-1 pb-3 text-xs sm:text-sm font-cinzel tracking-widest uppercase font-semibold transition-colors border-b-2 ${
                  mode === 'signup'
                    ? 'border-[#ED8A0C] text-[#ED8A0C]'
                    : 'border-transparent text-[#E2D6B6]/70 hover:text-[#F5F3E0]'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-[#6B1212]/40 border border-[#6B1212] rounded-lg text-[#F5F3E0] text-xs leading-relaxed">
                {authError}
              </div>
            )}

            {authNotice && (
              <div className="mb-4 p-3 bg-[#2B2824] border border-[#ED8A0C]/60 rounded-lg text-[#E2D6B6] text-xs leading-relaxed">
                {authNotice}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="emailInput"
                  className="block text-xs uppercase font-cinzel tracking-wider text-[#D5C7A4] mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="emailInput"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guerreiro@nocthera.com"
                  className="w-full bg-[#120F0C] border border-[#B2A66C]/50 rounded-lg px-3.5 py-2.5 text-[#F5F3E0] placeholder-[#E2D6B6]/35 focus:outline-none focus:border-[#ED8A0C] hover:border-[#D5C7A4]/80 transition-colors text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="passwordInput"
                  className="block text-xs uppercase font-cinzel tracking-wider text-[#D5C7A4] mb-1.5"
                >
                  Senha
                </label>
                <input
                  id="passwordInput"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#120F0C] border border-[#B2A66C]/50 rounded-lg px-3.5 py-2.5 text-[#F5F3E0] placeholder-[#E2D6B6]/35 focus:outline-none focus:border-[#ED8A0C] hover:border-[#D5C7A4]/80 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-[#ED8A0C] hover:bg-[#F58C0C] disabled:bg-[#2B2824] disabled:text-[#E2D6B6]/40 text-[#0D0D0D] font-cinzel tracking-widest uppercase font-bold py-2.5 px-4 rounded-lg border border-[#D5C7A4]/50 shadow-[0_4px_20px_rgba(237,138,12,0.25)] hover:shadow-[0_4px_24px_rgba(245,140,12,0.4)] transition-all duration-150 text-xs sm:text-sm mt-2"
              >
                {formLoading
                  ? 'Processando...'
                  : mode === 'signup'
                  ? 'Criar Conta no Reino'
                  : 'Acessar o Reino'}
              </button>
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
                    className="text-xs font-cinzel tracking-wider uppercase text-[#D5C7A4] hover:text-[#ED8A0C] transition-colors cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {showResetForm && (
                  <form
                    onSubmit={handlePasswordReset}
                    className="mt-3 p-3.5 bg-[#120F0C] border border-[#B2A66C]/40 rounded-lg space-y-3"
                  >
                    <div>
                      <label
                        htmlFor="resetEmailInput"
                        className="block text-xs uppercase font-cinzel tracking-wider text-[#D5C7A4] mb-1.5"
                      >
                        E-mail para recuperação
                      </label>
                      <input
                        id="resetEmailInput"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="guerreiro@nocthera.com"
                        className="w-full bg-[#1C1B18] border border-[#B2A66C]/50 rounded-lg px-3 py-2 text-[#F5F3E0] placeholder-[#E2D6B6]/35 focus:outline-none focus:border-[#ED8A0C] hover:border-[#D5C7A4]/80 transition-colors text-xs sm:text-sm"
                      />
                    </div>

                    {resetError && (
                      <div className="p-2.5 bg-[#6B1212]/40 border border-[#6B1212] rounded-lg text-[#F5F3E0] text-xs leading-relaxed">
                        {resetError}
                      </div>
                    )}

                    {resetSuccess && (
                      <div className="p-2.5 bg-[#2B2824] border border-[#ED8A0C]/60 rounded-lg text-[#E2D6B6] text-xs leading-relaxed">
                        {resetSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full bg-[#2B2824] hover:bg-[#ED8A0C] text-[#F5F3E0] hover:text-[#0D0D0D] disabled:opacity-50 font-cinzel tracking-widest uppercase font-bold py-2 px-3 rounded-lg border border-[#B2A66C]/50 hover:border-[#D5C7A4] transition-colors text-xs cursor-pointer"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#B2A66C]/30"></div>
              </div>
              <span className="relative bg-[#1C1B18] px-3 text-[11px] uppercase font-cinzel tracking-widest text-[#D5C7A4]">
                Ou continue com
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={formLoading}
              className="w-full bg-[#2B2824] hover:bg-[#120F0C] border border-[#B2A66C]/50 hover:border-[#ED8A0C] text-[#F5F3E0] hover:text-[#ED8A0C] font-cinzel tracking-wider uppercase font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2.5 text-xs sm:text-sm transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>
          </div>
        ) : charLoading || character ? (
          <div className="text-center py-12 text-[#E2D6B6]">
            <div className="w-8 h-8 border-2 border-[#ED8A0C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm font-cinzel tracking-wider text-[#F5F3E0]">
              {character ? 'Entrando no Hub...' : 'Buscando seu aventureiro...'}
            </span>
          </div>
        ) : (
          /* Formulário de criação de personagem se ainda não tiver */
          <div className="w-full max-w-2xl flex flex-col items-center gap-4">
            {authNotice && (
              <div
                role="status"
                className="w-full p-3.5 bg-[#1C1B18]/95 border border-[#ED8A0C]/70 rounded-lg text-[#E2D6B6] text-xs sm:text-sm font-cinzel tracking-wide text-center shadow-lg"
              >
                {authNotice}
              </div>
            )}
            <CharacterCreateForm
              idToken={idToken || ''}
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
