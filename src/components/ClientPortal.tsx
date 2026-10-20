import React, { useState, useEffect, useMemo } from 'react';
import {
  LogOut,
  FolderOpen,
  HelpCircle,
  FileSearch,
  Filter,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Landmark,
} from 'lucide-react';
import type { User, RuralDocument, RuralProperty } from '../types/index.ts';
import { api } from '../services/api.ts';
import { DocumentCard } from './DocumentCard.tsx';
import { DocumentPreviewModal } from './DocumentPreviewModal.tsx';
import { MeyerLogo } from './MeyerLogo.tsx';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState<RuralDocument[]>([]);
  const [properties, setProperties] = useState<RuralProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [showPropertyDetails, setShowPropertyDetails] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Download & preview states
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadSuccessDocId, setDownloadSuccessDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<RuralDocument | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Extract client's first name
  const firstName = useMemo(() => {
    if (!user.name) return 'Produtor';
    return user.name.trim().split(' ')[0];
  }, [user.name]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [docs, props] = await Promise.all([
        api.getClientDocuments(),
        api.getClientProperties(),
      ]);
      setDocuments(docs);
      setProperties(props);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível carregar seus documentos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: RuralDocument) => {
    setDownloadingDocId(doc.id);
    try {
      await api.downloadDocument(doc.id, doc.filename);
      setDownloadSuccessDocId(doc.id);
      setTimeout(() => {
        setDownloadSuccessDocId((prev) => (prev === doc.id ? null : prev));
      }, 4000);
    } catch (err: any) {
      alert(`Falha no download: ${err.message || 'Tente novamente em instantes.'}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handlePreview = (doc: RuralDocument) => {
    setPreviewDoc(doc);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Currently active property (if specific property is selected, or the primary property)
  const activeProperty = useMemo(() => {
    if (selectedPropertyId !== 'all') {
      return properties.find((p) => p.id === selectedPropertyId) || properties[0];
    }
    return properties[0] || null;
  }, [properties, selectedPropertyId]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesProperty =
        selectedPropertyId === 'all' || doc.propertyId === selectedPropertyId;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        (doc.propertyName && doc.propertyName.toLowerCase().includes(q)) ||
        doc.fileType.toLowerCase().includes(q);

      let matchesCategory = true;
      const lowerTitle = doc.title.toLowerCase();
      if (selectedCategory === 'car') {
        matchesCategory = lowerTitle.includes('car') || lowerTitle.includes('ambiental');
      } else if (selectedCategory === 'incra') {
        matchesCategory = lowerTitle.includes('incra') || lowerTitle.includes('ccir');
      } else if (selectedCategory === 'topografia') {
        matchesCategory =
          lowerTitle.includes('topogr') ||
          lowerTitle.includes('sigef') ||
          lowerTitle.includes('drone') ||
          lowerTitle.includes('memorial') ||
          lowerTitle.includes('planta');
      } else if (selectedCategory === 'fiscal') {
        matchesCategory =
          lowerTitle.includes('itr') ||
          lowerTitle.includes('cnd') ||
          lowerTitle.includes('receita') ||
          lowerTitle.includes('débitos');
      }

      return matchesProperty && matchesSearch && matchesCategory;
    });
  }, [documents, selectedPropertyId, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8faff] text-[#1e293b] flex flex-col relative">
      {/* 1. Header with official Meyer Engenharia logo and colors */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#dee2e6] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Official Meyer Engenharia Logo */}
          <MeyerLogo variant="header" showSubtitle={true} />

          {/* User badge & Discrete logout button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="text-xs font-bold text-[#2E3ED3] hover:text-[#202ca8] hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#f0f4ff] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Suporte Meyer</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            {/* Discrete logout */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Welcome Greeting & Main Title (Crucial compliance with requirements) */}
        <section className="mb-6">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-[#2E3ED3] mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4F8FF8]" />
            <span>Olá, {firstName}!</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#020417] tracking-tight mb-2">
            Meus Documentos
          </h1>

          <p className="text-base sm:text-lg text-[#5c5c5c] leading-relaxed">
            Acesse e baixe os documentos da sua propriedade.
          </p>
        </section>

        {/* Cadastral Information Quick Box for Rural Landowners */}
        {activeProperty && (
          <div className="mb-6 bg-white rounded-2xl border border-[#dee2e6] shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPropertyDetails(!showPropertyDetails)}
              className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#f8faff] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Landmark className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-[#020417] truncate">
                  Dados Cadastrais:{' '}
                  <span className="text-[#2E3ED3]">{activeProperty.name}</span>
                </span>
                <span className="hidden sm:inline text-xs text-slate-400">
                  ({activeProperty.municipality} - {activeProperty.state}
                  {activeProperty.areaHa ? ` · ${activeProperty.areaHa} ha` : ''})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#2E3ED3] font-semibold shrink-0">
                <span>{showPropertyDetails ? 'Ocultar' : 'Consultar Números'}</span>
                {showPropertyDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showPropertyDetails && (
              <div className="p-4 sm:p-5 border-t border-[#dee2e6] bg-[#f8faff] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
                {activeProperty.carNumber && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Inscrição no CAR
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800 truncate select-all">
                        {activeProperty.carNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activeProperty.carNumber!, 'car')}
                        className="text-slate-400 hover:text-[#2E3ED3] p-1 cursor-pointer shrink-0"
                        title="Copiar número do CAR"
                      >
                        {copiedKey === 'car' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeProperty.incraCode && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Código INCRA (CCIR)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800 truncate select-all">
                        {activeProperty.incraCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activeProperty.incraCode!, 'incra')}
                        className="text-slate-400 hover:text-[#2E3ED3] p-1 cursor-pointer shrink-0"
                        title="Copiar código INCRA"
                      >
                        {copiedKey === 'incra' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeProperty.nirf && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Número NIRF (Receita Federal)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800 truncate select-all">
                        {activeProperty.nirf}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(activeProperty.nirf!, 'nirf')}
                        className="text-slate-400 hover:text-[#2E3ED3] p-1 cursor-pointer shrink-0"
                        title="Copiar NIRF"
                      >
                        {copiedKey === 'nirf' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between sm:col-span-2 lg:col-span-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Localização & Extensão
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    {activeProperty.municipality} - {activeProperty.state} ·{' '}
                    <strong>{activeProperty.areaHa ? `${activeProperty.areaHa} hectares` : 'Área regularizada'}</strong>
                    {activeProperty.notes ? ` · ${activeProperty.notes}` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter & Search Bar */}
        {!isLoading && documents.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#dee2e6] shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <FileSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome do documento (CAR, CCIR, SIGEF, Matrícula)..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl focus:outline-none focus:border-[#2E3ED3] focus:bg-white transition-colors"
                />
              </div>

              {/* Property Selector */}
              {properties.length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-sm bg-[#f8faff] border border-[#dee2e6] rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-[#2E3ED3] cursor-pointer"
                  >
                    <option value="all">Todas as propriedades ({documents.length})</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-[#2E3ED3] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#dee2e6] hover:bg-slate-50'
                }`}
              >
                Todos ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('car')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'car'
                    ? 'bg-[#2E3ED3] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#dee2e6] hover:bg-slate-50'
                }`}
              >
                Ambiental & CAR
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('topografia')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'topografia'
                    ? 'bg-[#2E3ED3] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#dee2e6] hover:bg-slate-50'
                }`}
              >
                Topografia & SIGEF
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('incra')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'incra'
                    ? 'bg-[#2E3ED3] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#dee2e6] hover:bg-slate-50'
                }`}
              >
                INCRA / CCIR
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('fiscal')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'fiscal'
                    ? 'bg-[#2E3ED3] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-[#dee2e6] hover:bg-slate-50'
                }`}
              >
                Fiscal & ITR
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Erro ao carregar documentos</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-6" />
                <div className="h-12 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State - Exactly as required:
            "Nenhum documento disponível no momento. Caso precise de ajuda, entre em contato com a empresa." */}
        {!isLoading && documents.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#dee2e6] shadow-xs p-8 sm:p-12 text-center max-w-xl mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#f0f4ff] text-[#2E3ED3] flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#020417] mb-2">
              Nenhum documento disponível no momento.
            </h3>

            <p className="text-sm text-[#5c5c5c] mb-6 leading-relaxed">
              Caso precise de ajuda, entre em contato com a empresa.
            </p>

            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2E3ED3] text-white font-bold text-sm hover:bg-[#202ca8] transition-all cursor-pointer shadow-sm"
            >
              <Phone className="w-4 h-4 text-white" />
              Falar com a Meyer Engenharia
            </button>
          </div>
        )}

        {/* Filter empty result */}
        {!isLoading && documents.length > 0 && filteredDocuments.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-6">
            <p className="text-sm text-slate-600 mb-2">
              Nenhum documento encontrado para a busca ou categoria selecionada.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedPropertyId('all');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-[#2E3ED3] hover:underline cursor-pointer"
            >
              Limpar filtros de busca
            </button>
          </div>
        )}

        {/* 3. Document Cards List */}
        {!isLoading && filteredDocuments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDownload={handleDownload}
                onPreview={handlePreview}
                isDownloading={downloadingDocId === doc.id}
                downloadSuccess={downloadSuccessDocId === doc.id}
              />
            ))}
          </div>
        )}

        {/* Footnote with technical accreditation */}
        {!isLoading && properties.length > 0 && (
          <div className="mt-12 pt-6 border-t border-[#dee2e6] text-xs text-[#5c5c5c] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2E3ED3]" />
              <span>
                Acervo técnico oficial gerenciado por <strong>Meyer Engenharia</strong> · Arquivos autenticados
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="text-[#2E3ED3] hover:underline font-bold cursor-pointer"
            >
              Dúvidas sobre seus documentos? Fale com nosso suporte
            </button>
          </div>
        )}
      </main>

      {/* Floating WhatsApp Direct Support Button */}
      <a
        href="https://wa.me/5563984047388?text=Ol%C3%A1%20Meyer%20Engenharia%2C%20sou%20cliente%20do%20portal%20de%20documentos%20rurais%20e%20gostaria%20de%20uma%20informa%C3%A7%C3%A3o."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
        title="Falar no WhatsApp com a Meyer Engenharia"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold pr-1">
          WhatsApp Técnico
        </span>
      </a>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          previewUrl={api.getViewUrl(previewDoc.id)}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDownload}
          isDownloading={downloadingDocId === previewDoc.id}
        />
      )}

      {/* Support / Contact Modal with Meyer Engenharia real corporate data */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#dee2e6]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f0f4ff] text-[#2E3ED3] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#020417]">
                    Meyer Engenharia e Consultoria
                  </h3>
                  <span className="text-[11px] text-[#5c5c5c] block">
                    Central de Atendimento ao Proprietário Rural
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5c5c5c] mb-5 leading-relaxed">
              Nossa equipe técnica de regularização fundiária, topografia e engenharia ambiental
              está pronta para orientar sobre seus processos de CAR, SIGEF/INCRA, georreferenciamento e certidões.
            </p>

            <div className="space-y-2.5 mb-6">
              <div className="p-3 bg-[#f8faff] rounded-xl border border-[#dee2e6] flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                <div className="text-xs">
                  <span className="block text-slate-500 font-medium">Telefone / Sede</span>
                  <span className="text-[#020417] font-bold">(63) 3213-1121</span>
                </div>
              </div>

              <div className="p-3 bg-[#f8faff] rounded-xl border border-[#dee2e6] flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#4caf50] shrink-0" />
                <div className="text-xs">
                  <span className="block text-slate-500 font-medium">WhatsApp Técnico</span>
                  <span className="text-[#020417] font-bold">(63) 98404-7388</span>
                </div>
              </div>

              <div className="p-3 bg-[#f8faff] rounded-xl border border-[#dee2e6] flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#2E3ED3] shrink-0" />
                <div className="text-xs">
                  <span className="block text-slate-500 font-medium">E-mail Comercial & Suporte</span>
                  <span className="text-[#020417] font-bold">comercial@meyerengenharia.com.br</span>
                </div>
              </div>

              <div className="p-3 bg-[#f8faff] rounded-xl border border-[#dee2e6] flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#4c97bb] shrink-0" />
                <div className="text-xs">
                  <span className="block text-slate-500 font-medium">Endereço</span>
                  <span className="text-slate-700">403 Sul, Al. 15 - Palmas, TO</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#2E3ED3] text-white font-bold text-xs hover:bg-[#202ca8] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
