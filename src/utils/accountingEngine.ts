import { 
  Account, 
  JournalEntry, 
  CashTransaction, 
  Invoice, 
  InventoryLog, 
  Partner, 
  InventoryItem, 
  PeriodFilter 
} from '../types/accounting';

export function isDateInPeriod(dateStr: string, filter: PeriodFilter): boolean {
  if (filter.period === 'ALL') return true;
  
  const date = new Date(dateStr);
  const now = new Date();
  
  if (filter.period === 'THIS_MONTH') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  
  if (filter.period === 'LAST_MONTH') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
  }
  
  if (filter.period === 'THIS_QUARTER') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return currentQuarter === dateQuarter && date.getFullYear() === now.getFullYear();
  }
  
  if (filter.period === 'THIS_YEAR') {
    return date.getFullYear() === now.getFullYear();
  }
  
  if (filter.period === 'CUSTOM' && filter.startDate && filter.endDate) {
    const start = new Date(filter.startDate);
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }
  
  return true;
}

export function generateAutoJournalEntryFromCash(cash: CashTransaction): JournalEntry {
  const code = `BT_${cash.code}`;
  let description = cash.reason;
  const details = [];

  if (cash.type === 'CASH_RECEIPT' || cash.type === 'BANK_DEPOSIT') {
    // Thu tiền: Nợ TK Quỹ (1111/1121) - Có TK Đối ứng (511/131/711/...)
    details.push({
      accountCode: cash.fundAccountCode || '1111',
      accountName: cash.fundAccountCode?.startsWith('112') ? 'Tiền gửi ngân hàng' : 'Tiền mặt',
      debitAmount: cash.amount,
      creditAmount: 0,
    });
    details.push({
      accountCode: cash.oppositeAccountCode || '511',
      accountName: getAccountNameByCode(cash.oppositeAccountCode),
      debitAmount: 0,
      creditAmount: cash.amount,
    });
  } else {
    // Chi tiền: Nợ TK Đối ứng (642/331/156/...) - Có TK Quỹ (1111/1121)
    details.push({
      accountCode: cash.oppositeAccountCode || '642',
      accountName: getAccountNameByCode(cash.oppositeAccountCode),
      debitAmount: cash.amount,
      creditAmount: 0,
    });
    details.push({
      accountCode: cash.fundAccountCode || '1111',
      accountName: cash.fundAccountCode?.startsWith('112') ? 'Tiền gửi ngân hàng' : 'Tiền mặt',
      debitAmount: 0,
      creditAmount: cash.amount,
    });
  }

  return {
    id: `auto_je_${cash.id}`,
    code,
    date: cash.date,
    description,
    details,
    documentRef: cash.code,
    documentType: 'CASH',
    createdAt: new Date().toISOString(),
  };
}

export function generateAutoJournalEntryFromInvoice(invoice: Invoice): JournalEntry {
  const code = `BT_${invoice.code}`;
  const details = [];

  if (invoice.type === 'SALES') {
    // Bán hàng
    const debtAccount = '131'; // Phải thu KH
    const revenueAccount = '511'; // Doanh thu
    const vatAccount = '3331'; // Thuế GTGT phải nộp

    details.push({
      accountCode: debtAccount,
      accountName: 'Phải thu của khách hàng',
      debitAmount: invoice.grandTotal,
      creditAmount: 0,
    });
    details.push({
      accountCode: revenueAccount,
      accountName: 'Doanh thu bán hàng và cung cấp dịch vụ',
      debitAmount: 0,
      creditAmount: invoice.subtotal - invoice.discountTotal,
    });
    if (invoice.vatTotal > 0) {
      details.push({
        accountCode: vatAccount,
        accountName: 'Thuế GTGT phải nộp',
        debitAmount: 0,
        creditAmount: invoice.vatTotal,
      });
    }
  } else {
    // Mua hàng
    const inventoryAccount = '156'; // Hàng hóa
    const vatDeductibleAccount = '1331'; // Thuế GTGT được khấu trừ
    const payableAccount = '331'; // Phải trả người bán

    details.push({
      accountCode: inventoryAccount,
      accountName: 'Hàng hóa',
      debitAmount: invoice.subtotal - invoice.discountTotal,
      creditAmount: 0,
    });
    if (invoice.vatTotal > 0) {
      details.push({
        accountCode: vatDeductibleAccount,
        accountName: 'Thuế GTGT được khấu trừ',
        debitAmount: invoice.vatTotal,
        creditAmount: 0,
      });
    }
    details.push({
      accountCode: payableAccount,
      accountName: 'Phải trả cho người bán',
      debitAmount: 0,
      creditAmount: invoice.grandTotal,
    });
  }

  return {
    id: `auto_je_${invoice.id}`,
    code,
    date: invoice.date,
    description: `${invoice.type === 'SALES' ? 'Xuất hóa đơn bán hàng' : 'Nhập hóa đơn mua hàng'} ${invoice.code} - ${invoice.partnerName}`,
    details,
    documentRef: invoice.code,
    documentType: 'INVOICE',
    createdAt: new Date().toISOString(),
  };
}

export function generateAutoJournalEntryFromStockVoucher(voucher: InventoryLog): JournalEntry {
  const code = `BT_${voucher.code}`;
  const details = [];

  if (voucher.type === 'IMPORT') {
    // Nhập kho: Nợ TK 156 (hoặc 152) / Có TK 331 (hoặc 1111/1121)
    const stockAccount = voucher.stockAccountCode || '156';
    const oppAccount = voucher.oppositeAccountCode || '331';

    details.push({
      accountCode: stockAccount,
      accountName: getAccountNameByCode(stockAccount),
      debitAmount: voucher.totalValue,
      creditAmount: 0,
    });
    details.push({
      accountCode: oppAccount,
      accountName: getAccountNameByCode(oppAccount),
      debitAmount: 0,
      creditAmount: voucher.totalValue,
    });
  } else {
    // Xuất kho: Nợ TK 632 (Giá vốn hàng bán) / Có TK 156 (Hàng hóa)
    const stockAccount = voucher.stockAccountCode || '156';
    const oppAccount = voucher.oppositeAccountCode || '632';

    details.push({
      accountCode: oppAccount,
      accountName: getAccountNameByCode(oppAccount),
      debitAmount: voucher.totalValue,
      creditAmount: 0,
    });
    details.push({
      accountCode: stockAccount,
      accountName: getAccountNameByCode(stockAccount),
      debitAmount: 0,
      creditAmount: voucher.totalValue,
    });
  }

  return {
    id: `auto_je_${voucher.id}`,
    code,
    date: voucher.date,
    description: `${voucher.type === 'IMPORT' ? 'Phiếu nhập kho' : 'Phiếu xuất kho'} ${voucher.code} - ${voucher.partnerName || voucher.delivererOrReceiver || voucher.note || 'Kho D&D'}`,
    details,
    documentRef: voucher.code,
    documentType: 'INVENTORY',
    createdAt: new Date().toISOString(),
  };
}

function getAccountNameByCode(code: string): string {
  const map: Record<string, string> = {
    '1111': 'Tiền mặt',
    '1121': 'Tiền gửi Ngân hàng',
    '131': 'Phải thu của khách hàng',
    '1331': 'Thuế GTGT được khấu trừ',
    '141': 'Tạm ứng',
    '152': 'Nguyên liệu, vật liệu',
    '156': 'Hàng hóa',
    '211': 'Tài sản cố định hữu hình',
    '331': 'Phải trả cho người bán',
    '3331': 'Thuế GTGT phải nộp',
    '3334': 'Thuế TNDN',
    '334': 'Phải trả người lao động',
    '411': 'Vốn đầu tư của chủ sở hữu',
    '421': 'Lợi nhuận sau thuế chưa phân phối',
    '511': 'Doanh thu bán hàng và cung cấp dịch vụ',
    '632': 'Giá vốn hàng bán',
    '641': 'Chi phí bán hàng',
    '642': 'Chi phí quản lý doanh nghiệp',
    '811': 'Chi phí khác',
    '911': 'Xác định kết quả kinh doanh',
  };
  return map[code] || `Tài khoản ${code}`;
}

export interface AccountBalanceReportRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export function calculateTrialBalance(
  accounts: Account[],
  journalEntries: JournalEntry[],
  periodFilter: PeriodFilter
): AccountBalanceReportRow[] {
  const filteredEntries = journalEntries.filter(je => isDateInPeriod(je.date, periodFilter));

  const map = new Map<string, { periodDebit: number; periodCredit: number }>();

  filteredEntries.forEach(je => {
    je.details.forEach(d => {
      const code = d.accountCode;
      const current = map.get(code) || { periodDebit: 0, periodCredit: 0 };
      current.periodDebit += d.debitAmount || 0;
      current.periodCredit += d.creditAmount || 0;
      map.set(code, current);

      // Parent accounts rollup
      accounts.forEach(acc => {
        if (!acc.isDetail && code.startsWith(acc.code) && code !== acc.code) {
          const pCurrent = map.get(acc.code) || { periodDebit: 0, periodCredit: 0 };
          pCurrent.periodDebit += d.debitAmount || 0;
          pCurrent.periodCredit += d.creditAmount || 0;
          map.set(acc.code, pCurrent);
        }
      });
    });
  });

  return accounts.map(acc => {
    const period = map.get(acc.code) || { periodDebit: 0, periodCredit: 0 };
    const openingDebit = acc.openingDebit || 0;
    const openingCredit = acc.openingCredit || 0;

    let closingDebit = 0;
    let closingCredit = 0;

    // TK Loại 1, 2, 6, 8 thường có dư Nợ
    if (['ASSET', 'EXPENSE'].includes(acc.type)) {
      const net = (openingDebit - openingCredit) + (period.periodDebit - period.periodCredit);
      if (net >= 0) closingDebit = net;
      else closingCredit = Math.abs(net);
    } else {
      // TK Loại 3, 4, 5 thường có dư Có
      const net = (openingCredit - openingDebit) + (period.periodCredit - period.periodDebit);
      if (net >= 0) closingCredit = net;
      else closingDebit = Math.abs(net);
    }

    return {
      accountCode: acc.code,
      accountName: acc.name,
      accountType: acc.type,
      openingDebit,
      openingCredit,
      periodDebit: period.periodDebit,
      periodCredit: period.periodCredit,
      closingDebit,
      closingCredit,
    };
  });
}

export { formatCurrency, formatNumber, formatDate, getCurrentISODate, downloadCSV } from './formatters';

export interface ProfitAndLossReport {
  grossRevenue: number; // TK 511
  revenueDeductions: number; // Chiết khấu thương mại
  netRevenue: number; // Doanh thu thuần
  costOfGoodsSold: number; // TK 632
  grossProfit: number; // Lợi nhuận gộp
  sellingExpenses: number; // TK 641
  managementExpenses: number; // TK 642
  operatingProfit: number; // Lợi nhuận thuần từ HĐKD
  otherIncome: number;
  otherExpenses: number;
  netProfitBeforeTax: number;
  taxExpense: number; // TK 3334
  netProfitAfterTax: number;
}

export function calculateProfitAndLoss(
  journalEntries: JournalEntry[],
  periodFilter: PeriodFilter
): ProfitAndLossReport {
  const filteredEntries = journalEntries.filter(je => isDateInPeriod(je.date, periodFilter));

  let grossRevenue = 0;
  let costOfGoodsSold = 0;
  let sellingExpenses = 0;
  let managementExpenses = 0;

  filteredEntries.forEach(je => {
    je.details.forEach(d => {
      // 511 phát sinh Có
      if (d.accountCode.startsWith('511')) {
        grossRevenue += d.creditAmount || 0;
      }
      // 632 phát sinh Nợ
      if (d.accountCode.startsWith('632')) {
        costOfGoodsSold += d.debitAmount || 0;
      }
      // 641 phát sinh Nợ
      if (d.accountCode.startsWith('641')) {
        sellingExpenses += d.debitAmount || 0;
      }
      // 642 phát sinh Nợ
      if (d.accountCode.startsWith('642')) {
        managementExpenses += d.debitAmount || 0;
      }
    });
  });

  const netRevenue = grossRevenue;
  const grossProfit = netRevenue - costOfGoodsSold;
  const operatingProfit = grossProfit - sellingExpenses - managementExpenses;
  const netProfitBeforeTax = operatingProfit;
  const taxExpense = netProfitBeforeTax > 0 ? netProfitBeforeTax * 0.20 : 0; // Thuế TNDN 20%
  const netProfitAfterTax = netProfitBeforeTax - taxExpense;

  return {
    grossRevenue,
    revenueDeductions: 0,
    netRevenue,
    costOfGoodsSold,
    grossProfit,
    sellingExpenses,
    managementExpenses,
    operatingProfit,
    otherIncome: 0,
    otherExpenses: 0,
    netProfitBeforeTax,
    taxExpense,
    netProfitAfterTax,
  };
}

export interface LineItemCalculationInput {
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  vatRate?: number;
}

export interface LineItemCalculationResult {
  quantity: number;
  unitPrice: number;
  rawTotal: number;
  discountRate: number;
  discountAmount: number;
  amountBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Standardized Financial Item Calculation Helper for D&D Fashion ERP
 * Handles item pricing, trade discounts, VAT, and line totals consistently across Front & Backend.
 */
export function calculateLineItemTotals(input: LineItemCalculationInput): LineItemCalculationResult {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const unitPrice = Math.max(0, Number(input.unitPrice) || 0);
  const discountRate = Math.min(100, Math.max(0, Number(input.discountRate) || 0));
  const vatRate = Math.max(0, Number(input.vatRate) || 0);

  const rawTotal = quantity * unitPrice;
  const discountAmount = Math.round((rawTotal * discountRate) / 100);
  const amountBeforeVat = rawTotal - discountAmount;
  const vatAmount = Math.round((amountBeforeVat * vatRate) / 100);
  const totalAmount = amountBeforeVat + vatAmount;

  return {
    quantity,
    unitPrice,
    rawTotal,
    discountRate,
    discountAmount,
    amountBeforeVat,
    vatRate,
    vatAmount,
    totalAmount,
  };
}

