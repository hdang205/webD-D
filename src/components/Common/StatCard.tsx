import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-rose-100/70',
  iconTextColor = 'text-[#a93054]',
  trend,
  trendType = 'positive',
  className = '',
}) => {
  return (
    <div className={`bg-white border border-rose-100/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconTextColor}`}>
          {icon}
        </div>
      </div>

      <div className="mt-2">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            {trend && (
              <span className={`font-semibold px-2 py-0.5 rounded-full ${
                trendType === 'positive' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : trendType === 'negative'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}>
                {trend}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-400 font-medium">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
