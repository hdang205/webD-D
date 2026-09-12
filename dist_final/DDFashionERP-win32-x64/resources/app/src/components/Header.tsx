import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Settings, 
  Download, 
  RotateCcw,
  UserCheck,
  Lock,
  LogOut,
  Store,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Monitor,
  Printer,
  Wifi,
  KeyRound,
  Users,
  CheckCircle2,
  Package,
  Truck,
  HeartHandshake,
  Menu,
  Smartphone
} from 'lucide-react';
import { CompanyInfo, PeriodFilter, FilterPeriod, AuthUser, UserRole } from '../types/accounting';
import { TabKey } from './Sidebar';
import { getDefaultTabForRole } from '../utils/rbac';

interface HeaderProps {
  companyInfo: CompanyInfo;
  periodFilter: PeriodFilter;
  onPeriodChange: (filter: PeriodFilter) => void;
  onOpenAIAssistant: () => void;
  onOpenSettings: () => void;
  onExportBackup: () => void;
  onResetData: () => void;
  activeTabTitle: string;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onLockScreen?: () => void;
  onFastSwitchUser?: (username: string) => void;
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  companyInfo,
  periodFilter,
  onPeriodChange,
  onOpenAIAssistant,
  onOpenSettings,
  onExportBackup,
  onResetData,
  activeTabTitle,
  activeTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onLockScreen,
  onFastSwitchUser,
  onOpenMobileDrawer
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setIsRoleSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map role badge color and icon
  const getRoleBadgeInfo = (role?: UserRole) => {
    switch (role) {
      case 'DIRECTOR':
        return {
          label: 'Quản Lý Cửa Hàng / Giám Đốc',
          color: 'bg-rose-900 text-rose-100 border-rose-800',
          dot: 'bg-rose-400'
        };
      case 'CHIEF_ACCOUNTANT':
        return {
          label: 'Kế Toán Trưởng / Tài Chính',
          color: 'bg-indigo-900 text-indigo-100 border-indigo-800',
          dot: 'bg-indigo-400'
        };
      case 'SALES_STAFF':
      case 'SALES_CASHIER':
        return {
          label: 'Nhân Viên Bán Hàng & POS',
          color: 'bg-pink-900 text-pink-100 border-pink-800',
          dot: 'bg-pink-400'
        };
      case 'PURCHASING_STAFF':
        return {
          label: 'Nhân Viên Mua Hàng & Xưởng',
          color: 'bg-emerald-900 text-emerald-100 border-emerald-800',
          dot: 'bg-emerald-400'
        };
      case 'WAREHOUSE_MANAGER':
        return {
          label: 'Thủ Kho & Quản Lý Kho Vận',
          color: 'bg-amber-900 text-amber-100 border-amber-800',
          dot: 'bg-amber-400'
        };
      default:
        return {
          label: 'Nhân Sự Nội Bộ',
          color: 'bg-slate-800 text-slate-200 border-slate-700',
          dot: 'bg-slate-400'
        };
    }
  };

  const roleInfo = getRoleBadgeInfo(currentUser?.role);

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 sticky top-0 z-30 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 max-w-7xl mx-auto">
        
        {/* Left: App title & Internal workstation branding */}
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectTab(getDefaultTabForRole(currentUser?.role))}
              className="p-2 bg-gradient-to-br from-[#fb6f92] to-[#a93054] rounded-xl shadow-xs text-white font-bold flex items-center justify-center cursor-pointer hover:opacity-90 transition active:scale-95"
              title="Về Trang Chính Được Phân Quyền"
            >
              <Building2 className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 
                  onClick={() => onSelectTab(getDefaultTabForRole(currentUser?.role))}
                  className="text-sm md:text-base font-bold text-white tracking-tight leading-none cursor-pointer hover:text-pink-300 transition flex items-center gap-1.5"
                >
                  <span className="truncate max-w-[170px] sm:max-w-none">{companyInfo.name || 'D&D FASHION'}</span>
                </h1>
                <span className="text-[9px] md:text-[10px] font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30 whitespace-nowrap">
                  APP v3.5
                </span>
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-400">
                  ({companyInfo.accountingStandard})
                </span>
              </div>
              <div className="text-[10px] md:text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="hidden xs:inline font-mono">192.168.1.120</span>
                </span>
                <span className="text-slate-600 hidden xs:inline">•</span>
                <span className="text-pink-300 font-semibold truncate max-w-[130px] sm:max-w-none">{activeTabTitle}</span>
              </div>
            </div>
          </div>

          {/* Mobile Right Quick Action: Drawer Menu Button */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={onOpenAIAssistant}
              className="p-2 rounded-xl bg-slate-800 text-pink-300 hover:text-white border border-slate-700 transition"
              title="Trợ lý AI"
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
            </button>
            {onOpenMobileDrawer && (
              <button
                onClick={onOpenMobileDrawer}
                className="p-2 rounded-xl bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white shadow-xs font-bold transition active:scale-95 cursor-pointer"
                title="Mở menu toàn bộ phân hệ ERP"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>


        {/* Right: Period selector, Lock Workstation & User Profile */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Period Filter Select */}
          {activeTab !== 'login' && activeTab !== 'auth' && (
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-pink-400 mr-2" />
              <select 
                className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer pr-2 font-medium"
                value={periodFilter.period}
                onChange={(e) => onPeriodChange({ period: e.target.value as FilterPeriod })}
              >
                <option value="THIS_MONTH" className="bg-slate-900 text-white">Tháng này (T8/2026)</option>
                <option value="LAST_MONTH" className="bg-slate-900 text-white">Tháng trước</option>
                <option value="THIS_QUARTER" className="bg-slate-900 text-white">Quý này (Q3/2026)</option>
                <option value="THIS_YEAR" className="bg-slate-900 text-white">Năm nay (2026)</option>
                <option value="ALL" className="bg-slate-900 text-white">Tất cả thời gian</option>
              </select>
            </div>
          )}

          {/* Quick Lock Terminal Button */}
          {onLockScreen && (
            <button
              onClick={onLockScreen}
              title="Khóa màn hình ca làm việc nội bộ khi rời vị trí"
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Khóa Máy</span>
            </button>
          )}

          {/* User Profile Pill & Dropdown Menu */}
          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-2xs"
              >
                <span className="text-sm">{currentUser.avatar}</span>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-pink-300 font-medium leading-tight">{currentUser.roleTitle.split('(')[0]}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-3 text-slate-200">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                    <div className="text-2xl p-1 bg-slate-800 rounded-xl border border-slate-700">
                      {currentUser.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs truncate">{currentUser.name}</div>
                      <div className="text-[10px] text-pink-300 font-semibold">{currentUser.roleTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">ID: {currentUser.username} • {currentUser.branch}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSelectTab('login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition cursor-pointer text-left"
                    >
                      <UserCheck className="w-4 h-4 text-pink-400" />
                      <span>Cổng Xác Thực & Bảng Phân Quyền 5 Vai Trò</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSelectTab('dashboard');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition cursor-pointer text-left"
                    >
                      <LayoutDashboard className="w-4 h-4 text-pink-400" />
                      <span>Tổng Quan Điều Hành Cửa Hàng</span>
                    </button>

                    {onLockScreen && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLockScreen();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-slate-800 rounded-xl transition cursor-pointer text-left"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Khóa Màn Hình Ca Làm Việc</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/50 rounded-xl transition cursor-pointer text-left border-t border-slate-800 mt-1 pt-2"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Đăng Xuất Khỏi Ứng Dụng Nội Bộ</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('login')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-2xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đăng Nhập Nội Bộ</span>
            </button>
          )}

          {/* AI Accounting Assistant Button */}
          <button
            id="btn-ai-assistant"
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-90 text-white font-semibold text-xs px-2.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
            title="Trợ lý AI Hạch toán & Báo cáo Nội bộ"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </button>

          {/* Company Settings Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            title="Cài đặt thông số cửa hàng nội bộ"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};
