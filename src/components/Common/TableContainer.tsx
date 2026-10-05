import React from 'react';

export interface TableContainerProps {
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
  scrollClassName?: string;
  footer?: React.ReactNode;
  hasBorder?: boolean;
  variant?: 'light' | 'dark';
  style?: React.CSSProperties;
  scrollStyle?: React.CSSProperties;
  id?: string;
}

/**
 * Standardized Scrollable Table Container for D&D Fashion ERP
 * Features:
 * - Responsive vertical scrolling with sticky thead
 * - Horizontal scrolling for wide tables on smaller screens
 * - Clean boutique custom scrollbar
 * - Fixed height / max-height preventing page stretching
 * - Seamless support for Light & Dark modes
 * - Optional bottom footer/pagination area
 */
export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  maxHeight,
  className = '',
  scrollClassName = '',
  footer,
  hasBorder = true,
  variant = 'light',
  style,
  scrollStyle,
  id,
}) => {
  const isDark = variant === 'dark';

  return (
    <div
      id={id}
      style={style}
      className={`rounded-2xl overflow-hidden shadow-xs flex flex-col transition-all ${
        isDark
          ? `bg-slate-900 ${hasBorder ? 'border border-slate-800' : ''}`
          : `bg-white ${hasBorder ? 'border border-rose-100/80' : ''}`
      } ${className}`}
    >
      <div
        style={scrollStyle}
        className={`table-scroll-container custom-scrollbar ${maxHeight || ''} ${scrollClassName}`}
      >
        {children}
      </div>

      {footer && (
        <div
          className={`shrink-0 border-t ${
            isDark
              ? 'border-slate-800 bg-slate-900/90 text-slate-300'
              : 'border-rose-100/80 bg-white text-slate-700'
          }`}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
