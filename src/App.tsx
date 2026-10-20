import { useState, useEffect } from 'react';
import type { User, RuralProperty } from './types/index.ts';
import { api } from './services/api.ts';
import { AuthView } from './components/AuthView.tsx';
import { ClientPortal } from './components/ClientPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { FirstPasswordChangeView } from './components/FirstPasswordChangeView.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = api.getToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
    } catch {
      api.clearToken();
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLoginSuccess = (user: User, _properties?: RuralProperty[]) => {
    setCurrentUser(user);
  };

  const handlePasswordChanged = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#2E3ED3]/20 border-t-[#2E3ED3] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">
            Carregando portal de documentos...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication View
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  // Admin user -> Dedicated Admin Portal
  if (currentUser.role === 'admin') {
    return <AdminPortal user={currentUser} onLogout={handleLogout} />;
  }

  // Client user with mandatory first password change -> Mandatory "Crie sua nova senha" View
  if (currentUser.mustChangePassword) {
    return (
      <FirstPasswordChangeView
        user={currentUser}
        onPasswordChanged={handlePasswordChanged}
        onLogout={handleLogout}
      />
    );
  }

  // Client user -> Main Client Portal (Focused exclusively on "Meus Documentos")
  return <ClientPortal user={currentUser} onLogout={handleLogout} />;
}
