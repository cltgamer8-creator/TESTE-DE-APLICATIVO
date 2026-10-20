import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import type { RuralDocument } from '../types/index.ts';

interface DocumentPreviewModalProps {
  document: RuralDocument | null;
  previewUrl: string;
  onClose: () => void;
  onDownload: (doc: RuralDocument) => void;
  isDownloading: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  previewUrl,
  onClose,
  onDownload,
  isDownloading,
}) => {
  if (!doc) return null;

  const isPdf = doc.fileType === 'PDF';
  const isImage = doc.fileType === 'JPG' || doc.fileType === 'PNG';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-[#dee2e6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header in Meyer's Official Brand Blue */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#020417] text-white">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-9 h-9 rounded-xl bg-[#2E3ED3] text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="preview-modal-title" className="text-sm sm:text-base font-bold truncate text-white">
                {doc.title}
              </h2>
              {doc.propertyName && (
                <p className="text-xs text-[#8eb7d8] truncate">
                  Propriedade: {doc.propertyName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(doc)}
              disabled={isDownloading}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#2E3ED3] text-white hover:bg-[#202ca8] active:scale-95 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isDownloading ? 'Baixando...' : 'Baixar documento'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer content */}
        <div className="flex-1 bg-[#f8faff] p-2 sm:p-4 overflow-auto min-h-[360px] flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={previewUrl}
              title={doc.title}
              className="w-full h-[65vh] rounded-xl border border-[#dee2e6] bg-white shadow-xs"
            />
          ) : isImage ? (
            <div className="flex items-center justify-center max-h-[65vh]">
              <img
                src={previewUrl}
                alt={doc.title}
                className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-xs"
              />
            </div>
          ) : (
            <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-xs border border-[#dee2e6]">
              <FileText className="w-12 h-12 text-[#2E3ED3] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#020417] mb-1">
                Visualização direta não disponível para este formato ({doc.fileType})
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Baixe o arquivo para abrir diretamente no aplicativo compatível do seu celular ou computador.
              </p>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E3ED3] text-white font-bold text-sm hover:bg-[#202ca8] transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar documento
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-[#dee2e6] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2 text-slate-500">
            <span className="font-bold text-[#2E3ED3]">{doc.fileType}</span>
            <span>·</span>
            <span>{doc.fileSizeFormatted}</span>
            <span>·</span>
            <span>Disponibilizado em: {doc.availableDate}</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline font-bold text-[#020417]">Acervo Meyer Engenharia</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#2E3ED3] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir em nova aba
            </a>
            <button
              type="button"
              onClick={() => onDownload(doc)}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#2E3ED3] text-white hover:bg-[#202ca8] active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Baixando...' : 'Baixar documento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
