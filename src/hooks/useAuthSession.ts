import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { AuthUser } from '../types/accounting';
import { authService } from '../services/authService';
import { getDefaultTabForRole } from '../utils/rbac';
import { TabKey } from '../components/Sidebar';

export function useAuthSession(
  setActiveTab: (tab: TabKey) => void,
  showToast: (message: string, type?: any) => void
) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [unlockError, setUnlockError] = useState<boolean>(false);

  // Khôi phục phiên làm việc khi khởi động qua GET /api/auth/me
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const user = await authService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          if (user) {
            setActiveTab(getDefaultTabForRole(user.role));
          } else {
            setActiveTab('login');
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setActiveTab('login');
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }
    restoreSession();
    return () => { isMounted = false; };
  }, [setActiveTab]);

  const handleLogout = useCallback(async () => {
    const userName = currentUser?.name || 'Người dùng';
    await authService.logout();
    setCurrentUser(null);
    setLogoutMessage(`Đã đăng xuất tài khoản ${userName} an toàn khỏi hệ thống.`);
    showToast(`Đã đăng xuất tài khoản ${userName} an toàn.`, 'info');
    setActiveTab('login');
  }, [currentUser, setActiveTab, showToast]);

  const handleLogin = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    setLogoutMessage(null);
    setIsScreenLocked(false);
    showToast(`Đăng nhập thành công! Chào mừng ${user.name} (${user.roleTitle})`, 'success');
    setActiveTab(getDefaultTabForRole(user.role));
  }, [setActiveTab, showToast]);

  const handleUnlockScreen = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;
    if (unlockPassword === '123456' || unlockPassword.length >= 6) {
      setIsScreenLocked(false);
      setUnlockPassword('');
      setUnlockError(false);
      showToast('Đã mở khóa màn hình làm việc!', 'success');
    } else {
      setUnlockError(true);
    }
  }, [unlockPassword, showToast]);

  return {
    currentUser,
    setCurrentUser,
    isAuthLoading,
    logoutMessage,
    setLogoutMessage,
    isScreenLocked,
    setIsScreenLocked,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
    unlockPassword,
    setUnlockPassword,
    unlockError,
    setUnlockError,
    handleLogout,
    handleLogin,
    handleUnlockScreen
  };
}
