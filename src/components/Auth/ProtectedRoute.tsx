import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { TabKey } from '../Sidebar.js';
import { isTabAllowedForRole } from '../../utils/rbac.js';
import { AccessRestricted } from '../Common/AccessRestricted.js';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredTab?: TabKey;
  onNavigateTab?: (tab: TabKey) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredTab,
  onNavigateTab
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 1. Trạng thái đang khôi phục phiên đăng nhập từ Server
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-[#a93054] animate-spin" />
        <p className="text-xs font-bold text-slate-600">
          Đang kiểm tra và xác thực phiên đăng nhập...
        </p>
      </div>
    );
  }

  // 2. Chưa đăng nhập -> Chặn truy cập
  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-rose-200 rounded-3xl shadow-md text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Yêu Cầu Đăng Nhập</h3>
          <p className="text-xs text-slate-500 mt-1">
            Bạn cần đăng nhập bằng tài khoản nội bộ hợp lệ để truy cập hệ thống D&D Fashion.
          </p>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('login')}
            className="w-full py-2.5 bg-[#a93054] hover:bg-[#8e2544] text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đến Trang Đăng Nhập
          </button>
        )}
      </div>
    );
  }

  // 3. Đã đăng nhập nhưng không có quyền truy cập tab này
  if (requiredTab && !isTabAllowedForRole(user.role, requiredTab)) {
    return (
      <AccessRestricted
        currentUser={user}
        attemptedTab={requiredTab}
        onNavigateToAllowedTab={(tab) => onNavigateTab && onNavigateTab(tab)}
      />
    );
  }

  // 4. Hợp lệ
  return <>{children}</>;
};

export default ProtectedRoute;
