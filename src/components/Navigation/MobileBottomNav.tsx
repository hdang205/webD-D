import React from 'react';
import { 
  Store, 
  ShoppingBag, 
  ClipboardCheck, 
  Package, 
  Menu, 
  Wallet,
  LayoutDashboard,
  Bell
} from 'lucide-react';
import { TabKey } from '../Sidebar';
import { AuthUser } from '../../types/accounting';
import { isTabAllowedForRole, getDefaultTabForRole } from '../../utils/rbac';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenMobileDrawer: () => void;
  unpaidInvoiceCount: number;
  lowStockCount: number;
  pendingRequisitionsCount: number;
  careRemindersCount: number;
  currentUser?: AuthUser | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobileDrawer,
  unpaidInvoiceCount,
  lowStockCount,
  pendingRequisitionsCount,
  careRemindersCount,
  currentUser
}) => {
  // If in login/auth screen, hide mobile bottom bar
  if (activeTab === 'login' || activeTab === 'auth') {
    return null;
  }

  const currentRole = currentUser?.role;

  // Primary 4 smart tabs + Menu button based on role
  const isCashier = currentRole === 'SALES_STAFF' || currentRole === 'SALES_CASHIER';
  const isPurchasing = currentRole === 'PURCHASING_STAFF';
  const isWarehouse = currentRole === 'WAREHOUSE_MANAGER';
  const isAccountant = currentRole === 'CHIEF_ACCOUNTANT';

  // Determine smart primary tabs for mobile
  let mainTab1: { id: TabKey; label: string; icon: any; badge?: number } = {
    id: 'pos',
    label: 'Bán POS',
    icon: Store
  };

  let mainTab2: { id: TabKey; label: string; icon: any; badge?: number } = {
    id: 'sales',
    label: 'Đơn Hàng',
    icon: ShoppingBag,
    badge: unpaidInvoiceCount > 0 ? unpaidInvoiceCount : undefined
  };

  let mainTab3: { id: TabKey; label: string; icon: any; badge?: number } = {
    id: 'requisitions',
    label: 'Đề Xuất',
    icon: ClipboardCheck,
    badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined
  };

  let mainTab4: { id: TabKey; label: string; icon: any; badge?: number } = {
    id: 'inventory',
    label: 'Kho Hàng',
    icon: Package,
    badge: lowStockCount > 0 ? lowStockCount : undefined
  };

  // Adjust for specific roles if they don't have POS or need other primary shortcuts
  if (isAccountant) {
    mainTab1 = { id: 'cashbook', label: 'Sổ Quỹ', icon: Wallet };
    mainTab2 = { id: 'sales', label: 'Hóa Đơn', icon: ShoppingBag, badge: unpaidInvoiceCount > 0 ? unpaidInvoiceCount : undefined };
    mainTab3 = { id: 'requisitions', label: 'Duyệt Chi', icon: ClipboardCheck, badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined };
    mainTab4 = { id: 'dashboard', label: 'Báo Cáo', icon: LayoutDashboard };
  } else if (isPurchasing) {
    mainTab1 = { id: 'requisitions', label: 'Đề Xuất', icon: ClipboardCheck, badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined };
    mainTab2 = { id: 'purchases', label: 'Đơn Nhập', icon: ShoppingBag };
    mainTab3 = { id: 'inventory', label: 'Kho Hàng', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined };
    mainTab4 = { id: 'suppliers', label: 'Xưởng May', icon: Package };
  } else if (isWarehouse) {
    mainTab1 = { id: 'inventory', label: 'Kho Vận', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined };
    mainTab2 = { id: 'requisitions', label: 'Phiếu Kho', icon: ClipboardCheck, badge: pendingRequisitionsCount > 0 ? pendingRequisitionsCount : undefined };
    mainTab3 = { id: 'products', label: 'Mẫu Mã', icon: ShoppingBag };
    mainTab4 = { id: 'purchases', label: 'Nhập Xưởng', icon: Store };
  }

  const navItems = [mainTab1, mainTab2, mainTab3, mainTab4];

  return (
    <div 
      id="mobile-bottom-navbar" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-white shadow-2xl safe-area-bottom"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isAllowed = isTabAllowedForRole(currentRole, item.id);

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isAllowed) {
                  onSelectTab(item.id);
                } else {
                  onOpenMobileDrawer();
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-0.5 relative transition-all active:scale-90 cursor-pointer ${
                isActive 
                  ? 'text-[#fb6f92] font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-[#fb6f92]/20 text-[#fb6f92] scale-110 shadow-xs' : ''
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-rose-500 text-white font-mono text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Tab: Menu / All ERP Modules Drawer Button */}
        <button
          onClick={onOpenMobileDrawer}
          className="flex flex-col items-center justify-center py-1 px-0.5 relative text-slate-400 hover:text-slate-200 active:scale-90 transition-all cursor-pointer"
        >
          <div className="relative">
            <div className="p-1 rounded-xl bg-slate-800 text-pink-300 border border-slate-700">
              <Menu className="w-5 h-5" />
            </div>
            {(careRemindersCount > 0) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-slate-900 animate-ping"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium text-slate-300">
            Tất Cả
          </span>
        </button>
      </div>
    </div>
  );
};
