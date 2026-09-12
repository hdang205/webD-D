import { apiClient } from './apiClient.js';

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
  }
};

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
    const res: any = await apiClient.get('/api/dashboard');
    return res?.data || {
      totalProducts: 0, totalCustomers: 0, totalSuppliers: 0, totalEmployees: 0,
      totalInvoices: 0, totalStockQuantity: 0, totalInventoryValue: 0,
      outOfStockCount: 0, lowStockCount: 0, inStockCount: 0,
      revenueThisMonth: 0, paidThisMonth: 0, purchasesThisMonth: 0,
      totalReceivables: 0, totalPayables: 0,
      unpaidSalesCount: 0, unpaidPurchasesCount: 0,
      unpaidInvoicesList: [], monthlyRevenue: []
    };
  }
};

