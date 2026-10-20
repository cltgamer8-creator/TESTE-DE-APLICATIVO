import React, { useState } from 'react';

interface MeyerLogoProps {
  variant?: 'light' | 'dark' | 'header' | 'hero';
  className?: string;
  showSubtitle?: boolean;
}

export const MeyerLogo: React.FC<MeyerLogoProps> = ({
  variant = 'header',
  className = '',
  showSubtitle = true,
}) => {
  const [imageError, setImageError] = useState(false);

  // If the webp image loads cleanly
  if (!imageError) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src="/logo-meyer.webp"
          alt="Meyer Engenharia"
          onError={() => setImageError(true)}
          className={`${
            variant === 'hero'
              ? 'h-11 sm:h-13 w-auto object-contain'
              : variant === 'dark'
              ? 'h-8 sm:h-9 w-auto object-contain brightness-0 invert'
              : 'h-8 sm:h-9 w-auto object-contain'
          }`}
        />
        {showSubtitle && (
          <div className="hidden sm:flex flex-col border-l border-slate-300/80 pl-3">
            <span
              className={`text-[12px] font-bold tracking-tight uppercase ${
                variant === 'dark' ? 'text-white' : 'text-[#020417]'
              }`}
            >
              Portal do Produtor Rural
            </span>
            <span
              className={`text-[10px] tracking-wide font-medium ${
                variant === 'dark' ? 'text-[#8eb7d8]' : 'text-[#2E3ED3]'
              }`}
            >
              Regularização Fundiária & Meio Ambiente
            </span>
          </div>
        )}
      </div>
    );
  }

  // Vector fallback using Meyer's official brand colors
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-base tracking-tighter shadow-xs ${
          variant === 'dark'
            ? 'bg-[#2E3ED3] text-white border border-[#4F8FF8]/30'
            : 'bg-[#2E3ED3] text-white'
        }`}
        aria-hidden="true"
      >
        <span className="font-mono text-lg font-black text-white">M</span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-base font-extrabold tracking-tight ${
              variant === 'dark' ? 'text-white' : 'text-[#020417]'
            }`}
          >
            MEYER
          </span>
          <span
            className={`text-xs font-bold tracking-wider uppercase ${
              variant === 'dark' ? 'text-[#8eb7d8]' : 'text-[#2E3ED3]'
            }`}
          >
            ENGENHARIA
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`text-[10px] tracking-wide font-medium ${
              variant === 'dark' ? 'text-slate-300' : 'text-[#5c5c5c]'
            }`}
          >
            Regularização Fundiária & Meio Ambiente
          </span>
        )}
      </div>
    </div>
  );
};
