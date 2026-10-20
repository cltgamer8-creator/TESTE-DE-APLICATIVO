import React from 'react';
import { Download, FileText, Image, Eye, CheckCircle2, Clock } from 'lucide-react';
import type { RuralDocument } from '../types/index.ts';

interface DocumentCardProps {
  document: RuralDocument;
  onDownload: (doc: RuralDocument) => void;
  onPreview: (doc: RuralDocument) => void;
  isDownloading: boolean;
  downloadSuccess: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onDownload,
  onPreview,
  isDownloading,
  downloadSuccess,
}) => {
  const isPdf = doc.fileType === 'PDF';
  const isImage = doc.fileType === 'JPG' || doc.fileType === 'PNG';

  return (
    <article className="bg-white rounded-2xl border border-[#dee2e6] shadow-xs hover:shadow-md transition-shadow duration-200 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Top row: Icon, Type & Property */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isPdf
                ? 'bg-[#f0f4ff] text-[#2E3ED3]'
                : isImage
                ? 'bg-blue-50 text-blue-700'
                : 'bg-indigo-50 text-indigo-700'
            }`}
            aria-hidden="true"
          >
            {isPdf ? (
              <FileText className="w-6 h-6" />
            ) : isImage ? (
              <Image className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Rural property tag if available */}
            {doc.propertyName && (
              <div className="text-xs font-bold tracking-wide text-[#2E3ED3] mb-1 truncate">
                {doc.propertyName}
              </div>
            )}
            <h3 className="text-base sm:text-lg font-bold text-[#020417] leading-snug">
              {doc.title}
            </h3>
          </div>
        </div>

        {/* Metadata unboxed line with typographic separators */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5c5c5c] mb-4">
          <span className="font-bold text-[#2E3ED3]">{doc.fileType}</span>
          <span aria-hidden="true">·</span>
          <span>{doc.fileSizeFormatted}</span>
          {doc.availableDate && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#343a40]">
                <Clock className="w-3.5 h-3.5 text-[#4F8FF8]" />
                Disponibilizado em {doc.availableDate}
              </span>
            </>
          )}
        </div>

        {doc.description && (
          <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-2">
            {doc.description}
          </p>
        )}
      </div>

      {/* Action buttons zone - large, easy-to-tap touch targets */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Main download button in Meyer's signature royal blue */}
        <button
          type="button"
          onClick={() => onDownload(doc)}
          disabled={isDownloading}
          className={`flex-1 min-h-[48px] px-5 py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer ${
            downloadSuccess
              ? 'bg-[#4caf50] text-white hover:bg-[#43a047]'
              : isDownloading
              ? 'bg-[#2E3ED3]/80 text-white cursor-wait'
              : 'bg-[#2E3ED3] text-white hover:bg-[#202ca8] active:scale-[0.98]'
          }`}
          aria-label={`Baixar documento ${doc.title}`}
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Documento baixado!</span>
            </>
          ) : isDownloading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Baixando...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-white" />
              <span>Baixar documento</span>
            </>
          )}
        </button>

        {/* View/Preview button if PDF or Image */}
        {(isPdf || isImage) && (
          <button
            type="button"
            onClick={() => onPreview(doc)}
            className="min-h-[48px] px-4 py-3 rounded-xl font-semibold text-sm text-[#2E3ED3] bg-[#f0f4ff] hover:bg-[#e4ebff] border border-[#2E3ED3]/20 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            aria-label={`Visualizar documento ${doc.title}`}
          >
            <Eye className="w-4 h-4 text-[#2E3ED3]" />
            <span>Visualizar</span>
          </button>
        )}
      </div>
    </article>
  );
};
