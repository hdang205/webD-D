import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, UserCheck, CheckCircle2 } from 'lucide-react';
import { AuthUser } from '../../types/accounting';
import { ROLE_CONFIGS, getDefaultTabForRole } from '../../utils/rbac';
import { TabKey } from '../Sidebar';

interface AccessRestrictedProps {
  currentUser?: AuthUser | null;
  attemptedTab: TabKey;
  onNavigateToAllowedTab: (tab: TabKey) => void;
  onFastSwitchUser?: (username: string) => void;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  currentUser,
  attemptedTab,
  onNavigateToAllowedTab,
  onFastSwitchUser
}) => {
  const role = currentUser?.role || 'STAFF';
  const roleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.STAFF;
  const defaultTab = getDefaultTabForRole(role);

  return (
    <div className="bg-white border border-rose-200 rounded-3xl p-8 shadow-md text-center max-w-2xl mx-auto space-y-6 animate-fade-in my-8">
      <div className="w-16 h-16 mx-auto bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-[#a93054]">
        <ShieldAlert className="w-8 h-8 text-[#a93054]" />
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#a93054] bg-rose-100/70 px-3 py-1 rounded-full border border-rose-200">
          GIỚI HẠN PHÂN QUYỀN NỘI BỘ (RBAC)
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-2">
          Phân Hệ Này Không Thuộc Phạm Vi Phân Công Của Bạn
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Tài khoản <strong>{currentUser?.name || 'Nhân sự'}</strong> ({roleConfig.displayName}) chỉ được cấp quyền thao tác trên các phân hệ được ủy quyền.
        </p>
      </div>

      {/* Role Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>Phân hệ được phép truy cập của vai trò này:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {roleConfig.allowedTabs
            .filter(t => t !== 'login' && t !== 'auth')
            .map(t => (
              <button
                key={t}
                onClick={() => onNavigateToAllowedTab(t)}
                className="text-[11px] font-semibold bg-white border border-slate-200 hover:border-[#fb6f92] hover:text-[#a93054] text-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
              >
                ✓ {t.toUpperCase()}
              </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={() => onNavigateToAllowedTab(defaultTab)}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#a93054] hover:bg-[#89153d] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Không Gian Làm Việc Chính Của Bạn</span>
        </button>

        <button
          onClick={() => onNavigateToAllowedTab('login')}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Chuyển Tài Khoản / Đăng Nhập Lại</span>
        </button>
      </div>
    </div>
  );
};
