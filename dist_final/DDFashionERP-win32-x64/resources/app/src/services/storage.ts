import { 
  CompanyInfo, 
  Account, 
  Partner, 
  InventoryItem, 
  Category,
  Invoice, 
  CashTransaction, 
  InventoryLog, 
  JournalEntry,
  Employee,
  StockRequisition,
  CustomerCareLog,
  CareReminder
} from '../types/accounting';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import { 
  INITIAL_COMPANY_INFO, 
  INITIAL_PARTNERS, 
  INITIAL_INVENTORY, 
  INITIAL_CASH_TRANSACTIONS, 
  INITIAL_INVOICES, 
  INITIAL_INVENTORY_LOGS, 
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_EMPLOYEES,
  INITIAL_REQUISITIONS,
  INITIAL_CARE_LOGS,
  INITIAL_CARE_REMINDERS
} from '../data/initialData';
import { EXPORTED_CATEGORIES, EXPORTED_PRODUCTS } from '../data/dbDumpData';

const STORAGE_KEYS = {
  COMPANY_INFO: 'dnd_fashion_company_info_v3',
  ACCOUNTS: 'dnd_fashion_accounts_v3',
  CATEGORIES: 'dnd_fashion_categories_v4',
  PARTNERS: 'dnd_fashion_partners_v3',
  INVENTORY: 'dnd_fashion_inventory_v4',
  CASH_TRANSACTIONS: 'dnd_fashion_cash_transactions_v3',
  INVOICES: 'dnd_fashion_invoices_v3',
  INVENTORY_LOGS: 'dnd_fashion_inventory_logs_v3',
  JOURNAL_ENTRIES: 'dnd_fashion_journal_entries_v3',
  EMPLOYEES: 'dnd_fashion_employees_v5',
  REQUISITIONS: 'dnd_fashion_requisitions_v3',
  CARE_LOGS: 'dnd_fashion_care_logs_v3',
  CARE_REMINDERS: 'dnd_fashion_care_reminders_v3',
};

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Lỗi đọc localStorage key ${key}:`, e);
    return defaultValue;
  }
}

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Lỗi lưu localStorage key ${key}:`, e);
  }
}

export const StorageService = {
  getCompanyInfo: (): CompanyInfo => {
    const info = loadStoredData<CompanyInfo>(STORAGE_KEYS.COMPANY_INFO, INITIAL_COMPANY_INFO);
    if (!info.name || info.name.includes('CÔNG TY')) {
      info.name = 'CỬA HÀNG THỜI TRANG D&D';
    }
    return info;
  },
  saveCompanyInfo: (data: CompanyInfo) => saveStoredData(STORAGE_KEYS.COMPANY_INFO, data),

  getAccounts: (): Account[] => loadStoredData(STORAGE_KEYS.ACCOUNTS, DEFAULT_CHART_OF_ACCOUNTS),
  saveAccounts: (data: Account[]) => saveStoredData(STORAGE_KEYS.ACCOUNTS, data),

  getCategories: (): Category[] => {
    const list = loadStoredData<Category[]>(STORAGE_KEYS.CATEGORIES, EXPORTED_CATEGORIES);
    if (!list || list.length === 0) {
      saveStoredData(STORAGE_KEYS.CATEGORIES, EXPORTED_CATEGORIES);
      return EXPORTED_CATEGORIES;
    }
    return list;
  },
  saveCategories: (data: Category[]) => saveStoredData(STORAGE_KEYS.CATEGORIES, data),

  getPartners: (): Partner[] => loadStoredData(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS),
  savePartners: (data: Partner[]) => saveStoredData(STORAGE_KEYS.PARTNERS, data),

  getInventory: (): InventoryItem[] => {
    const list = loadStoredData<InventoryItem[]>(STORAGE_KEYS.INVENTORY, EXPORTED_PRODUCTS);
    if (!list || list.length < 50) {
      saveStoredData(STORAGE_KEYS.INVENTORY, EXPORTED_PRODUCTS);
      return EXPORTED_PRODUCTS;
    }
    return list;
  },
  saveInventory: (data: InventoryItem[]) => saveStoredData(STORAGE_KEYS.INVENTORY, data),

  getCashTransactions: (): CashTransaction[] => loadStoredData(STORAGE_KEYS.CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS),
  saveCashTransactions: (data: CashTransaction[]) => saveStoredData(STORAGE_KEYS.CASH_TRANSACTIONS, data),

  getInvoices: (): Invoice[] => loadStoredData(STORAGE_KEYS.INVOICES, INITIAL_INVOICES),
  saveInvoices: (data: Invoice[]) => saveStoredData(STORAGE_KEYS.INVOICES, data),

  getInventoryLogs: (): InventoryLog[] => loadStoredData(STORAGE_KEYS.INVENTORY_LOGS, INITIAL_INVENTORY_LOGS),
  saveInventoryLogs: (data: InventoryLog[]) => saveStoredData(STORAGE_KEYS.INVENTORY_LOGS, data),

  getJournalEntries: (): JournalEntry[] => loadStoredData(STORAGE_KEYS.JOURNAL_ENTRIES, INITIAL_JOURNAL_ENTRIES),
  saveJournalEntries: (data: JournalEntry[]) => saveStoredData(STORAGE_KEYS.JOURNAL_ENTRIES, data),

  getEmployees: (): Employee[] => loadStoredData(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
  saveEmployees: (data: Employee[]) => saveStoredData(STORAGE_KEYS.EMPLOYEES, data),

  getRequisitions: (): StockRequisition[] => loadStoredData(STORAGE_KEYS.REQUISITIONS, INITIAL_REQUISITIONS),
  saveRequisitions: (data: StockRequisition[]) => saveStoredData(STORAGE_KEYS.REQUISITIONS, data),

  getCareLogs: (): CustomerCareLog[] => loadStoredData(STORAGE_KEYS.CARE_LOGS, INITIAL_CARE_LOGS),
  saveCareLogs: (data: CustomerCareLog[]) => saveStoredData(STORAGE_KEYS.CARE_LOGS, data),

  getCareReminders: (): CareReminder[] => loadStoredData(STORAGE_KEYS.CARE_REMINDERS, INITIAL_CARE_REMINDERS),
  saveCareReminders: (data: CareReminder[]) => saveStoredData(STORAGE_KEYS.CARE_REMINDERS, data),

  resetToDefaults: () => {
    localStorage.clear();
  },

  exportFullBackupJSON: () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      companyInfo: StorageService.getCompanyInfo(),
      accounts: StorageService.getAccounts(),
      partners: StorageService.getPartners(),
      employees: StorageService.getEmployees(),
      inventory: StorageService.getInventory(),
      cashTransactions: StorageService.getCashTransactions(),
      invoices: StorageService.getInvoices(),
      inventoryLogs: StorageService.getInventoryLogs(),
      journalEntries: StorageService.getJournalEntries(),
      requisitions: StorageService.getRequisitions(),
      careLogs: StorageService.getCareLogs(),
      careReminders: StorageService.getCareReminders(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KeToan_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackupJSON: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.accounts || !data.cashTransactions) {
        throw new Error("Tệp sao lưu không đúng định dạng dữ liệu kế toán.");
      }
      if (data.companyInfo) StorageService.saveCompanyInfo(data.companyInfo);
      if (data.accounts) StorageService.saveAccounts(data.accounts);
      if (data.partners) StorageService.savePartners(data.partners);
      if (data.employees) StorageService.saveEmployees(data.employees);
      if (data.inventory) StorageService.saveInventory(data.inventory);
      if (data.cashTransactions) StorageService.saveCashTransactions(data.cashTransactions);
      if (data.invoices) StorageService.saveInvoices(data.invoices);
      if (data.inventoryLogs) StorageService.saveInventoryLogs(data.inventoryLogs);
      if (data.journalEntries) StorageService.saveJournalEntries(data.journalEntries);
      if (data.requisitions) StorageService.saveRequisitions(data.requisitions);
      if (data.careLogs) StorageService.saveCareLogs(data.careLogs);
      if (data.careReminders) StorageService.saveCareReminders(data.careReminders);
      return true;
    } catch (e) {
      console.error("Lỗi phục hồi dữ liệu:", e);
      return false;
    }
  }
};
