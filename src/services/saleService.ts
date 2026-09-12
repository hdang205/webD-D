import { apiClient } from './apiClient.js';
import { Invoice } from '../types/accounting.js';

export interface CreateSalePayload {
  code?: string;
  invoiceSymbol?: string;
  date?: string;
  dueDate?: string;
  partnerId?: string;
  items: {
    productId?: string;
    itemId?: string;
    itemCode?: string;
    quantity: number;
    unitPrice?: number;
    discountRate?: number;
    vatRate?: number;
  }[];
  paidAmount?: number;
  customerCash?: number;
  paymentMethod?: 'CASH' | 'BANK' | 'DEBT';
  note?: string;
}

export interface SaleResponse {
  success: boolean;
  message: string;
  invoice: Invoice;
  stockUpdates?: {
    productId: string;
    code: string;
    soldQuantity: number;
    remainingStock: number;
  }[];
  change?: number;
  debt?: number;
}

export const SaleService = {
  async getAll(): Promise<Invoice[]> {
    const res: any = await apiClient.get('/api/sales');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  async getById(id: string): Promise<Invoice> {
    const res: any = await apiClient.get(`/api/sales/${encodeURIComponent(id)}`);
    return res?.data || res;
  },

  async create(payload: CreateSalePayload): Promise<SaleResponse> {
    const res: any = await apiClient.post('/api/sales', payload);
    return res;
  },

  async addPayment(id: string, payment: { amount: number; date?: string; paymentFund?: string; note?: string }): Promise<any> {
    return apiClient.post(`/api/sales/${encodeURIComponent(id)}/payments`, payment);
  }
};
