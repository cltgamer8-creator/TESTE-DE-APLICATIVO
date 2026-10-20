import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  UserCheck,
  X,
  ShieldAlert,
  CreditCard,
  Building,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { User, RuralProperty } from '../types/index.ts';
import { MeyerLogo } from './MeyerLogo.tsx';

interface AuthViewProps {
  onLoginSuccess: (user: User, properties?: RuralProperty[]) => void;
}

// CPF input formatting helper
function formatCpfOrText(val: string): string {
  const digits = val.replace(/\D/g, '');
  // If the user is typing letters (e.g. email or admin username), keep original
  if (/[a-zA-Z@]/.test(val) || digits.length === 0) {
    return val;
  }
  // Format up to 11 digits
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  // Client login state (CPF or email)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden admin login modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Password reset flow
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Client login submit
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Por favor, informe seu CPF e sua senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.login(identifier.trim(), password);
      onLoginSuccess(res.user, res.properties);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Falha ao autenticar. Verifique o CPF e a senha informados.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Hidden admin login submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminIdentifier.trim() || !adminPassword) {
      setAdminError('Informe o e-mail corporativo e a senha.');
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await api.login(adminIdentifier.trim(), adminPassword);
      if (res.user.role !== 'admin') {
        throw new Error('Esta conta não possui permissão de funcionário.');
      }
      setShowAdminModal(false);
      onLoginSuccess(res.user, res.properties);
    } catch (err: any) {
      setAdminError(err.message || 'Falha no login administrativo.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Client quick login helper for testing scenarios
  const handleQuickClientLogin = (userCpf: string, pass: string) => {
    setIdentifier(userCpf);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;

    setResetLoading(true);
    setResetFeedback(null);
    try {
      const res = await api.requestPasswordReset(resetIdentifier.trim());
      if (res.debugToken) {
        setResetToken(res.debugToken);
        setResetStep('reset');
        setResetFeedback('Código de redefinição localizado. Digite sua nova senha abaixo:');
      } else {
        setResetFeedback('Se a conta estiver cadastrada, as instruções foram geradas.');
      }
    } catch (err: any) {
      setResetFeedback(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleFinalizeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword || newPassword.length < 6) {
      setResetFeedback('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setResetFeedback(res.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetStep('request');
        setPassword(newPassword);
        setIdentifier(resetIdentifier);
      }, 2000);
    } catch (err: any) {
      setResetFeedback(err.message || 'Código inválido ou expirado.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col justify-between">
      {/* Top brand accent stripe in Meyer's signature royal blue */}
      <div className="h-1.5 w-full bg-[#2E3ED3]" />

      {/* Main Container - 100% Focused on the Client */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logo & Headline */}
          <div className="text-center mb-7 flex flex-col items-center">
            <div className="mb-3">
              <MeyerLogo variant="hero" showSubtitle={false} />
            </div>
            <h1 className="text-2xl font-extrabold text-[#020417] tracking-tight">
              Portal do Produtor Rural
            </h1>
            <p className="text-xs sm:text-sm text-[#5c5c5c] mt-1 font-medium">
              Acesse e baixe os documentos da sua propriedade com total segurança
            </p>
          </div>

          {/* Client Login Card */}
          <div className="bg-white rounded-3xl border border-[#dee2e6] shadow-xl shadow-[#2E3ED3]/5 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-[#020417]">Área do Cliente</h2>
              <span className="text-[11px] font-bold text-[#2E3ED3] bg-[#f0f4ff] px-2.5 py-1 rounded-full border border-[#2E3ED3]/15">
                Login por CPF
              </span>
            </div>

            <p className="text-xs text-[#5c5c5c] mb-6">
              Digite seu CPF (com ou sem pontuação) e sua senha para acessar sua conta.
            </p>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#343a40] mb-1">
                  CPF do Cliente *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(formatCpfOrText(e.target.value))}
                    placeholder="000.000.000-00 (ou e-mail)"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl focus:outline-none focus:border-[#2E3ED3] focus:bg-white transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#343a40]">Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(identifier);
                      setShowForgotModal(true);
                      setResetStep('request');
                      setResetFeedback(null);
                    }}
                    className="text-xs text-[#2E3ED3] hover:underline font-bold cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl focus:outline-none focus:border-[#2E3ED3] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Main Client Button in Meyer's Official Royal Blue */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] mt-2 py-3 px-4 rounded-xl bg-[#2E3ED3] text-white font-bold text-sm hover:bg-[#202ca8] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-[#2E3ED3]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Portal</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access helper exclusively for clients & test scenarios */}
            <div className="mt-7 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Cenários de Teste Rápidos (Clique para Preencher)
              </span>

              <div className="space-y-2 text-xs">
                {/* Scenario 1: Returning Client with Documents */}
                <button
                  type="button"
                  onClick={() => handleQuickClientLogin('716.027.331-12', 'cliente123')}
                  className="w-full text-left p-3 rounded-xl bg-[#f0f4ff] hover:bg-[#e4ebff] border border-[#2E3ED3]/20 text-[#020417] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-bold block text-[#2E3ED3]">
                      José Eduardo Silveira · CPF 716.027.331-12
                    </span>
                    <span className="text-[11px] text-[#5c5c5c]">
                      Cliente ativo · Acesso direto a 6 documentos
                    </span>
                  </div>
                  <UserCheck className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                </button>

                {/* Scenario 2: First Access with MEYER temporary password (mandatory password change test) */}
                <button
                  type="button"
                  onClick={() => handleQuickClientLogin('017.462.110-83', 'MEYER@4821')}
                  className="w-full text-left p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-300 text-[#020417] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-900">
                        Carlos Henrique Prado · CPF 017.462.110-83
                      </span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                        1º Acesso
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-800">
                      Senha temporária MEYER@4821 · Exige troca de senha obrigatória
                    </span>
                  </div>
                  <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Footnote */}
          <div className="mt-6 text-center text-xs text-[#5c5c5c] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2E3ED3]" />
            <span>Ambiente seguro com validação de CPF e proteção contra força bruta</span>
          </div>
        </div>
      </div>

      {/* FOOTER: At the very bottom, hidden and discreet admin access */}
      <footer className="py-4 px-6 border-t border-[#dee2e6] bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#5c5c5c]">
        <div>
          © {new Date().getFullYear()} Meyer Engenharia e Consultoria · www.meyerengenharia.com.br
        </div>

        {/* Discreet employee login link way down at the bottom */}
        <button
          type="button"
          onClick={() => {
            setAdminError(null);
            setShowAdminModal(true);
          }}
          className="text-[11px] text-slate-400 hover:text-[#2E3ED3] transition-colors inline-flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-50 cursor-pointer"
          title="Acesso exclusivo para colaboradores da Meyer Engenharia"
        >
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Acesso Interno (Colaboradores)</span>
        </button>
      </footer>

      {/* DEDICATED ADMIN MODAL (Isolated from Client Login) */}
      {showAdminModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#020417] text-[#4F8FF8] flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5 text-[#4F8FF8]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#020417]">
                    Acesso da Equipe Meyer
                  </h3>
                  <span className="text-[11px] text-[#5c5c5c] block">
                    Gestão interna de clientes e arquivos
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5c5c5c] mb-4 leading-relaxed">
              Área reservada aos colaboradores autorizados para cadastrar clientes por CPF,
              vincular propriedades e enviar documentos técnicos.
            </p>

            {adminError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#343a40] mb-1">
                  E-mail corporativo ou CPF de funcionário
                </label>
                <input
                  type="text"
                  required
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="admin@meyerengenharia.com.br"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2E3ED3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#343a40] mb-1">
                  Senha administrativa
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#2E3ED3]"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-2.5 rounded-xl bg-[#020417] text-white font-bold text-xs hover:bg-[#1a233a] transition-colors cursor-pointer shadow-xs mt-2"
              >
                {adminLoading ? 'Autenticando equipe...' : 'Entrar no Painel Administrativo'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAdminIdentifier('admin@meyerengenharia.com.br');
                  setAdminPassword('admin123');
                  setAdminError(null);
                }}
                className="w-full py-2 text-xs font-semibold text-[#2E3ED3] bg-[#f0f4ff] hover:bg-[#e4ebff] rounded-xl transition-colors cursor-pointer"
              >
                Preencher Acesso do Administrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Recovery Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#2E3ED3]">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Recuperação de Senha</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetFeedback && (
              <div className="mb-4 p-3 rounded-xl bg-[#f0f4ff] border border-[#2E3ED3]/20 text-xs text-[#2E3ED3] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E3ED3] shrink-0 mt-0.5" />
                <span>{resetFeedback}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Informe o seu CPF ou e-mail cadastrado na Meyer Engenharia para recuperar o acesso à sua conta.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF ou E-mail cadastrado
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="000.000.000-00 ou seu e-mail"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-semibold hover:bg-[#202ca8] disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? 'Verificando...' : 'Avançar'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFinalizeReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de Segurança
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nova Senha (Mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-semibold hover:bg-[#202ca8] disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? 'Salvando...' : 'Definir Nova Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
