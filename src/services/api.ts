import type {
  User,
  RuralProperty,
  RuralDocument,
  DownloadLog,
  AuthResponse,
} from '../types/index.ts';

const TOKEN_KEY = 'rural_portal_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async headers(isFormData = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMessage = 'Ocorreu um erro no servidor.';
      try {
        const data = await res.json();
        if (data && data.error) {
          errorMessage = data.error;
        }
      } catch {
        errorMessage = `Erro ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return res.json() as Promise<T>;
  },

  // --- Auth APIs ---
  async login(identifier: string, passwordPlain: string): Promise<AuthResponse & { mustChangePassword?: boolean }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: passwordPlain }),
    });
    const data = await this.handleResponse<AuthResponse & { mustChangePassword?: boolean }>(res);
    this.setToken(data.token);
    return data;
  },

  async changeFirstPassword(
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/change-first-password', {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
    return this.handleResponse(res);
  },

  async getMe(): Promise<{ user: User; properties?: RuralProperty[] }> {
    const token = this.getToken();
    if (!token) throw new Error('Não autenticado');

    const res = await fetch('/api/auth/me', {
      headers: await this.headers(),
    });
    return this.handleResponse<{ user: User; properties?: RuralProperty[] }>(res);
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: await this.headers(),
        });
      } catch (err) {
        console.warn('Erro ao finalizar sessão no servidor', err);
      }
    }
    this.clearToken();
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; debugToken?: string }> {
    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.handleResponse(res);
  },

  async resetPassword(token: string, newPasswordPlain: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: newPasswordPlain }),
    });
    return this.handleResponse(res);
  },

  // --- Client APIs ---
  async getClientDocuments(): Promise<RuralDocument[]> {
    const res = await fetch('/api/client/documents', {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{ documents: RuralDocument[] }>(res);
    return data.documents;
  },

  async getClientProperties(): Promise<RuralProperty[]> {
    const res = await fetch('/api/client/properties', {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{ properties: RuralProperty[] }>(res);
    return data.properties;
  },

  getDownloadUrl(docId: string): string {
    const token = this.getToken() || '';
    return `/api/client/documents/${docId}/download?token=${encodeURIComponent(token)}`;
  },

  getViewUrl(docId: string): string {
    const token = this.getToken() || '';
    return `/api/client/documents/${docId}/view?token=${encodeURIComponent(token)}`;
  },

  async downloadDocument(docId: string, filename: string): Promise<void> {
    const token = this.getToken() || '';
    const url = `/api/client/documents/${docId}/download?token=${encodeURIComponent(token)}`;

    // Trigger authenticated browser download
    const response = await fetch(url, {
      headers: await this.headers(),
    });

    if (!response.ok) {
      let msg = 'Falha ao baixar documento.';
      try {
        const errorJson = await response.json();
        if (errorJson.error) msg = errorJson.error;
      } catch {}
      throw new Error(msg);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // --- Admin APIs ---
  async getAdminClients(
    query?: string
  ): Promise<(User & { documentCount: number; propertyCount: number })[]> {
    const url = query ? `/api/admin/clients?q=${encodeURIComponent(query)}` : '/api/admin/clients';
    const res = await fetch(url, {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{
      clients: (User & { documentCount: number; propertyCount: number })[];
    }>(res);
    return data.clients;
  },

  async createClient(params: {
    name: string;
    cpf: string;
    email?: string;
    phone?: string;
    propertyName?: string;
    municipality?: string;
    state?: string;
    notes?: string;
  }): Promise<{ client: User; tempPasswordUsed: string; propertyCreated?: RuralProperty; message: string }> {
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(params),
    });
    return this.handleResponse(res);
  },

  async updateClient(
    id: string,
    params: {
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      active?: boolean;
      newPassword?: string;
    }
  ): Promise<{ client: User; message: string }> {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PUT',
      headers: await this.headers(),
      body: JSON.stringify(params),
    });
    return this.handleResponse(res);
  },

  async getAdminProperties(clientId?: string): Promise<RuralProperty[]> {
    const url = clientId
      ? `/api/admin/properties?clientId=${encodeURIComponent(clientId)}`
      : '/api/admin/properties';
    const res = await fetch(url, {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{ properties: RuralProperty[] }>(res);
    return data.properties;
  },

  async createProperty(params: {
    name: string;
    clientId: string;
    municipality: string;
    state: string;
    carNumber?: string;
    areaHa?: number;
    nirf?: string;
    incraCode?: string;
    notes?: string;
  }): Promise<{ property: RuralProperty; message: string }> {
    const res = await fetch('/api/admin/properties', {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(params),
    });
    return this.handleResponse(res);
  },

  async getAdminDocuments(): Promise<RuralDocument[]> {
    const res = await fetch('/api/admin/documents', {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{ documents: RuralDocument[] }>(res);
    return data.documents;
  },

  async uploadDocument(formData: FormData): Promise<{ document: RuralDocument; message: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/documents', {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse(res);
  },

  async updateDocument(
    id: string,
    data: { title?: string; propertyId?: string; description?: string }
  ): Promise<{ document: RuralDocument; message: string }> {
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: 'PUT',
      headers: await this.headers(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(res);
  },

  async replaceDocumentFile(
    id: string,
    formData: FormData
  ): Promise<{ document: RuralDocument; message: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/admin/documents/${id}/replace`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse(res);
  },

  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    return this.handleResponse(res);
  },

  async getAdminLogs(): Promise<DownloadLog[]> {
    const res = await fetch('/api/admin/logs', {
      headers: await this.headers(),
    });
    const data = await this.handleResponse<{ logs: DownloadLog[] }>(res);
    return data.logs;
  },
};
