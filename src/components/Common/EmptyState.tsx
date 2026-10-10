import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không tìm thấy dữ liệu',
  description = 'Không có kết quả nào phù hợp với điều kiện tìm kiếm hoặc dữ liệu chưa được khởi tạo.',
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white border border-rose-100/60 rounded-3xl ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-[#a93054] mb-4 shadow-inner">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">
        {description}
      </p>
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
};
