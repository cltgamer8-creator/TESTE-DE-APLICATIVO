import React, { useState, useEffect } from 'react';
import {
  Users,
  FileUp,
  Landmark,
  History,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Download,
  KeyRound,
  Shield,
  Eye,
  X,
  FileEdit,
  FileSpreadsheet,
} from 'lucide-react';
import type { User, RuralProperty, RuralDocument, DownloadLog } from '../types/index.ts';
import { api } from '../services/api.ts';
import { MeyerLogo } from './MeyerLogo.tsx';

interface AdminPortalProps {
  user: User;
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'documents' | 'properties' | 'logs'>('clients');

  // Data states
  const [clients, setClients] = useState<(User & { documentCount: number; propertyCount: number })[]>([]);
  const [documents, setDocuments] = useState<RuralDocument[]>([]);
  const [properties, setProperties] = useState<RuralProperty[]>([]);
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<User | null>(null);
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    temporaryPassword: '',
    active: true,
  });

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState({
    name: '',
    clientId: '',
    municipality: '',
    state: 'SP',
    carNumber: '',
    areaHa: '',
    nirf: '',
    incraCode: '',
    notes: '',
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    clientId: '',
    propertyId: '',
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit / Replace doc modals
  const [editingDoc, setEditingDoc] = useState<RuralDocument | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocPropertyId, setEditDocPropertyId] = useState('');

  const [replacingDoc, setReplacingDoc] = useState<RuralDocument | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  // Invitation info modal
  const [inviteModalData, setInviteModalData] = useState<{ client: User; tempPass: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [cls, docs, props, lgs] = await Promise.all([
        api.getAdminClients(),
        api.getAdminDocuments(),
        api.getAdminProperties(),
        api.getAdminLogs(),
      ]);
      setClients(cls);
      setDocuments(docs);
      setProperties(props);
      setLogs(lgs);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados do painel.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Client Actions ---
  const handleOpenNewClient = () => {
    setEditingClient(null);
    setClientFormData({
      name: '',
      email: '',
      phone: '',
      notes: '',
      temporaryPassword: '',
      active: true,
    });
    setShowClientModal(true);
  };

  const handleOpenEditClient = (client: User) => {
    setEditingClient(client);
    setClientFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      notes: client.notes || '',
      temporaryPassword: '',
      active: client.active,
    });
    setShowClientModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name.trim() || !clientFormData.email.trim()) {
      showToast('error', 'Nome completo e e-mail são obrigatórios.');
      return;
    }

    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, {
          name: clientFormData.name,
          email: clientFormData.email,
          phone: clientFormData.phone,
          notes: clientFormData.notes,
          active: clientFormData.active,
          newPassword: clientFormData.temporaryPassword || undefined,
        });
        showToast('success', 'Cadastro do cliente atualizado com sucesso.');
      } else {
        const res = await api.createClient(clientFormData);
        showToast('success', 'Cliente cadastrado com sucesso!');
        setInviteModalData({ client: res.client, tempPass: res.tempPasswordUsed });
      }

      setShowClientModal(false);
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao salvar cliente.');
    }
  };

  const handleToggleClientStatus = async (client: User) => {
    try {
      await api.updateClient(client.id, { active: !client.active });
      showToast(
        'success',
        client.active ? `Acesso de ${client.name} bloqueado.` : `Acesso de ${client.name} ativado.`
      );
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar status.');
    }
  };

  // --- Property Actions ---
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !propertyFormData.name.trim() ||
      !propertyFormData.clientId ||
      !propertyFormData.municipality.trim() ||
      !propertyFormData.state.trim()
    ) {
      showToast('error', 'Preencha o nome da fazenda, cliente, município e UF.');
      return;
    }

    try {
      await api.createProperty({
        name: propertyFormData.name,
        clientId: propertyFormData.clientId,
        municipality: propertyFormData.municipality,
        state: propertyFormData.state,
        carNumber: propertyFormData.carNumber || undefined,
        areaHa: propertyFormData.areaHa ? parseFloat(propertyFormData.areaHa) : undefined,
        nirf: propertyFormData.nirf || undefined,
        incraCode: propertyFormData.incraCode || undefined,
        notes: propertyFormData.notes || undefined,
      });

      showToast('success', 'Propriedade rural cadastrada com sucesso!');
      setShowPropertyModal(false);
      setPropertyFormData({
        name: '',
        clientId: '',
        municipality: '',
        state: 'SP',
        carNumber: '',
        areaHa: '',
        nirf: '',
        incraCode: '',
        notes: '',
      });
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao vincular propriedade.');
    }
  };

  // --- Document Upload & Management ---
  const handleOpenUploadForClient = (clientId?: string) => {
    setUploadFormData({
      clientId: clientId || (clients[0]?.id || ''),
      propertyId: '',
      title: '',
      description: '',
    });
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFormData.clientId) {
      showToast('error', 'Selecione o cliente destinatário.');
      return;
    }
    if (!uploadFormData.title.trim()) {
      showToast('error', 'Informe o nome de exibição do documento.');
      return;
    }
    if (!selectedFile) {
      showToast('error', 'Selecione o arquivo no computador ou celular.');
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('clientId', uploadFormData.clientId);
      if (uploadFormData.propertyId) {
        fd.append('propertyId', uploadFormData.propertyId);
      }
      fd.append('title', uploadFormData.title.trim());
      if (uploadFormData.description.trim()) {
        fd.append('description', uploadFormData.description.trim());
      }

      const res = await api.uploadDocument(fd);
      showToast('success', res.message || 'Documento enviado com sucesso!');
      setShowUploadModal(false);
      setSelectedFile(null);
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao enviar documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDocEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !editDocTitle.trim()) return;

    try {
      await api.updateDocument(editingDoc.id, {
        title: editDocTitle.trim(),
        propertyId: editDocPropertyId || undefined,
      });
      showToast('success', 'Título do documento atualizado.');
      setEditingDoc(null);
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao atualizar documento.');
    }
  };

  const handleReplaceFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingDoc || !replacementFile) return;

    try {
      const fd = new FormData();
      fd.append('file', replacementFile);
      await api.replaceDocumentFile(replacingDoc.id, fd);
      showToast('success', 'Arquivo físico do documento substituído com sucesso.');
      setReplacingDoc(null);
      setReplacementFile(null);
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao substituir arquivo.');
    }
  };

  const handleDeleteDoc = async (doc: RuralDocument) => {
    const confirm = window.confirm(
      `Confirma a exclusão definitiva do documento "${doc.title}"? Esta ação removerá o arquivo da conta do cliente.`
    );
    if (!confirm) return;

    try {
      await api.deleteDocument(doc.id);
      showToast('success', 'Documento removido.');
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao remover documento.');
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  // Filter documents
  const filteredDocuments = documents.filter((d) => {
    if (selectedClientFilter === 'all') return true;
    return d.clientId === selectedClientFilter;
  });

  // Properties for the currently selected client in the upload modal
  const uploadClientProperties = properties.filter((p) => p.clientId === uploadFormData.clientId);

  const [logSearch, setLogSearch] = useState('');

  // Filter logs
  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      l.clientName.toLowerCase().includes(q) ||
      l.documentTitle.toLowerCase().includes(q) ||
      (l.ipAddress && l.ipAddress.includes(q))
    );
  });

  const handleExportLogsCsv = () => {
    if (logs.length === 0) {
      showToast('error', 'Nenhum registro para exportar.');
      return;
    }
    const headers = ['Data e Hora', 'Cliente / Usuario', 'Perfil', 'Documento Baixado', 'IP', 'Dispositivo'];
    const rows = logs.map((l) => [
      `"${new Date(l.downloadedAt).toLocaleString('pt-BR')}"`,
      `"${l.clientName.replace(/"/g, '""')}"`,
      `"${l.userRole === 'admin' ? 'Funcionario' : 'Cliente'}"`,
      `"${l.documentTitle.replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${(l.device || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_downloads_meyer_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Relatório CSV de downloads exportado!');
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-[#1e293b] flex flex-col">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 bg-[#020417] text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MeyerLogo variant="dark" showSubtitle={true} />
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-xs text-[#8eb7d8]">
              {user.name}
            </span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-red-800 text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do Painel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-white border-b border-[#dee2e6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('clients')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-[#2E3ED3] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes Cadastrados ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-[#2E3ED3] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Documentos Arquivados ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('properties')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-[#2E3ED3] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Propriedades Rurais ({properties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#2E3ED3] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Downloads ({logs.length})</span>
          </button>

          <button
            onClick={loadAllData}
            title="Atualizar dados"
            className="ml-auto p-2 text-slate-500 hover:text-[#2E3ED3] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-4">
          <div
            className={`p-3.5 rounded-xl text-sm font-medium flex items-center justify-between gap-3 shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-blue-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: CLIENTES */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Pesquisar cliente por nome, e-mail ou telefone..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[#f8faf8] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2E3ED3]"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenNewClient}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </button>
            </div>

            {/* Clients Table / Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f0f4ff] text-[#020417] font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-4 py-3.5">Contato</th>
                      <th className="px-4 py-3.5">Documentos</th>
                      <th className="px-4 py-3.5">Propriedades</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                          {c.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {c.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600 space-y-0.5">
                          <div className="font-medium text-slate-800">{c.email}</div>
                          <div className="text-slate-500">{c.phone || 'Sem telefone'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-800">{c.documentCount}</span>{' '}
                          <span className="text-slate-500">arquivos</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-800">{c.propertyCount}</span>{' '}
                          <span className="text-slate-500">imóveis</span>
                        </td>
                        <td className="px-4 py-4">
                          {c.active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              Desativado
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenUploadForClient(c.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-[#2E3ED3] bg-[#f0f4ff] hover:bg-[#e4ebff] rounded-lg transition-colors cursor-pointer"
                              title="Enviar documento para este cliente"
                            >
                              <FileUp className="w-3.5 h-3.5 inline mr-1" />
                              Enviar Doc
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditClient(c)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar cliente"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleClientStatus(c)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                c.active
                                  ? 'text-slate-400 hover:text-red-700 hover:bg-red-50'
                                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={c.active ? 'Bloquear/Desativar cliente' : 'Ativar cliente'}
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredClients.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhum cliente localizado com os termos informados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTOS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">Filtrar por Cliente:</span>
                <select
                  value={selectedClientFilter}
                  onChange={(e) => setSelectedClientFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-[#f8faf8] border border-slate-200 rounded-xl"
                >
                  <option value="all">Todos os clientes ({documents.length} documentos)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleOpenUploadForClient()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] transition-colors cursor-pointer shadow-xs"
              >
                <FileUp className="w-4 h-4" />
                <span>Enviar Novo Documento</span>
              </button>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f0f4ff] text-[#020417] font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Documento</th>
                      <th className="px-4 py-3.5">Cliente Destinatário</th>
                      <th className="px-4 py-3.5">Propriedade</th>
                      <th className="px-4 py-3.5">Tamanho / Tipo</th>
                      <th className="px-4 py-3.5">Data Disp.</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((doc) => {
                      const client = clients.find((c) => c.id === doc.clientId);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                              <span>{doc.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {doc.filename}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-800 font-medium">
                            {client ? client.name : 'Cliente ID ' + doc.clientId}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {doc.propertyName || 'Geral da conta'}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            <span className="font-semibold text-slate-700">{doc.fileType}</span> ·{' '}
                            {doc.fileSizeFormatted}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{doc.availableDate}</td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => api.downloadDocument(doc.id, doc.filename)}
                                className="p-1.5 text-slate-500 hover:text-[#2E3ED3] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Baixar arquivo"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setEditDocTitle(doc.title);
                                  setEditDocPropertyId(doc.propertyId || '');
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar nome de exibição"
                              >
                                <FileEdit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReplacingDoc(doc);
                                  setReplacementFile(null);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Substituir arquivo por nova versão"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc)}
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir documento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhum documento arquivado para os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROPRIEDADES RURAIS */}
        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Propriedades Rurais e Imóveis Vinculados
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastre fazendas, sítios e glebas para associar os documentos correspondentes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPropertyModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Propriedade</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((prop) => {
                const client = clients.find((c) => c.id === prop.clientId);
                return (
                  <div
                    key={prop.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-[#2E3ED3] bg-[#f0f4ff] px-2 py-0.5 rounded-md">
                          {prop.municipality} - {prop.state}
                        </span>
                        {prop.areaHa && (
                          <span className="text-xs font-mono text-slate-500 font-medium">
                            {prop.areaHa} ha
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mb-1">{prop.name}</h4>

                      <p className="text-xs text-slate-600 mb-3">
                        <span className="text-slate-400">Titular:</span>{' '}
                        <span className="font-semibold">{client ? client.name : 'Cliente ' + prop.clientId}</span>
                      </p>

                      {prop.carNumber && (
                        <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2 truncate">
                          CAR: {prop.carNumber}
                        </div>
                      )}

                      {prop.notes && (
                        <p className="text-xs text-slate-500 line-clamp-2">{prop.notes}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {documents.filter((d) => d.propertyId === prop.id).length} documentos vinculados
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFormData({
                            clientId: prop.clientId,
                            propertyId: prop.id,
                            title: '',
                            description: '',
                          });
                          setShowUploadModal(true);
                        }}
                        className="text-[#2E3ED3] font-semibold hover:underline"
                      >
                        + Documento
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Registro de Atividades & Downloads Realizados
                </h3>
                <p className="text-xs text-slate-500">
                  Histórico com registro exato de quando cada proprietário realizou o download de seus documentos rurais.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportLogsCsv}
                  disabled={logs.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#2E3ED3] bg-[#f0f4ff] hover:bg-[#e4ebff] border border-[#2E3ED3]/20 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  title="Exportar registros de download em formato CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#2E3ED3]" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Search filter for logs */}
            {logs.length > 0 && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Filtrar registros por cliente, documento ou IP..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-[#f8faff] border border-slate-200 rounded-xl focus:outline-none focus:border-[#2E3ED3]"
                  />
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f0f4ff] text-[#020417] font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Data e Hora</th>
                      <th className="px-4 py-3.5">Cliente / Usuário</th>
                      <th className="px-4 py-3.5">Documento Baixado</th>
                      <th className="px-4 py-3.5">Dispositivo / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => {
                      const dateFormatted = new Date(log.downloadedAt).toLocaleString('pt-BR');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {log.clientName}
                            <span className="block text-[11px] font-normal text-slate-500">
                              Perfil: {log.userRole === 'admin' ? 'Funcionário' : 'Cliente'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-800 font-medium">
                            {log.documentTitle}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            <span>{log.device || 'Navegador Web'}</span>
                            {log.ipAddress && (
                              <span className="block font-mono text-slate-400">
                                IP: {log.ipAddress}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  {logs.length === 0
                    ? 'Nenhum registro de download registrado até o momento.'
                    : 'Nenhum registro encontrado para o termo de busca informado.'}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CADASTRO / EDIÇÃO DE CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingClient ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Proprietário / Produtor *
                </label>
                <input
                  type="text"
                  required
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  placeholder="Ex: Roberto Silveira Antunes"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail (Login de Acesso) *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientFormData.email}
                    onChange={(e) =>
                      setClientFormData({ ...clientFormData, email: e.target.value })
                    }
                    placeholder="cliente@fazenda.com.br"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={clientFormData.phone}
                    onChange={(e) =>
                      setClientFormData({ ...clientFormData, phone: e.target.value })
                    }
                    placeholder="(00) 90000-0000"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingClient
                    ? 'Redefinir Senha do Cliente (deixe em branco para não alterar)'
                    : 'Senha Inicial de Acesso (opcional, gerada automaticamente se em branco)'}
                </label>
                <input
                  type="text"
                  value={clientFormData.temporaryPassword}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, temporaryPassword: e.target.value })
                  }
                  placeholder={editingClient ? 'Nova senha' : 'Ex: fazenda2026'}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Internas da Empresa
                </label>
                <textarea
                  rows={2}
                  value={clientFormData.notes}
                  onChange={(e) =>
                    setClientFormData({ ...clientFormData, notes: e.target.value })
                  }
                  placeholder="Informações contratuais ou histórico de atendimento..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none resize-none"
                />
              </div>

              {editingClient && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="client_active_toggle"
                    checked={clientFormData.active}
                    onChange={(e) =>
                      setClientFormData({ ...clientFormData, active: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#2E3ED3]"
                  />
                  <label htmlFor="client_active_toggle" className="text-xs font-semibold text-slate-700">
                    Acesso habilitado para entrar no portal
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8]"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD DE NOVO DOCUMENTO */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Enviar Documento para Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Destinatário *
                </label>
                <select
                  required
                  value={uploadFormData.clientId}
                  onChange={(e) =>
                    setUploadFormData({
                      ...uploadFormData,
                      clientId: e.target.value,
                      propertyId: '',
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Propriedade Rural Vinculada (opcional)
                </label>
                <select
                  value={uploadFormData.propertyId}
                  onChange={(e) =>
                    setUploadFormData({ ...uploadFormData, propertyId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                >
                  <option value="">Documento geral (sem propriedade específica)</option>
                  {uploadClientProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.municipality} - {p.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome de Exibição do Documento *
                </label>
                <input
                  type="text"
                  required
                  value={uploadFormData.title}
                  onChange={(e) =>
                    setUploadFormData({ ...uploadFormData, title: e.target.value })
                  }
                  placeholder="Ex: CAR 2026 - Recibo de Inscrição Oficial"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arquivo do Documento (PDF, JPG, PNG) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      // Auto-fill title if empty
                      if (!uploadFormData.title) {
                        const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, '');
                        setUploadFormData((prev) => ({
                          ...prev,
                          title: nameWithoutExt.replace(/_/g, ' '),
                        }));
                      }
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f0f4ff] file:text-[#2E3ED3] hover:file:bg-[#d8f3dc] cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição ou Observação (opcional)
                </label>
                <input
                  type="text"
                  value={uploadFormData.description}
                  onChange={(e) =>
                    setUploadFormData({ ...uploadFormData, description: e.target.value })
                  }
                  placeholder="Ex: Válido até dezembro de 2026"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isUploading ? 'Enviando arquivo...' : 'Disponibilizar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CADASTRO DE PROPRIEDADE */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Propriedade Rural
              </h3>
              <button
                type="button"
                onClick={() => setShowPropertyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proprietário Responsável *
                </label>
                <select
                  required
                  value={propertyFormData.clientId}
                  onChange={(e) =>
                    setPropertyFormData({ ...propertyFormData, clientId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Propriedade (Fazenda / Sítio / Estância) *
                </label>
                <input
                  type="text"
                  required
                  value={propertyFormData.name}
                  onChange={(e) =>
                    setPropertyFormData({ ...propertyFormData, name: e.target.value })
                  }
                  placeholder="Ex: Fazenda Santa Cruz"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Município *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyFormData.municipality}
                    onChange={(e) =>
                      setPropertyFormData({ ...propertyFormData, municipality: e.target.value })
                    }
                    placeholder="Ex: Uberlândia"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={propertyFormData.state}
                    onChange={(e) =>
                      setPropertyFormData({ ...propertyFormData, state: e.target.value.toUpperCase() })
                    }
                    placeholder="MG"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Área Total (Hectares)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={propertyFormData.areaHa}
                    onChange={(e) =>
                      setPropertyFormData({ ...propertyFormData, areaHa: e.target.value })
                    }
                    placeholder="Ex: 450"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do CAR (opcional)
                  </label>
                  <input
                    type="text"
                    value={propertyFormData.carNumber}
                    onChange={(e) =>
                      setPropertyFormData({ ...propertyFormData, carNumber: e.target.value })
                    }
                    placeholder="MG-..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPropertyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8]"
                >
                  Vincular Propriedade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDITAR NOME DO DOCUMENTO */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Editar Nome de Exibição do Documento
            </h3>

            <form onSubmit={handleSaveDocEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título Visível para o Cliente
                </label>
                <input
                  type="text"
                  required
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Propriedade Rural Vinculada
                </label>
                <select
                  value={editDocPropertyId}
                  onChange={(e) => setEditDocPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#2E3ED3] focus:outline-none"
                >
                  <option value="">Sem propriedade específica</option>
                  {properties
                    .filter((p) => p.clientId === editingDoc.clientId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SUBSTITUIR ARQUIVO DO DOCUMENTO */}
      {replacingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Substituir Arquivo Físico</h3>
            <p className="text-xs text-slate-500 mb-4">
              Documento: <strong className="text-slate-800">{replacingDoc.title}</strong>
            </p>

            <form onSubmit={handleReplaceFile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione o novo arquivo atualizado
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReplacementFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f0f4ff] file:text-[#2E3ED3] hover:file:bg-[#d8f3dc] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReplacingDoc(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!replacementFile}
                  className="px-4 py-2 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] disabled:opacity-50"
                >
                  Substituir Arquivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DADOS DE ACESSO DO CLIENTE CADASTRADO (CONVITE) */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-emerald-300">
            <div className="flex items-center gap-2.5 text-emerald-800 mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-base font-bold">Cliente Cadastrado com Sucesso!</h3>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Envie estes dados de acesso ao proprietário por WhatsApp ou e-mail para que ele acesse seus documentos diretamente:
            </p>

            <div className="bg-[#f0f4ff] border border-[#2E3ED3]/20 rounded-xl p-4 space-y-2 mb-5 font-mono text-xs">
              <div>
                <span className="text-slate-500 block">Link de Acesso:</span>
                <span className="text-slate-900 font-bold break-all">
                  {window.location.origin}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">E-mail:</span>
                <span className="text-slate-900 font-bold">{inviteModalData.client.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Senha Temporária:</span>
                <span className="text-[#2E3ED3] font-extrabold text-sm">
                  {inviteModalData.tempPass}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const message = `Olá, ${inviteModalData.client.name}! Seus documentos da propriedade rural já estão disponíveis no nosso portal seguro.\n\nAcesse: ${window.location.origin}\nE-mail: ${inviteModalData.client.email}\nSenha: ${inviteModalData.tempPass}`;
                navigator.clipboard.writeText(message);
                showToast('success', 'Mensagem copiada para a área de transferência!');
                setInviteModalData(null);
              }}
              className="w-full py-2.5 rounded-xl bg-[#2E3ED3] text-white text-xs font-bold hover:bg-[#202ca8] transition-colors mb-2"
            >
              Copiar Mensagem para WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setInviteModalData(null)}
              className="w-full py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
