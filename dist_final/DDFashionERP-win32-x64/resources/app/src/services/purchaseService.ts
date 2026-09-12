import { apiClient } from './apiClient.js';
import { Invoice } from '../types/accounting.js';

export interface CreatePurchasePayload {
  code?: string;
  invoiceSymbol?: string;
  date?: string;
  dueDate?: string;
  partnerId: string;
  items: {
    productId?: string;
    itemId?: string;
    itemCode?: string;
    quantity: number;
    unitPrice: number;
    discountRate?: number;
    vatRate?: number;
  }[];
  paidAmount?: number;
  paymentFund?: string;
  note?: string;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  invoice: Invoice;
  stockUpdates?: {
    productId: string;
    code: string;
    addedQuantity: number;
    currentStock: number;
  }[];
}

export const PurchaseService = {
  async getAll(): Promise<Invoice[]> {
    const res: any = await apiClient.get('/api/purchases');
    return Array.isArray(res) ? res : (res?.data || []);
  },

  async getById(id: string): Promise<Invoice> {
    const res: any = await apiClient.get(`/api/purchases/${encodeURIComponent(id)}`);
    return res?.data || res;
  },

  async create(payload: CreatePurchasePayload): Promise<PurchaseResponse> {
    const res: any = await apiClient.post('/api/purchases', payload);
    return res;
  },

  async addPayment(id: string, payment: { amount: number; date?: string; paymentFund?: string; note?: string }): Promise<any> {
    return apiClient.post(`/api/purchases/${encodeURIComponent(id)}/payments`, payment);
  }
};
