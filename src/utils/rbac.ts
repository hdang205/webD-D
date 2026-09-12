import { UserRole, AuthUser } from '../types/accounting';
import { TabKey } from '../components/Sidebar';

export interface RoleConfig {
  role: UserRole;
  displayName: string;
  categoryLabel: string;
  defaultTab: TabKey;
  allowedTabs: TabKey[];
  canApproveRequisitions: boolean;
  canCreateRequisitions: boolean;
  canViewCostPrice: boolean;
  canEditProducts: boolean;
  canManageStockVouchers: boolean;
  canManageCashbook: boolean;
  canManageEmployees: boolean;
  canAccessSystemSettings: boolean;
  canMakePOSSale: boolean;
  badgeBg: string;
  badgeTextColor: string;
  description: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  DIRECTOR: {
    role: 'DIRECTOR',
    displayName: 'Đỗ Đức Dũng (Quản Lý Cửa Hàng / Giám Đốc)',
    categoryLabel: '1. Quản Lý Cửa Hàng / Ban Giám Đốc',
    defaultTab: 'dashboard',
    allowedTabs: [
      'dashboard',
      'pos',
      'crm',
      'sales',
      'customers',
      'requisitions',
      'purchases',
      'suppliers',
      'inventory',
      'products',
      'categories',
      'cashbook',
      'debts',
      'reports',
      'journal',
      'accounts',
      'employees',
      'login',
      'auth'
    ],
    canApproveRequisitions: true,
    canCreateRequisitions: true,
    canViewCostPrice: true,
    canEditProducts: true,
    canManageStockVouchers: true,
    canManageCashbook: true,
    canManageEmployees: true,
    canAccessSystemSettings: true,
    canMakePOSSale: true,
    badgeBg: 'bg-rose-900 text-rose-100 border-rose-800',
    badgeTextColor: 'text-rose-700',
    description: 'Toàn quyền điều hành kinh doanh, duyệt chi, xem báo cáo doanh thu lãi lỗ và quản trị nhân sự.'
  },

  CHIEF_ACCOUNTANT: {
    role: 'CHIEF_ACCOUNTANT',
    displayName: 'Phạm Minh Trang (Kế Toán Trưởng)',
    categoryLabel: '2. Kế Toán / Kế Toán Trưởng',
    defaultTab: 'cashbook',
    allowedTabs: [
      'dashboard',
      'cashbook',
      'debts',
      'reports',
      'journal',
      'accounts',
      'sales',
      'purchases',
      'requisitions',
      'inventory',
      'products',
      'categories',
      'customers',
      'suppliers',
      'employees',
      'login',
      'auth'
    ],
    canApproveRequisitions: true,
    canCreateRequisitions: false,
    canViewCostPrice: true,
    canEditProducts: false,
    canManageStockVouchers: true,
    canManageCashbook: true,
    canManageEmployees: true,
    canAccessSystemSettings: true,
    canMakePOSSale: false,
    badgeBg: 'bg-indigo-900 text-indigo-100 border-indigo-800',
    badgeTextColor: 'text-indigo-700',
    description: 'Quản lý sổ quỹ tiền mặt/ngân hàng, công nợ, duyệt chi, báo cáo tài chính VAS, hóa đơn VAT và tiền lương.'
  },

  SALES_STAFF: {
    role: 'SALES_STAFF',
    displayName: 'Trần Ngọc Lan (Nhân Viên Bán Hàng & Stylist)',
    categoryLabel: '3. Nhân Viên Bán Hàng & POS',
    defaultTab: 'pos',
    allowedTabs: [
      'pos',
      'crm',
      'sales',
      'customers',
      'requisitions',
      'products',
      'categories',
      'inventory',
      'login',
      'auth'
    ],
    canApproveRequisitions: false,
    canCreateRequisitions: true,
    canViewCostPrice: false, // ẨN GIÁ VỐN VỚI NHÂN VIÊN BÁN HÀNG
    canEditProducts: false,
    canManageStockVouchers: false,
    canManageCashbook: false,
    canManageEmployees: false,
    canAccessSystemSettings: false,
    canMakePOSSale: true,
    badgeBg: 'bg-pink-900 text-pink-100 border-pink-800',
    badgeTextColor: 'text-pink-700',
    description: 'Thao tác thu ngân POS quầy, xem hóa đơn bán hàng, tư vấn vóc dáng & chọn size, chăm sóc khách VIP và lập đề xuất nhập size khi hết hàng.'
  },

  SALES_CASHIER: {
    role: 'SALES_CASHIER',
    displayName: 'Vũ Mỹ Linh (Thu Ngân POS)',
    categoryLabel: '3. Nhân Viên Bán Hàng & POS',
    defaultTab: 'pos',
    allowedTabs: [
      'pos',
      'sales',
      'crm',
      'customers',
      'requisitions',
      'products',
      'categories',
      'inventory',
      'login',
      'auth'
    ],
    canApproveRequisitions: false,
    canCreateRequisitions: true,
    canViewCostPrice: false, // ẨN GIÁ VỐN
    canEditProducts: false,
    canManageStockVouchers: false,
    canManageCashbook: false,
    canManageEmployees: false,
    canAccessSystemSettings: false,
    canMakePOSSale: true,
    badgeBg: 'bg-pink-900 text-pink-100 border-pink-800',
    badgeTextColor: 'text-pink-700',
    description: 'Thao tác thu ngân POS quầy, quét mã vạch, in bill, xem hóa đơn bán và lập đề xuất khi thiếu hàng.'
  },

  PURCHASING_STAFF: {
    role: 'PURCHASING_STAFF',
    displayName: 'Nguyễn Quốc Đạt (Nhân Viên Mua Hàng & Xưởng)',
    categoryLabel: '4. Nhân Viên Mua Hàng',
    defaultTab: 'requisitions',
    allowedTabs: [
      'requisitions',
      'purchases',
      'suppliers',
      'products',
      'categories',
      'inventory',
      'debts',
      'login',
      'auth'
    ],
    canApproveRequisitions: false,
    canCreateRequisitions: true,
    canViewCostPrice: true,
    canEditProducts: true,
    canManageStockVouchers: false,
    canManageCashbook: false,
    canManageEmployees: false,
    canAccessSystemSettings: false,
    canMakePOSSale: false,
    badgeBg: 'bg-emerald-900 text-emerald-100 border-emerald-800',
    badgeTextColor: 'text-emerald-700',
    description: 'Lập đề xuất đặt may mẫu mới, quản lý xưởng may gia công & nhà cung cấp, lập đơn mua hàng xưởng (HDM).'
  },

  WAREHOUSE_MANAGER: {
    role: 'WAREHOUSE_MANAGER',
    displayName: 'Lê Hoài Nam (Thủ Kho & Quản Lý Kho)',
    categoryLabel: '5. Thủ Kho / Quản Lý Kho',
    defaultTab: 'inventory',
    allowedTabs: [
      'inventory',
      'products',
      'categories',
      'requisitions',
      'purchases',
      'suppliers',
      'login',
      'auth'
    ],
    canApproveRequisitions: false,
    canCreateRequisitions: true,
    canViewCostPrice: true,
    canEditProducts: false,
    canManageStockVouchers: true,
    canManageCashbook: false,
    canManageEmployees: false,
    canAccessSystemSettings: false,
    canMakePOSSale: false,
    badgeBg: 'bg-amber-900 text-amber-100 border-amber-800',
    badgeTextColor: 'text-amber-700',
    description: 'Lập Phiếu Nhập/Xuất Kho (PN/PX), quản lý thẻ kho, kiểm đếm số lượng size/màu và theo dõi đơn mua hàng từ xưởng.'
  },

  STAFF: {
    role: 'STAFF',
    displayName: 'Nhân Sự Nội Bộ',
    categoryLabel: 'Nhân Sự Nội Bộ',
    defaultTab: 'pos',
    allowedTabs: ['pos', 'sales', 'crm', 'products', 'categories', 'inventory', 'requisitions', 'login', 'auth'],
    canApproveRequisitions: false,
    canCreateRequisitions: true,
    canViewCostPrice: false,
    canEditProducts: false,
    canManageStockVouchers: false,
    canManageCashbook: false,
    canManageEmployees: false,
    canAccessSystemSettings: false,
    canMakePOSSale: true,
    badgeBg: 'bg-slate-800 text-slate-200 border-slate-700',
    badgeTextColor: 'text-slate-700',
    description: 'Nhân sự nội bộ D&D Fashion.'
  }
};

/**
 * Check if the given role is allowed to access the specified tab
 */
export function isTabAllowedForRole(role: UserRole | undefined, tab: TabKey): boolean {
  if (!role) return false;
  // Login & auth are always allowed
  if (tab === 'login' || tab === 'auth') return true;

  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.STAFF;
  return config.allowedTabs.includes(tab);
}

/**
 * Get default landing tab for a role
 */
export function getDefaultTabForRole(role?: UserRole): TabKey {
  if (!role) return 'login';
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.STAFF;
  return config.defaultTab;
}

/**
 * Get all allowed tabs for a role
 */
export function getAllowedTabsForRole(role?: UserRole): TabKey[] {
  if (!role) return ['login', 'auth'];
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.STAFF;
  return config.allowedTabs;
}

/**
 * Check if user can approve requisitions
 */
export function canUserApproveRequisitions(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canApproveRequisitions ?? false;
}

/**
 * Check if user can view cost price / profit margins
 */
export function canUserViewCostPrice(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canViewCostPrice ?? false;
}

/**
 * Check if user can manage stock vouchers (PN / PX)
 */
export function canUserManageStockVouchers(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canManageStockVouchers ?? false;
}

/**
 * Check if user can edit product catalogue
 */
export function canUserEditProducts(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canEditProducts ?? false;
}

/**
 * Check if user can manage cashbook & banking
 */
export function canUserManageCashbook(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canManageCashbook ?? false;
}

/**
 * Check if user can manage employees & payroll
 */
export function canUserManageEmployees(user?: AuthUser | null): boolean {
  if (!user) return false;
  return ROLE_CONFIGS[user.role]?.canManageEmployees ?? false;
}
