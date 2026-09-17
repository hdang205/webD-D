import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  User, 
  Loader2,
  HelpCircle
} from 'lucide-react';
import { AuthUser } from '../../types/accounting.js';
import { TabKey } from '../Sidebar.js';
import { authService } from '../../services/authService.js';

interface LoginPageProps {
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  onNavigateTab: (tab: TabKey) => void;
  logoutMessage?: string | null;
}

// Danh sách tài khoản mẫu trong Database để hỗ trợ kiểm thử nhanh (phải nhập mật khẩu và gọi API thật)
const SAMPLE_ACCOUNTS = [
  { username: 'quanly_duyen', roleName: 'Ban Giám Đốc / Quản Lý Cửa Hàng', name: 'Lê Thị Duyên', icon: '👔' },
  { username: 'ketoan_dung', roleName: 'Kế Toán Trưởng & Tài Chính', name: 'Đàm Thị Thùy Dung', icon: '👩‍💼' },
  { username: 'banhang_my', roleName: 'Nhân Viên Bán Hàng & POS', name: 'Đặng Trà My', icon: '👗' },
  { username: 'muahang_phong', roleName: 'Nhân Viên Mua Hàng & Xưởng', name: 'Trần Thanh Phong', icon: '📦' },
  { username: 'thukho_hai', roleName: 'Thủ Kho & Quản Lý Xuất Nhập', name: 'Chu Ngọc Hải', icon: '🏬' }
];

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  onLogin,
  onLogout,
  onNavigateTab,
  logoutMessage
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(logoutMessage || null);

  useEffect(() => {
    if (logoutMessage) {
      setNotice(logoutMessage);
    }
  }, [logoutMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setNotice(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername && !cleanPassword) {
      setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    if (!cleanUsername) {
      setLoginError('Tên đăng nhập không được để trống.');
      return;
    }
    if (!cleanPassword) {
      setLoginError('Mật khẩu không được để trống.');
      return;
    }

    setIsLoading(true);

    try {
      // GỌI API THẬT QUA BACKEND EXPRESS + DATABASE SQLITE
      const authenticatedUser = await authService.login(cleanUsername, cleanPassword);
      onLogin(authenticatedUser);
    } catch (err: any) {
      setLoginError(err.message || 'Thông tin đăng nhập không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreFill = (userAccount: string) => {
    setUsername(userAccount);
    setPassword('123456');
    setLoginError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Card Đăng Nhập Chính */}
        <div className="bg-white border border-rose-100 rounded-3xl p-8 shadow-xl space-y-6">
          
          {/* Header Theo Yêu Cầu Mục 16 */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#fb6f92] to-[#a93054] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#181a2e] tracking-tight">
                D&D FASHION
              </h1>
              <p className="text-xs font-semibold text-[#6c595f] uppercase tracking-wider mt-0.5">
                Hệ thống quản lý doanh nghiệp
              </p>
            </div>
          </div>

          {/* Thông báo đăng xuất / thông báo hệ thống */}
          {notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          {/* Báo lỗi đăng nhập */}
          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Nếu đang đăng nhập, hiển thị thông tin phiên */}
          {currentUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-2xs border border-slate-100">
                  {currentUser.avatar}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-xs text-[#a93054] font-semibold">{currentUser.roleTitle}</div>
                  <div className="text-[11px] text-slate-500 font-mono">@{currentUser.username} • {currentUser.branch}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('dashboard')}
                  className="flex-1 py-2.5 bg-[#a93054] hover:bg-[#8e2544] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Vào Bảng Điều Khiển
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng Xuất</span>
                </button>
              </div>
            </div>
          ) : (
            /* Form Đăng Nhập Xác Thực */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#181a2e] mb-1.5">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: quanly_duyen, ketoan_dung, banhang_my..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a93054]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#181a2e] mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu tài khoản..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a93054]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ĐĂNG NHẬP</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Trợ giúp kiểm thử nhanh: Gợi ý các tài khoản mẫu từ Database */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <HelpCircle className="w-4 h-4 text-[#a93054]" />
            <span>Tài khoản mẫu thử nghiệm trong Database (Mật khẩu: 123456)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Nhấp vào để điền nhanh thông tin vào form (vẫn bắt buộc gọi API xác thực thật qua server):
          </p>
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {SAMPLE_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handlePreFill(acc.username)}
                className="w-full px-3 py-2 bg-white hover:bg-rose-50/50 border border-slate-200 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{acc.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono">{acc.username}</span>
                    <span className="text-[11px] text-slate-500 ml-2 font-medium">({acc.roleName})</span>
                  </div>
                </div>
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
