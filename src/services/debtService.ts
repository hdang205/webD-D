import { apiClient } from './apiClient.js';
import { Partner, Invoice, CashTransaction } from '../types/accounting.js';

export interface DebtActionPayload {
  partnerId: string;
  amount: number;
  date?: string;
  paymentMethod: 'CASH' | 'BANK';
  note?: string;
}

export interface DebtActionResponse {
  success: boolean;
  message: string;
  partner: Partner;
  newDebt: number;
  transactions: CashTransaction[];
  updatedInvoices: Invoice[];
}

export const DebtService = {
  /**
   * Thu nợ khách hàng (TK 131)
   */
  async collectDebt(payload: DebtActionPayload): Promise<DebtActionResponse> {
    const res: any = await apiClient.post('/api/debts/collect', payload);
    return res;
  },

  /**
   * Trả nợ nhà cung cấp (TK 331)
   */
  async payDebt(payload: DebtActionPayload): Promise<DebtActionResponse> {
    const res: any = await apiClient.post('/api/debts/pay', payload);
    return res;
  },

  /**
   * Lấy danh sách giao dịch tiền sổ quỹ từ SQLite
   */
  async getTransactions(): Promise<CashTransaction[]> {
    try {
      const res: any = await apiClient.get('/api/debts/transactions');
      return Array.isArray(res) ? res : (res?.data || []);
    } catch {
      return [];
    }
  },

  /**
   * Tạo phiếu thu / chi sổ quỹ
   */
  async createTransaction(payload: any): Promise<any> {
    const res: any = await apiClient.post('/api/debts/transactions', payload);
    return res;
  },

  /**
   * Xóa phiếu thu / chi sổ quỹ
   */
  async deleteTransaction(id: string): Promise<any> {
    return apiClient.delete(`/api/debts/transactions/${encodeURIComponent(id)}`);
  }
};
