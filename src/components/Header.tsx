import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Lock,
  LogOut,
  ChevronDown,
  KeyRound,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { CompanyInfo, PeriodFilter, AuthUser } from '../types/accounting';
import { TabKey } from './Sidebar';
import { getDefaultTabForRole } from '../utils/rbac';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  companyInfo: CompanyInfo;
  /** @deprecated kept for backward compatibility – no longer rendered */
  periodFilter?: PeriodFilter;
  /** @deprecated kept for backward compatibility – no longer rendered */
  onPeriodChange?: (filter: any) => void;
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
  onLockScreen?: () => void;
  onFastSwitchUser?: (username: string) => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  companyInfo,
  onOpenSettings,
  activeTabTitle,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenChangePassword,
  onOpenMobileDrawer,
  theme = 'light',
  onToggleTheme,
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

  const isDark = theme === 'dark';

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 sticky top-0 z-30 shadow-md">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        
        {/* Left: Logo & App Title & Active Tab */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab(getDefaultTabForRole(currentUser?.role))}
            className="p-1 bg-white rounded-xl shadow-xs flex items-center justify-center cursor-pointer hover:opacity-95 transition active:scale-95 border border-slate-700 overflow-hidden"
            title="Về Trang Chủ Phân Quyền"
          >
            <img src="/logo.png" alt="D&D Fashion Logo" className="w-7 h-7 object-contain rounded-lg" />
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

        {/* Right: Theme Toggle, User Profile, Settings, Mobile Menu */}
        <div className="flex items-center gap-2">

          {/* Light / Dark Toggle */}
          {onToggleTheme && (
            <button
              id="btn-toggle-theme"
              onClick={onToggleTheme}
              title={isDark ? 'Chuyển chế độ sáng' : 'Chuyển chế độ tối'}
              className={`relative p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold
                ${isDark
                  ? 'bg-slate-700 border-slate-600 text-amber-300 hover:bg-slate-600'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-amber-300'
                }`}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
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

              {/* Account Dropdown */}
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
