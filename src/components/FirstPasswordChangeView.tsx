import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import type { User } from '../types/index.ts';
import { api } from '../services/api.ts';
import { MeyerLogo } from './MeyerLogo.tsx';

interface FirstPasswordChangeViewProps {
  user: User;
  onPasswordChanged: (updatedUser: User) => void;
  onLogout: () => void;
}

export const FirstPasswordChangeView: React.FC<FirstPasswordChangeViewProps> = ({
  user,
  onPasswordChanged,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const firstName = user.name ? user.name.trim().split(' ')[0] : 'Produtor';

  // Real-time validations
  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      setErrorMessage('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('As duas senhas digitadas não são iguais.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.changeFirstPassword(newPassword, confirmPassword);
      onPasswordChanged(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar nova senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-[#1e293b] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-[#dee2e6] px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <MeyerLogo variant="header" showSubtitle={true} />
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl border border-[#dee2e6] shadow-xl shadow-[#2E3ED3]/5 p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f4ff] text-[#2E3ED3] flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-[#2E3ED3]" />
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#2E3ED3] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#4F8FF8]" />
              <span>Primeiro Acesso · Olá, {firstName}!</span>
            </div>

            {/* Exactly as required: "Crie sua nova senha" */}
            <h1 className="text-2xl font-extrabold text-[#020417] tracking-tight mb-2">
              Crie sua nova senha
            </h1>

            <p className="text-xs text-[#5c5c5c] mb-6 leading-relaxed">
              Por segurança, substitua a senha temporária por uma senha pessoal definitiva para
              liberar o acesso aos documentos da sua propriedade.
            </p>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-[#343a40] mb-1">
                  Nova senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-11 py-2.5 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl focus:outline-none focus:border-[#2E3ED3] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Campo Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-[#343a40] mb-1">
                  Confirmar nova senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a mesma senha"
                    className="w-full pl-9 pr-11 py-2.5 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl focus:outline-none focus:border-[#2E3ED3] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Orientações claras sobre requisitos mínimos da senha */}
              <div className="p-3 bg-[#f8faff] rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-[#5c5c5c]">
                <span className="font-bold text-[#020417] block mb-1">Requisitos de segurança:</span>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`}
                  />
                  <span className={hasMinLength ? 'text-slate-800 font-semibold' : ''}>
                    Pelo menos 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-slate-300'}`}
                  />
                  <span className={passwordsMatch ? 'text-slate-800 font-semibold' : ''}>
                    As senhas devem ser idênticas
                  </span>
                </div>
              </div>

              {/* Botão destacado "Salvar nova senha" */}
              <button
                type="submit"
                disabled={isLoading || !hasMinLength || !passwordsMatch}
                className="w-full min-h-[48px] mt-2 py-3 px-4 rounded-xl bg-[#2E3ED3] text-white font-bold text-sm hover:bg-[#202ca8] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-[#2E3ED3]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando nova senha...</span>
                  </>
                ) : (
                  <>
                    <span>Salvar nova senha</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center text-xs text-[#5c5c5c] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2E3ED3]" />
            <span>Após salvar, sua senha temporária será imediatamente desativada</span>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} Meyer Engenharia · Segurança da Informação
      </footer>
    </div>
  );
};
