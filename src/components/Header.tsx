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
  onExportBackup?: () => void;
  onResetData?: () => void;
  activeTabTitle: string;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
  onOpenMobileDrawer?: () => void;
  // Kept for backward compatibility
  onLockScreen?: () => void;
  onFastSwitchUser?: (username: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  companyInfo,
  periodFilter,
  onPeriodChange,
  onOpenAIAssistant,
  onOpenSettings,
  activeTabTitle,
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenChangePassword,
  onOpenMobileDrawer
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        
        {/* Left: Logo & App Title & Active Tab */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab(getDefaultTabForRole(currentUser?.role))}
            className="p-2 bg-gradient-to-br from-[#fb6f92] to-[#a93054] rounded-xl shadow-xs text-white font-bold flex items-center justify-center cursor-pointer hover:opacity-90 transition active:scale-95"
            title="Về Trang Chủ Phân Quyền"
          >
            <Building2 className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <h1 
              onClick={() => onSelectTab(getDefaultTabForRole(currentUser?.role))}
              className="text-base font-extrabold text-white tracking-tight cursor-pointer hover:text-pink-300 transition"
            >
              {companyInfo.name || 'D&D FASHION'}
            </h1>
            <span className="hidden sm:inline-block text-slate-500">•</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-pink-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
              {activeTabTitle}
            </span>
          </div>
        </div>

        {/* Right: Period selector, User Profile Dropdown & Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* Period Filter Select */}
          {activeTab !== 'login' && activeTab !== 'auth' && (
            <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-pink-400 mr-2" />
              <select 
                className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer pr-1 font-medium"
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

          {/* User Profile Pill & Dropdown Menu */}
          {currentUser ? (
            <div className="relative" ref={menuRef}>
              <button
                id="btn-user-profile-menu"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-2xs"
              >
                <span className="text-base">{currentUser.avatar || '👤'}</span>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-pink-300 font-medium leading-tight">{currentUser.roleTitle?.split('(')[0]?.trim()}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Account Dropdown: Tên, Vai trò -> Đổi mật khẩu, Đăng xuất */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in text-slate-200">
                  {/* Account Info Header */}
                  <div className="p-2.5 rounded-xl bg-slate-800/80 mb-2 border border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-1 bg-slate-800 rounded-lg">{currentUser.avatar || '👤'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs truncate">{currentUser.name}</div>
                        <div className="text-[11px] text-pink-300 font-semibold truncate">{currentUser.roleTitle}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">@{currentUser.username}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Action Items */}
                  <div className="space-y-1">
                    {onOpenChangePassword && (
                      <button
                        id="btn-menu-change-password"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenChangePassword();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl transition cursor-pointer text-left"
                      >
                        <KeyRound className="w-4 h-4 text-pink-400" />
                        <span>Đổi Mật Khẩu</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        id="btn-menu-logout"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-xl transition cursor-pointer text-left border-t border-slate-800/80 mt-1 pt-2"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Đăng Xuất</span>
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
              <span>Đăng Nhập</span>
            </button>
          )}

          {/* AI Assistant Button */}
          <button
            id="btn-ai-assistant"
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-pink-300 hover:text-white border border-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer active:scale-95"
            title="Trợ lý AI Hạch toán"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </button>

          {/* Settings Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            title="Cài đặt cửa hàng"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Drawer Menu Button */}
          {onOpenMobileDrawer && (
            <button
              onClick={onOpenMobileDrawer}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white lg:hidden border border-slate-700 transition active:scale-95 cursor-pointer"
              title="Menu Phân Hệ"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
