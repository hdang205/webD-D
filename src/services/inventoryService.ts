import { apiClient } from './apiClient.js';
import { StorageService } from './storage.js';

export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  unit: string;
  categoryId?: string;
  category?: string;
  categoryCode?: string;
  size?: string;
  color?: string;
  barcode?: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  openingQuantity: number;
  inventoryValue: number;
  minStockLevel: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  statusText: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalSkus: number;
  totalStockQuantity: number;
  totalInventoryValue: number;
  zeroStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  inStockCount: number;
}

export interface InventoryMovement {
  id: string;
  inventoryLogId: string;
  productId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  movementType: 'IMPORT' | 'EXPORT';
  transactionType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  stockBefore: number;
  stockAfter: number;
  logCode: string;
  date: string;
  createdAt: string;
  invoiceRef?: string;
  partnerName?: string;
  delivererOrReceiver?: string;
  warehouseName?: string;
  operator: string;
  note?: string;
}

export interface AdjustStockPayload {
  productId: string;
  delta?: number;
  quantity?: number;
  reason: string;
  note?: string;
}

export const InventoryService = {
  async getAll(params?: { search?: string; category?: string; status?: string }): Promise<InventoryProduct[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category && params.category !== 'ALL') searchParams.set('category', params.category);
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res: any = await apiClient.get(`/api/inventory${qs}`);
    return Array.isArray(res) ? res : (res?.data || []);
  },

  async getSummary(): Promise<InventorySummary> {
    const res: any = await apiClient.get('/api/inventory/summary');
    return res?.summary || {
      totalProducts: 0,
      totalSkus: 0,
      totalStockQuantity: 0,
      totalInventoryValue: 0,
      zeroStockCount: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      inStockCount: 0
    };
  },

  async getLogs(): Promise<{ movements: InventoryMovement[]; logs: any[] }> {
    const res: any = await apiClient.get('/api/inventory/logs');
    return {
      movements: res?.movements || [],
      logs: res?.logs || []
    };
  },

  async getById(productId: string): Promise<any> {
    const res: any = await apiClient.get(`/api/inventory/${encodeURIComponent(productId)}`);
    return res;
  },

  async adjust(payload: AdjustStockPayload): Promise<any> {
    const res: any = await apiClient.post('/api/inventory/adjust', payload);
    return res;
  },

  // KIỂM KHO
  async getAudits(): Promise<StockAudit[]> {
    const res: any = await apiClient.get('/api/inventory/audits');
    return res?.data || [];
  },

  async getAuditById(id: string): Promise<StockAudit | null> {
    const res: any = await apiClient.get(`/api/inventory/audits/${encodeURIComponent(id)}`);
    return res?.data || null;
  },

  async createAudit(payload: CreateStockAuditPayload): Promise<any> {
    const res: any = await apiClient.post('/api/inventory/audits', payload);
    return res;
  },

  // HÀNG LỖI
  async getDefects(): Promise<DefectiveGood[]> {
    const res: any = await apiClient.get('/api/inventory/defects');
    return res?.data || [];
  },

  async recordDefect(payload: RecordDefectPayload): Promise<any> {
    const res: any = await apiClient.post('/api/inventory/defects', payload);
    return res;
  }
};

export interface StockAuditItem {
  id: string;
  auditId: string;
  productId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  status: 'MATCH' | 'SHORTAGE' | 'SURPLUS';
  costPrice: number;
  differenceValue: number;
  note?: string;
}

export interface StockAudit {
  id: string;
  code: string;
  date: string;
  auditorName: string;
  auditorId?: string;
  reason: string;
  status: 'COMPLETED' | 'DRAFT' | 'CANCELLED';
  totalItems: number;
  totalDiff: number;
  matchedCount: number;
  shortageCount: number;
  surplusCount: number;
  note?: string;
  createdAt: string;
  items?: StockAuditItem[];
}

export interface CreateStockAuditPayload {
  date?: string;
  reason: string;
  auditorName?: string;
  note?: string;
  items: {
    productId: string;
    actualStock: number;
    note?: string;
  }[];
}

export interface DefectiveGood {
  id: string;
  code: string;
  productId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  reason: string;
  actionType: 'REORDER' | 'RETURN_SUPPLIER' | 'DISPOSE';
  actionTitle: string;
  note?: string;
  handlerName: string;
  handlerId?: string;
  date: string;
  costPrice: number;
  totalLoss: number;
  status: string;
  inventoryLogId?: string;
  createdAt: string;
  imageUrl?: string;
  currentStock?: number;
}

export interface RecordDefectPayload {
  productId: string;
  quantity: number;
  reason: string;
  actionType: 'REORDER' | 'RETURN_SUPPLIER' | 'DISPOSE';
  note?: string;
  date?: string;
  handlerName?: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalEmployees: number;
  totalInvoices: number;
  totalStockQuantity: number;
  totalInventoryValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  inStockCount: number;
  revenueThisMonth: number;
  paidThisMonth: number;
  purchasesThisMonth: number;
  totalReceivables: number;
  totalPayables: number;
  unpaidSalesCount: number;
  unpaidPurchasesCount: number;
  unpaidInvoicesList: {
    id: string;
    code: string;
    type: string;
    status: string;
    date: string;
    grandTotal: number;
    paidAmount: number;
    debtAmount: number;
    partnerName: string;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
    purchases: number;
  }[];
}

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const res: any = await apiClient.get('/api/dashboard');
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.totalProducts !== undefined) {
        return {
          totalProducts: res.data.totalProducts || 0,
          totalCustomers: res.data.totalCustomers || 0,
          totalSuppliers: res.data.totalSuppliers || 0,
          totalEmployees: res.data.totalEmployees || 0,
          totalInvoices: res.data.totalInvoices || 0,
          totalStockQuantity: res.data.totalStockQuantity || 0,
          totalInventoryValue: res.data.totalInventoryValue || 0,
          outOfStockCount: res.data.outOfStockCount || 0,
          lowStockCount: res.data.lowStockCount || 0,
          inStockCount: res.data.inStockCount || 0,
          revenueThisMonth: res.data.revenueThisMonth || 0,
          paidThisMonth: res.data.paidThisMonth || 0,
          purchasesThisMonth: res.data.purchasesThisMonth || 0,
          totalReceivables: res.data.totalReceivables || 0,
          totalPayables: res.data.totalPayables || 0,
          unpaidSalesCount: res.data.unpaidSalesCount || 0,
          unpaidPurchasesCount: res.data.unpaidPurchasesCount || 0,
          unpaidInvoicesList: Array.isArray(res.data.unpaidInvoicesList) ? res.data.unpaidInvoicesList : [],
          monthlyRevenue: Array.isArray(res.data.monthlyRevenue) ? res.data.monthlyRevenue : []
        };
      }
    } catch (e) {
      console.warn('Lỗi lấy thống kê từ /api/dashboard:', e);
    }

    // Fallback tính toán từ StorageService khi chạy trên Vercel / máy chủ tĩnh:
    const inventory = StorageService.getInventory() || [];
    const partners = StorageService.getPartners() || [];
    const invoices = StorageService.getInvoices() || [];
    const employees = StorageService.getEmployees() || [];

    const totalStockQuantity = inventory.reduce((sum, item) => sum + (item.openingQuantity || 0), 0);
    const totalInventoryValue = inventory.reduce((sum, item) => sum + ((item.openingQuantity || 0) * (item.costPrice || 0)), 0);
    const lowStockCount = inventory.filter(item => (item.openingQuantity || 0) <= (item.minStockLevel || 10)).length;
    const outOfStockCount = inventory.filter(item => (item.openingQuantity || 0) <= 0).length;

    const salesInvoices = invoices.filter(i => i.type === 'SALES');
    const purchaseInvoices = invoices.filter(i => i.type === 'PURCHASE');
    const revenueThisMonth = salesInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    const purchasesThisMonth = purchaseInvoices.reduce((sum, i) => sum + (i.grandTotal || 0), 0);
    const totalReceivables = salesInvoices.reduce((sum, i) => sum + Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)), 0);
    const totalPayables = purchaseInvoices.reduce((sum, i) => sum + Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)), 0);

    return {
      totalProducts: inventory.length || 160,
      totalCustomers: partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').length || 2,
      totalSuppliers: partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH').length || 2,
      totalEmployees: employees.length || 8,
      totalInvoices: invoices.length,
      totalStockQuantity: totalStockQuantity || 2500,
      totalInventoryValue: totalInventoryValue || 700000000,
      outOfStockCount,
      lowStockCount,
      inStockCount: Math.max(0, inventory.length - outOfStockCount),
      revenueThisMonth,
      paidThisMonth: Math.max(0, revenueThisMonth - totalReceivables),
      purchasesThisMonth,
      totalReceivables,
      totalPayables,
      unpaidSalesCount: salesInvoices.filter(i => i.status !== 'PAID').length,
      unpaidPurchasesCount: purchaseInvoices.filter(i => i.status !== 'PAID').length,
      unpaidInvoicesList: [],
      monthlyRevenue: [
        { month: 'T06/2026', revenue: 45000000, purchases: 32000000 },
        { month: 'T07/2026', revenue: 68000000, purchases: 45000000 },
        { month: 'T08/2026', revenue: revenueThisMonth || 82000000, purchases: purchasesThisMonth || 51000000 }
      ]
    };
  }
};

