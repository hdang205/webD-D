import { useState, useEffect } from 'react';
import { 
  CompanyInfo, 
  Account, 
  Partner, 
  InventoryItem, 
  Invoice, 
  CashTransaction, 
  InventoryLog, 
  JournalEntry, 
  Employee,
  StockRequisition,
  CustomerCareLog,
  CareReminder,
  AuthUser
} from '../types/accounting';
import { StorageService } from '../services/storage';
import { ProductService, CustomerService, SupplierService, EmployeeService } from '../services/masterDataService';
import { PurchaseService } from '../services/purchaseService';
import { SaleService } from '../services/saleService';
import { InventoryService } from '../services/inventoryService';
import { DebtService } from '../services/debtService';

export function useERPData(currentUser: AuthUser | null) {
  // Core Data States
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(StorageService.getCompanyInfo);
  const [accounts, setAccounts] = useState<Account[]>(StorageService.getAccounts);
  
  // Master Data có API backend
  const [partners, setPartners] = useState<Partner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  
  // Data local storage fallback
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(StorageService.getCashTransactions);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(StorageService.getJournalEntries);
  const [requisitions, setRequisitions] = useState<StockRequisition[]>(StorageService.getRequisitions);
  const [careLogs, setCareLogs] = useState<CustomerCareLog[]>(StorageService.getCareLogs);
  const [careReminders, setCareReminders] = useState<CareReminder[]>(StorageService.getCareReminders);

  // Sync về localStorage
  useEffect(() => { StorageService.saveCompanyInfo(companyInfo); }, [companyInfo]);
  useEffect(() => { StorageService.saveAccounts(accounts); }, [accounts]);
  useEffect(() => { StorageService.saveCashTransactions(cashTransactions); }, [cashTransactions]);
  useEffect(() => { StorageService.saveJournalEntries(journalEntries); }, [journalEntries]);
  useEffect(() => { StorageService.saveRequisitions(requisitions); }, [requisitions]);
  useEffect(() => { StorageService.saveCareLogs(careLogs); }, [careLogs]);
  useEffect(() => { StorageService.saveCareReminders(careReminders); }, [careReminders]);
  useEffect(() => { if (partners && partners.length > 0) StorageService.savePartners(partners); }, [partners]);
  useEffect(() => { if (inventory && inventory.length > 0) StorageService.saveInventory(inventory); }, [inventory]);
  useEffect(() => { if (employees && employees.length > 0) StorageService.saveEmployees(employees); }, [employees]);
  useEffect(() => { if (invoices && invoices.length > 0) StorageService.saveInvoices(invoices); }, [invoices]);

  // Load Master Data từ SQLite REST API khi đăng nhập
  useEffect(() => {
    if (!currentUser) return;

    // 1. Products
    ProductService.getAll()
      .then(items => {
        if (items && Array.isArray(items)) {
          setInventory(items);
          StorageService.saveInventory(items);
        } else {
          setInventory(StorageService.getInventory());
        }
      })
      .catch(() => setInventory(StorageService.getInventory()));

    // 2. Partners (Customers & Suppliers)
    Promise.all([
      CustomerService.getAll().catch(() => []),
      SupplierService.getAll().catch(() => [])
    ]).then(([custs, supps]) => {
      const map = new Map<string, Partner>();
      (custs || []).forEach(c => { if (c && c.id && c.name) map.set(c.id, c); });
      (supps || []).forEach(s => { if (s && s.id && s.name) map.set(s.id, s); });
      const merged = Array.from(map.values());
      if (merged.length > 0) {
        setPartners(merged);
        StorageService.savePartners(merged);
      } else {
        setPartners(StorageService.getPartners());
      }
    }).catch(() => setPartners(StorageService.getPartners()));

    // 3. Employees
    EmployeeService.getAll()
      .then(emps => {
        if (emps && Array.isArray(emps)) {
          setEmployees(emps);
          StorageService.saveEmployees(emps);
        } else {
          setEmployees(StorageService.getEmployees());
        }
      })
      .catch(() => setEmployees(StorageService.getEmployees()));

    // 4. Invoices
    Promise.all([
      PurchaseService.getAll().catch(() => []),
      SaleService.getAll().catch(() => [])
    ]).then(([purchases, sales]) => {
      const allInvoices = [...(sales || []), ...(purchases || [])];
      setInvoices(allInvoices);
      StorageService.saveInvoices(allInvoices);
    }).catch(() => setInvoices(StorageService.getInvoices()));

    // 5. Inventory Logs
    InventoryService.getLogs()
      .then(res => {
        if (res?.logs && Array.isArray(res.logs)) {
          setInventoryLogs(res.logs);
          StorageService.saveInventoryLogs(res.logs);
        } else {
          setInventoryLogs(StorageService.getInventoryLogs());
        }
      })
      .catch(() => setInventoryLogs(StorageService.getInventoryLogs()));

    // 6. Cash Transactions
    DebtService.getTransactions()
      .then(txs => {
        if (txs && Array.isArray(txs)) {
          setCashTransactions(txs);
          StorageService.saveCashTransactions(txs);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const reloadProducts = () => {
    ProductService.getAll().then(items => {
      if (items && Array.isArray(items)) setInventory(items);
    });
  };

  const reloadInvoicesAndLogs = () => {
    ProductService.getAll().then(items => {
      if (items && Array.isArray(items)) setInventory(items);
    });
    InventoryService.getLogs().then(res => {
      if (res?.logs) setInventoryLogs(res.logs);
    });
  };

  return {
    companyInfo,
    setCompanyInfo,
    accounts,
    setAccounts,
    partners,
    setPartners,
    employees,
    setEmployees,
    inventory,
    setInventory,
    invoices,
    setInvoices,
    inventoryLogs,
    setInventoryLogs,
    cashTransactions,
    setCashTransactions,
    journalEntries,
    setJournalEntries,
    requisitions,
    setRequisitions,
    careLogs,
    setCareLogs,
    careReminders,
    setCareReminders,
    reloadProducts,
    reloadInvoicesAndLogs
  };
}
