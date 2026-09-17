import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabKey } from './components/Sidebar';
import { POSView } from './components/POS/POSView';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/Auth/LoginPage';
import { authService } from './services/authService';
import { Loader2 } from 'lucide-react';
import { CustomersView } from './components/Customers/CustomersView';
import { EmployeesView } from './components/Employees/EmployeesView';
import { SuppliersView } from './components/Suppliers/SuppliersView';
import { ProductsView } from './components/Products/ProductsView';
import { CategoriesView } from './components/Categories/CategoriesView';
import { 
  CategoryService, 
  ProductService, 
  CustomerService, 
  SupplierService, 
  EmployeeService 
} from './services/masterDataService';
import { PurchaseService, CreatePurchasePayload } from './services/purchaseService';
import { SaleService, CreateSalePayload } from './services/saleService';
import { InventoryService } from './services/inventoryService';
import { SalesView } from './components/Sales/SalesView';
import { PurchasesView } from './components/Purchases/PurchasesView';
import { CashBookView } from './components/CashBook/CashBookView';
import { DebtsView } from './components/Debts/DebtsView';
import { InventoryView } from './components/Inventory/InventoryView';
import { AccountsView } from './components/ChartOfAccounts/AccountsView';
import { JournalView } from './components/GeneralJournal/JournalView';
import { ReportsView } from './components/Reports/ReportsView';
import { AIAssistantModal } from './components/AIAssistant/AIAssistantModal';
import { SettingsModal } from './components/CompanySettings/SettingsModal';
import { PrintDocumentModal } from './components/PrintModal/PrintDocumentModal';
import { TransactionModal } from './components/CashBook/TransactionModal';
import { InvoiceModal } from './components/Invoices/InvoiceModal';
import { AccessRestricted } from './components/Common/AccessRestricted';

import { RequisitionsView } from './components/Requisitions/RequisitionsView';
import { CustomerCareView } from './components/CRM/CustomerCareView';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { MobileDrawer } from './components/Navigation/MobileDrawer';
import { MobileInstallBanner } from './components/Common/MobileInstallBanner';
import { ChangePasswordModal } from './components/Auth/ChangePasswordModal';
import { isTabAllowedForRole, getDefaultTabForRole } from './utils/rbac';

import { 
  CompanyInfo, 
  Account, 
  Partner, 
  InventoryItem, 
  Invoice, 
  InvoiceItem,
  CashTransaction, 
  InventoryLog, 
  JournalEntry, 
  PeriodFilter, 
  TransactionType, 
  InvoiceType,
  PrintDocumentType,
  AuthUser,
  Employee,
  StockRequisition,
  CustomerCareLog,
  CareReminder
} from './types/accounting';
import { StorageService } from './services/storage';
import { 
  generateAutoJournalEntryFromCash, 
  generateAutoJournalEntryFromInvoice,
  generateAutoJournalEntryFromStockVoucher
} from './utils/accountingEngine';

export default function App() {
  // Navigation State: default to Dashboard for ERP enterprise management, with instant POS access
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({ period: 'THIS_MONTH' });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  // Khôi phục phiên làm việc khi khởi động qua GET /api/auth/me
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const user = await authService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          if (user) {
            setActiveTab(getDefaultTabForRole(user.role));
          } else {
            setActiveTab('login');
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setActiveTab('login');
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    const userName = currentUser?.name || 'Người dùng';
    await authService.logout();
    setCurrentUser(null);
    setLogoutMessage(`Đã đăng xuất tài khoản ${userName} an toàn khỏi hệ thống.`);
    setActiveTab('login');
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setLogoutMessage(null);
    setIsScreenLocked(false);
    setActiveTab(getDefaultTabForRole(user.role));
  };

  // Khi người dùng muốn đổi vai trò: Yêu cầu đăng nhập xác thực tài khoản mới
  const handleFastSwitchUser = (_targetUsername: string) => {
    setActiveTab('login');
  };

  // Global hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsAIAssistantOpen(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('requisitions');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsScreenLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Core Data States – chỉ khởi tạo từ localStorage cho data KHÔNG có API backend
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(StorageService.getCompanyInfo);
  const [accounts, setAccounts] = useState<Account[]>(StorageService.getAccounts);
  // Data có API backend – khởi tạo rỗng, sẽ được load từ API sau khi đăng nhập
  const [partners, setPartners] = useState<Partner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  // Data chưa có API backend – vẫn dùng localStorage
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(StorageService.getCashTransactions);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(StorageService.getJournalEntries);
  const [requisitions, setRequisitions] = useState<StockRequisition[]>(StorageService.getRequisitions);
  const [careLogs, setCareLogs] = useState<CustomerCareLog[]>(StorageService.getCareLogs);
  const [careReminders, setCareReminders] = useState<CareReminder[]>(StorageService.getCareReminders);

  // Modals state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<{ 
    doc: CashTransaction | Invoice | InventoryLog | null; 
    kind: PrintDocumentType 
  }>({ doc: null, kind: 'CASH' });

  // Quick Action Modals
  const [quickCashModal, setQuickCashModal] = useState<{ open: boolean; type: TransactionType }>({ open: false, type: 'CASH_RECEIPT' });
  const [quickInvoiceModal, setQuickInvoiceModal] = useState<{ open: boolean; type: InvoiceType }>({ open: false, type: 'SALES' });

  // Sync về localStorage CHỈ cho data không có API backend
  useEffect(() => { StorageService.saveCompanyInfo(companyInfo); }, [companyInfo]);
  useEffect(() => { StorageService.saveAccounts(accounts); }, [accounts]);
  useEffect(() => { StorageService.saveCashTransactions(cashTransactions); }, [cashTransactions]);
  useEffect(() => { StorageService.saveJournalEntries(journalEntries); }, [journalEntries]);
  useEffect(() => { StorageService.saveRequisitions(requisitions); }, [requisitions]);
  useEffect(() => { StorageService.saveCareLogs(careLogs); }, [careLogs]);
  useEffect(() => { StorageService.saveCareReminders(careReminders); }, [careReminders]);

  // Tải Master Data từ SQLite REST API (tự động fallback sang dữ liệu khởi tạo nếu chạy trên Static Hosting như Vercel)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Tải sản phẩm từ SQLite
    ProductService.getAll()
      .then(items => { 
        if (items && items.length > 0) setInventory(items); 
        else setInventory(StorageService.getInventory());
      })
      .catch(() => setInventory(StorageService.getInventory()));

    // 2. Tải đối tác (Khách hàng & Nhà cung cấp) từ SQLite
    Promise.all([
      CustomerService.getAll().catch(() => []),
      SupplierService.getAll().catch(() => [])
    ]).then(([custs, supps]) => {
      if ((custs && custs.length > 0) || (supps && supps.length > 0)) {
        const map = new Map<string, Partner>();
        (custs || []).forEach(c => map.set(c.id, c));
        (supps || []).forEach(s => map.set(s.id, s));
        setPartners(Array.from(map.values()));
      } else {
        setPartners(StorageService.getPartners());
      }
    }).catch(() => setPartners(StorageService.getPartners()));

    // 3. Tải nhân sự từ SQLite
    EmployeeService.getAll()
      .then(emps => { 
        if (emps && emps.length > 0) setEmployees(emps); 
        else setEmployees(StorageService.getEmployees());
      })
      .catch(() => setEmployees(StorageService.getEmployees()));

    // 4. Tải hóa đơn mua hàng & bán hàng từ SQLite
    Promise.all([
      PurchaseService.getAll().catch(() => []),
      SaleService.getAll().catch(() => [])
    ]).then(([purchases, sales]) => {
      const allInvoices = [...(sales || []), ...(purchases || [])];
      if (allInvoices.length > 0) {
        setInvoices(allInvoices);
      } else {
        setInvoices(StorageService.getInvoices());
      }
    }).catch(() => setInvoices(StorageService.getInvoices()));

    // 5. Tải phiếu nhập xuất kho từ SQLite
    InventoryService.getLogs()
      .then(res => {
        if (res?.logs && res.logs.length > 0) {
          setInventoryLogs(res.logs);
        } else {
          setInventoryLogs(StorageService.getInventoryLogs());
        }
      })
      .catch(() => setInventoryLogs(StorageService.getInventoryLogs()));
  }, [currentUser]);

  // Handler: POS Sale Completion
  const handleCompletePOSSale = async (saleData: {
    partnerId?: string;
    partnerName: string;
    customerPhone: string;
    items: InvoiceItem[];
    subTotal: number;
    discountAmount: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    paidAmount: number;
    paymentMethod: 'CASH' | 'BANK' | 'DEBT';
    note?: string;
  }) => {
    try {
      const payload: CreateSalePayload = {
        partnerId: saleData.partnerId || 'p_retail',
        paidAmount: saleData.paidAmount,
        paymentMethod: saleData.paymentMethod,
        note: saleData.note || 'Bán lẻ POS Showroom D&D Fashion',
        items: saleData.items.map(it => ({
          productId: it.itemId || (it as any).productId,
          itemCode: it.itemCode,
          quantity: it.quantity,
          discountRate: it.discountRate,
          vatRate: it.vatRate
        }))
      };

      const res = await SaleService.create(payload);
      if (res && res.success && res.invoice) {
        const createdInvoice = res.invoice;
        const autoJE = generateAutoJournalEntryFromInvoice(createdInvoice);

        setInvoices(prev => [createdInvoice, ...prev]);
        setJournalEntries(prev => [autoJE, ...prev]);

        // Thêm giao dịch sổ quỹ nếu có thanh toán
        if (saleData.paidAmount > 0) {
          const isBank = saleData.paymentMethod === 'BANK';
          const newCash: CashTransaction = {
            id: `cash_pos_${Date.now()}`,
            code: `PT-POS-${Date.now().toString().slice(-4)}`,
            date: new Date().toISOString().split('T')[0],
            type: isBank ? 'BANK_DEPOSIT' : 'CASH_RECEIPT',
            personName: saleData.partnerName,
            personAddress: 'Showroom Phố Huế',
            reason: isBank 
              ? `Thu tiền quét mã VietQR Techcombank tại quầy POS (${createdInvoice.code})`
              : `Thu tiền bán lẻ trực tiếp tại quầy POS (${createdInvoice.code})`,
            amount: saleData.paidAmount,
            oppositeAccountCode: '511',
            fundAccountCode: isBank ? '1121' : '1111',
            partnerId: saleData.partnerId,
            partnerName: saleData.partnerName,
            createdByName: currentUser?.name || 'Thu Ngân Showroom'
          };
          setCashTransactions(prev => [newCash, ...prev]);
        }

        // Tải lại danh sách tồn kho từ SQLite để cập nhật ngay lập tức
        ProductService.getAll().then(items => {
          if (items && items.length > 0) setInventory(items);
        });

        return createdInvoice;
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu đơn bán lẻ POS vào SQLite:', err);
      alert(`Lỗi khi tạo đơn bán POS: ${err.message || 'Lỗi server'}`);
    }
  };

  // Handlers: Cash Transactions
  const handleAddCashTransaction = (transData: Omit<CashTransaction, 'id'>, andPrint: boolean = false) => {
    const newTrans: CashTransaction = {
      ...transData,
      id: `cash_${Date.now()}`,
    };

    // Auto generate Journal Entry
    const autoJE = generateAutoJournalEntryFromCash(newTrans);

    setCashTransactions(prev => [newTrans, ...prev]);
    setJournalEntries(prev => [autoJE, ...prev]);

    if (andPrint) {
      setPrintDoc({
        doc: newTrans,
        kind: 'CASH',
      });
    }
  };

  const handleDeleteCashTransaction = (id: string) => {
    setCashTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Handlers: Invoices (Sales / Purchases) - Kết nối API SQLite thật cho Purchases
  const handleAddInvoice = async (invoiceData: Omit<Invoice, 'id'>, andPrint: boolean = false) => {
    if (invoiceData.type === 'PURCHASE') {
      try {
        const payload: CreatePurchasePayload = {
          code: invoiceData.code,
          invoiceSymbol: invoiceData.invoiceSymbol,
          date: invoiceData.date,
          dueDate: invoiceData.dueDate,
          partnerId: invoiceData.partnerId,
          paidAmount: invoiceData.paidAmount,
          note: invoiceData.note,
          items: invoiceData.items.map(it => ({
            productId: it.itemId || (it as any).productId,
            itemCode: it.itemCode,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountRate: it.discountRate,
            vatRate: it.vatRate
          }))
        };

        const res = await PurchaseService.create(payload);
        if (res && res.success && res.invoice) {
          const createdInvoice = res.invoice;
          const autoJE = generateAutoJournalEntryFromInvoice(createdInvoice);
          setInvoices(prev => [createdInvoice, ...prev]);
          setJournalEntries(prev => [autoJE, ...prev]);

          // Tải lại danh sách tồn kho từ SQLite để cập nhật ngay lập tức
          ProductService.getAll().then(items => {
            if (items && items.length > 0) setInventory(items);
          });

          if (andPrint) {
            setPrintDoc({
              doc: createdInvoice,
              kind: 'INVOICE',
            });
          }
          return;
        }
      } catch (err: any) {
        console.error('Lỗi khi lưu đơn mua hàng vào SQLite:', err);
        alert(`Lỗi khi lập đơn nhập hàng: ${err.message || 'Lỗi server'}`);
        return;
      }
    }

    if (invoiceData.type === 'SALES') {
      try {
        const payload: CreateSalePayload = {
          code: invoiceData.code,
          invoiceSymbol: invoiceData.invoiceSymbol,
          date: invoiceData.date,
          dueDate: invoiceData.dueDate,
          partnerId: invoiceData.partnerId,
          paidAmount: invoiceData.paidAmount,
          customerCash: (invoiceData as any).customerCash,
          paymentMethod: (invoiceData as any).paymentMethod,
          note: invoiceData.note,
          items: invoiceData.items.map(it => ({
            productId: it.itemId || (it as any).productId,
            itemCode: it.itemCode,
            quantity: it.quantity,
            discountRate: it.discountRate,
            vatRate: it.vatRate
          }))
        };

        const res = await SaleService.create(payload);
        if (res && res.success && res.invoice) {
          const createdInvoice = res.invoice;
          const autoJE = generateAutoJournalEntryFromInvoice(createdInvoice);
          setInvoices(prev => [createdInvoice, ...prev]);
          setJournalEntries(prev => [autoJE, ...prev]);

          // Tải lại danh sách tồn kho từ SQLite để cập nhật ngay lập tức
          ProductService.getAll().then(items => {
            if (items && items.length > 0) setInventory(items);
          });

          if (andPrint) {
            setPrintDoc({
              doc: createdInvoice,
              kind: 'INVOICE',
            });
          }
          return;
        }
      } catch (err: any) {
        console.error('Lỗi khi lưu đơn bán hàng vào SQLite:', err);
        alert(`Lỗi khi lập hóa đơn bán hàng: ${err.message || 'Lỗi server'}`);
        return;
      }
    }

    const newInvoice: Invoice = {
      ...invoiceData,
      id: `invc_${Date.now()}`,
    };

    // Auto generate Financial Journal Entry (Revenue / VAT / Receivables)
    const autoJE = generateAutoJournalEntryFromInvoice(newInvoice);

    setInvoices(prev => [newInvoice, ...prev]);
    setJournalEntries(prev => [autoJE, ...prev]);

    if (andPrint) {
      setPrintDoc({
        doc: newInvoice,
        kind: 'INVOICE',
      });
    }
  };

  const handleUpdateInvoicePayment = async (id: string, paidAmount: number) => {
    const target = invoices.find(i => i.id === id);
    if (target && target.type === 'SALES') {
      try {
        const paymentAmount = paidAmount - target.paidAmount;
        if (paymentAmount > 0) {
          await SaleService.addPayment(id, { amount: paymentAmount });
        }
      } catch (err: any) {
        console.warn('Lỗi cập nhật thanh toán trên backend:', err);
        alert(`Lỗi thanh toán: ${err.message || 'Lỗi server'}`);
        return;
      }
    } else if (target && target.type === 'PURCHASE') {
      try {
        const paymentAmount = paidAmount - target.paidAmount;
        if (paymentAmount > 0) {
          await PurchaseService.addPayment(id, { amount: paymentAmount });
        }
      } catch (err: any) {
        console.warn('Lỗi cập nhật thanh toán trên backend:', err);
        alert(`Lỗi thanh toán: ${err.message || 'Lỗi server'}`);
        return;
      }
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const status = paidAmount >= inv.grandTotal ? 'PAID' : 'PARTIAL';
        return { ...inv, paidAmount, status };
      }
      return inv;
    }));
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  // Handlers: Inventory Vouchers (Phiếu Nhập Kho & Phiếu Xuất Kho)
  const handleAddStockVoucher = (voucherData: Omit<InventoryLog, 'id'>, andPrint: boolean = false) => {
    const newVoucher: InventoryLog = {
      ...voucherData,
      id: `stock_voucher_${Date.now()}`,
    };

    // Auto generate Stock Movement Journal Entry
    const autoJE = generateAutoJournalEntryFromStockVoucher(newVoucher);

    // Update physical inventory quantities
    setInventory(prevInv => {
      return prevInv.map(invItem => {
        const matchedItem = newVoucher.items.find(i => i.itemId === invItem.id || i.itemCode === invItem.code);
        if (matchedItem) {
          const qtyChange = newVoucher.type === 'IMPORT' ? matchedItem.quantity : -matchedItem.quantity;
          const updatedQty = Math.max(0, invItem.openingQuantity + qtyChange);
          return {
            ...invItem,
            openingQuantity: updatedQty,
          };
        }
        return invItem;
      });
    });

    setInventoryLogs(prev => [newVoucher, ...prev]);
    setJournalEntries(prev => [autoJE, ...prev]);

    if (andPrint) {
      setPrintDoc({
        doc: newVoucher,
        kind: newVoucher.type === 'IMPORT' ? 'STOCK_IMPORT' : 'STOCK_EXPORT',
      });
    }
  };

  const handleDeleteStockVoucher = (id: string) => {
    setInventoryLogs(prev => prev.filter(v => v.id !== id));
  };

  const handlePrintStockVoucher = (voucher: InventoryLog) => {
    setPrintDoc({
      doc: voucher,
      kind: voucher.type === 'IMPORT' ? 'STOCK_IMPORT' : 'STOCK_EXPORT',
    });
  };

  // Handlers: Partners (Customers & Suppliers) - Kết nối API SQLite thật
  const handleAddPartner = async (partnerData: Omit<Partner, 'id'>) => {
    try {
      const created = partnerData.type === 'SUPPLIER'
        ? await SupplierService.create(partnerData)
        : await CustomerService.create(partnerData);
      setPartners(prev => [created, ...prev]);
    } catch (err: any) {
      console.error('Lỗi thêm đối tác:', err);
      alert(err.message || 'Lỗi thêm đối tác');
    }
  };

  const handleUpdatePartner = async (partnerData: Partner) => {
    try {
      const updated = partnerData.type === 'SUPPLIER'
        ? await SupplierService.update(partnerData.id, partnerData)
        : await CustomerService.update(partnerData.id, partnerData);
      setPartners(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err: any) {
      console.error('Lỗi cập nhật đối tác:', err);
      alert(err.message || 'Lỗi cập nhật đối tác');
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      const target = partners.find(p => p.id === id);
      if (target?.type === 'SUPPLIER') {
        await SupplierService.delete(id);
      } else {
        await CustomerService.delete(id);
      }
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Lỗi xóa đối tác:', err);
      alert(err.message || 'Lỗi xóa đối tác');
    }
  };

  // Handlers: Employees (Staff & Payroll) - Kết nối API SQLite thật
  const handleAddEmployee = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      const created = await EmployeeService.create(employeeData);
      setEmployees(prev => [created, ...prev]);
    } catch (err: any) {
      console.error('Lỗi thêm nhân sự:', err);
      alert(err.message || 'Lỗi thêm nhân sự');
    }
  };

  const handleUpdateEmployee = async (employeeData: Employee) => {
    try {
      const updated = await EmployeeService.update(employeeData.id, employeeData);
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    } catch (err: any) {
      console.error('Lỗi cập nhật nhân sự:', err);
      alert(err.message || 'Lỗi cập nhật nhân sự');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await EmployeeService.delete(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('Lỗi xóa nhân sự:', err);
      alert(err.message || 'Lỗi xóa nhân sự');
    }
  };

  // Handlers: Products & Inventory Items - Kết nối API SQLite thật
  const handleAddInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
    try {
      const created = await ProductService.create(itemData);
      setInventory(prev => [created, ...prev]);
    } catch (err: any) {
      console.error('Lỗi thêm sản phẩm:', err);
      alert(err.message || 'Lỗi thêm sản phẩm');
    }
  };

  const handleUpdateInventoryItem = async (itemData: InventoryItem) => {
    try {
      const updated = await ProductService.update(itemData.id, itemData);
      setInventory(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err: any) {
      console.error('Lỗi cập nhật sản phẩm:', err);
      alert(err.message || 'Lỗi cập nhật sản phẩm');
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    try {
      await ProductService.delete(id);
      setInventory(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      console.error('Lỗi xóa sản phẩm:', err);
      alert(err.message || 'Lỗi xóa sản phẩm');
    }
  };

  // Handlers: Journal Entries
  const handleAddJournalEntry = (jeData: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newJE: JournalEntry = {
      ...jeData,
      id: `manual_je_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setJournalEntries(prev => [newJE, ...prev]);
  };

  const handleDeleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(j => j.id !== id));
  };

  // Handlers: Requisitions & Approvals
  const handleSaveRequisition = (newReq: StockRequisition) => {
    setRequisitions(prev => [newReq, ...prev]);
  };

  const handleDeleteRequisition = (id: string) => {
    setRequisitions(prev => prev.filter(r => r.id !== id));
  };

  const handleApproveRequisition = (id: string, notes?: string) => {
    const approver = currentUser ? currentUser.name : 'Giám Đốc';
    const dateStr = new Date().toISOString().split('T')[0];

    setRequisitions(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'APPROVED' as const,
          approverId: currentUser?.id || 'emp_director',
          approverName: approver,
          approverRole: currentUser?.roleTitle || 'Ban Giám Đốc',
          approvalDate: dateStr,
          approvalNotes: notes || 'Đã phê duyệt đề xuất nhập hàng.'
        };
      }
      return r;
    }));
  };

  const handleRejectRequisition = (id: string, notes?: string) => {
    const approver = currentUser ? currentUser.name : 'Giám Đốc';
    const dateStr = new Date().toISOString().split('T')[0];

    setRequisitions(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'REJECTED' as const,
          approverId: currentUser?.id || 'emp_director',
          approverName: approver,
          approverRole: currentUser?.roleTitle || 'Ban Giám Đốc',
          approvalDate: dateStr,
          approvalNotes: notes || 'Từ chối đề xuất.'
        };
      }
      return r;
    }));
  };

  // Convert Approved Requisition to Purchase Invoice (HDM)
  const handleConvertToPurchaseInvoice = (req: StockRequisition) => {
    const invoiceCode = `HDM-${req.code}`;
    const invoiceItems: InvoiceItem[] = req.items.map(it => {
      const vat = Math.round(it.totalEstimated * 0.1);
      return {
        id: `it_${Date.now()}_${it.id}`,
        itemId: it.itemId || `item_${it.id}`,
        itemCode: it.itemCode || 'SKU-REQ',
        itemName: it.itemName,
        unit: it.unit || 'Cái',
        quantity: it.requestedQty,
        unitPrice: it.estimatedUnitPrice,
        discountRate: 0,
        discountAmount: 0,
        vatRate: 10,
        vatAmount: vat,
        totalAmount: it.totalEstimated + vat
      };
    });

    const newInvoice: Invoice = {
      id: `invc_req_${Date.now()}`,
      code: invoiceCode,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      type: 'PURCHASE',
      status: 'UNPAID',
      partnerId: req.suggestedSupplierId || partners.find(p => p.type === 'SUPPLIER')?.id || 'p2',
      partnerName: req.suggestedSupplierName || 'Xưởng May Gia Công Garment Vina',
      partnerTaxCode: '0109988111',
      partnerAddress: 'Khu công nghiệp may mặc Tân Bình',
      items: invoiceItems,
      subtotal: req.totalEstimatedAmount,
      discountTotal: 0,
      vatTotal: Math.round(req.totalEstimatedAmount * 0.1),
      grandTotal: Math.round(req.totalEstimatedAmount * 1.1),
      paidAmount: 0,
      note: `Nhập hàng theo đơn đề xuất đã duyệt #${req.code} (${req.reason})`
    };

    // 1. Add purchase invoice
    handleAddInvoice(newInvoice);

    // 2. Mark requisition as COMPLETED with document ref
    setRequisitions(prev => prev.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'COMPLETED' as const,
          createdDocumentRef: invoiceCode
        };
      }
      return r;
    }));

    alert(`Đã tạo thành công Hóa Đơn Nhập Hàng Xưởng #${invoiceCode} từ phiếu đề xuất #${req.code}!`);
    setActiveTab('purchases');
  };

  // Convert Approved Requisition to Stock Import (PN)
  const handleConvertToStockImport = (req: StockRequisition) => {
    const voucherCode = `PN-${req.code}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const newLog: InventoryLog = {
      id: `log_req_${Date.now()}`,
      code: voucherCode,
      type: 'IMPORT',
      date: dateStr,
      partnerName: req.suggestedSupplierName || 'Xưởng May D&D',
      warehouseName: 'Kho Thời Trang D&D (Showroom)',
      stockAccountCode: '156',
      oppositeAccountCode: '331',
      items: req.items.map(it => ({
        itemId: it.itemId || `inv_${it.id}`,
        itemCode: it.itemCode || 'SKU-REQ',
        itemName: it.itemName,
        unit: it.unit || 'Cái',
        quantity: it.requestedQty,
        unitPrice: it.estimatedUnitPrice,
        totalAmount: it.totalEstimated
      })),
      totalValue: req.totalEstimatedAmount,
      note: `Nhập kho theo phiếu đề xuất ${req.code}`
    };

    handleAddStockVoucher(newLog);

    // Update requisition
    setRequisitions(prev => prev.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'COMPLETED' as const,
          createdDocumentRef: voucherCode
        };
      }
      return r;
    }));

    alert(`Đã tạo Phiếu Nhập Kho #${voucherCode} và cập nhật số lượng tồn kho thành công!`);
    setActiveTab('inventory');
  };

  // Handlers: Customer Care (CRM)
  const handleSaveCareLog = (log: CustomerCareLog) => {
    setCareLogs(prev => [log, ...prev]);
  };

  const handleDeleteCareLog = (id: string) => {
    setCareLogs(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleReminderStatus = (id: string) => {
    setCareReminders(prev => prev.map(rem => {
      if (rem.id === id) {
        return {
          ...rem,
          status: rem.status === 'DONE' ? 'PENDING' : 'DONE'
        };
      }
      return rem;
    }));
  };

  const handleDeleteReminder = (id: string) => {
    setCareReminders(prev => prev.filter(r => r.id !== id));
  };

  // Tab Title mapping
  const getTabTitle = (tab: TabKey): string => {
    switch (tab) {
      case 'pos': return 'Thu Ngân POS Bán Hàng Tại Quầy';
      case 'login':
      case 'auth': return 'Trang Đăng Nhập & Phân Quyền';
      case 'dashboard': return 'Tổng Quan ERP';
      case 'employees': return 'Người Dùng & Nhân Sự';
      case 'customers': return 'Quản Lý Khách Hàng (VIP)';
      case 'suppliers': return 'Nhà Cung Cấp & Xưởng May';
      case 'products': return 'Sản Phẩm & Bộ Sưu Tập';
      case 'categories': return 'Danh Mục Nhóm Hàng';
      case 'sales': return 'Bán Hàng & Đơn Bán (ERP)';
      case 'purchases': return 'Nhập Hàng Từ Xưởng May';
      case 'requisitions': return 'Đề Xuất & Phê Duyệt Nhập/Xuất Hàng';
      case 'crm': return 'CSKH & Tư Vấn Bán Hàng Thời Trang';
      case 'inventory': return 'Kho Hàng & Phiếu Xuất Nhập';
      case 'cashbook': return 'Sổ Quỹ Thu Chi';
      case 'debts': return 'Quản Lý Công Nợ';
      case 'reports': return 'Báo Cáo Tài Chính & Thuế';
      case 'journal': return 'Sổ Nhật Ký Chung (VAS)';
      case 'accounts': return 'Hệ Thống Tài Khoản';
      default: return 'Cửa Hàng Thời Trang D&D';
    }
  };

  const customerCount = partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').length;
  const supplierCount = partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH').length;
  const unpaidInvoicesCount = invoices.filter(i => i.status !== 'PAID').length;
  const lowStockCount = inventory.filter(item => item.openingQuantity <= item.minStockLevel).length;

  // 1. Màn hình chờ xác thực phiên làm việc khi khởi động
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#fff5f7] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#a93054] animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-lg font-extrabold text-[#181a2e]">D&D FASHION ERP</h2>
          <p className="text-xs text-[#6c595f] font-semibold">Đang kiểm tra và xác thực phiên làm việc...</p>
        </div>
      </div>
    );
  }

  // 2. Chưa đăng nhập -> Luôn luôn hiển thị màn hình LoginPage, chặn toàn bộ truy cập
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#fff5f7] flex flex-col justify-center">
        <LoginPage
          currentUser={null}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onNavigateTab={setActiveTab}
          logoutMessage={logoutMessage}
        />
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#fbf8ff] text-[#181a2e] font-sans flex flex-col antialiased selection:bg-[#fb6f92] selection:text-white">
      
      {/* Top Header & Omnichannel Mode Switcher */}
      <Header
        companyInfo={companyInfo}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportBackup={StorageService.exportFullBackupJSON}
        onResetData={() => {
          if (confirm('Khôi phục toàn bộ dữ liệu thời trang D&D ban đầu?')) {
            StorageService.resetToDefaults();
            window.location.reload();
          }
        }}
        activeTabTitle={getTabTitle(activeTab)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setActiveTab('login')}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLockScreen={() => setIsScreenLocked(true)}
        onFastSwitchUser={handleFastSwitchUser}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Mobile Add to Home Screen Prompt Banner */}
      <MobileInstallBanner />

      {/* Main App Layout (POS, Standalone LoginPage, or Sidebar + ERP Workspace) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 pb-24 md:pb-16">
        
        {/* 1. Trang Thu ngân POS bán lẻ tại quầy */}
        {activeTab === 'pos' && (
          isTabAllowedForRole(currentUser?.role, 'pos') ? (
            <POSView
              inventory={inventory}
              partners={partners}
              onCompletePOSSale={handleCompletePOSSale}
              onNavigateToERP={() => setActiveTab(getDefaultTabForRole(currentUser?.role))}
            />
          ) : (
            <AccessRestricted
              currentUser={currentUser}
              attemptedTab={activeTab}
              onNavigateToAllowedTab={setActiveTab}
              onFastSwitchUser={handleFastSwitchUser}
            />
          )
        )}

        {/* 2. Trang Đăng nhập & Đăng xuất Phân quyền Riêng Biệt (Dedicated Standalone LoginPage) */}
        {(activeTab === 'login' || activeTab === 'auth') && (
          <LoginPage
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onNavigateTab={setActiveTab}
            logoutMessage={logoutMessage}
          />
        )}

        {/* 3. Màn hình ERP Quản trị Kế toán Doanh Nghiệp (Có Sidebar Phân Hệ theo Vai Trò) */}
        {activeTab !== 'pos' && activeTab !== 'login' && activeTab !== 'auth' && (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Navigation Sidebar with role-filtered ERP screens */}
            <Sidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              unpaidInvoiceCount={unpaidInvoicesCount}
              lowStockCount={lowStockCount}
              pendingRequisitionsCount={requisitions.filter(r => r.status === 'PENDING').length}
              careRemindersCount={careReminders.filter(r => r.status === 'PENDING').length}
              employeeCount={employees.length}
              customerCount={customerCount}
              supplierCount={supplierCount}
              productCount={inventory.length}
              currentUser={currentUser}
              onLogout={handleLogout}
            />

            {/* Dynamic ERP Workspace with Strict Role Authorization */}
            <main className="flex-1 min-w-0 w-full">

              {/* Security Shield: If tab is not allowed for current role */}
              {!isTabAllowedForRole(currentUser?.role, activeTab) && (
                <AccessRestricted
                  currentUser={currentUser}
                  attemptedTab={activeTab}
                  onNavigateToAllowedTab={setActiveTab}
                  onFastSwitchUser={handleFastSwitchUser}
                />
              )}

              {/* 2. Màn hình Tổng quan */}
              {activeTab === 'dashboard' && isTabAllowedForRole(currentUser?.role, 'dashboard') && (
                <Dashboard
                  cashTransactions={cashTransactions}
                  periodFilter={periodFilter}
                  onOpenNewCashModal={(type) => setQuickCashModal({ open: true, type })}
                  onOpenNewInvoiceModal={(type) => setQuickInvoiceModal({ open: true, type })}
                  onNavigateTab={setActiveTab}
                />

              )}

              {/* 3. Màn hình Quản Lý Nhân Sự & Bảng Lương */}
              {activeTab === 'employees' && isTabAllowedForRole(currentUser?.role, 'employees') && (
                <EmployeesView
                  employees={employees}
                  invoices={invoices}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onOpenCashPayment={(amount, reason, recipient) => setQuickCashModal({ open: true, type: 'CASH_PAYMENT' })}
                />
              )}

              {/* 4. Màn hình Khách hàng */}
              {activeTab === 'customers' && isTabAllowedForRole(currentUser?.role, 'customers') && (
                <CustomersView
                  partners={partners}
                  invoices={invoices}
                  onAddPartner={handleAddPartner}
                  onUpdatePartner={handleUpdatePartner}
                  onDeletePartner={handleDeletePartner}
                  onNavigateToInvoice={() => setActiveTab('sales')}
                />
              )}

              {/* 4. Màn hình Nhà cung cấp */}
              {activeTab === 'suppliers' && isTabAllowedForRole(currentUser?.role, 'suppliers') && (
                <SuppliersView
                  partners={partners}
                  invoices={invoices}
                  onAddPartner={handleAddPartner}
                  onUpdatePartner={handleUpdatePartner}
                  onDeletePartner={handleDeletePartner}
                  onOpenQuickPayment={(supplier) => setQuickCashModal({ open: true, type: 'CASH_PAYMENT' })}
                />
              )}

              {/* 5. Màn hình Sản phẩm */}
              {activeTab === 'products' && isTabAllowedForRole(currentUser?.role, 'products') && (
                <ProductsView
                  inventory={inventory}
                  currentUser={currentUser}
                  onAddItem={handleAddInventoryItem}
                  onUpdateItem={handleUpdateInventoryItem}
                  onDeleteItem={handleDeleteInventoryItem}
                  onNavigateToCategories={() => setActiveTab('categories')}
                  onReloadProducts={() => {
                    ProductService.getAll().then(items => {
                      if (items && items.length > 0) setInventory(items);
                    });
                  }}
                />
              )}

              {/* 5.1. Màn hình Quản Lý Danh Mục & Nhóm Hàng */}
              {activeTab === 'categories' && isTabAllowedForRole(currentUser?.role, 'categories') && (
                <CategoriesView
                  currentUser={currentUser}
                  onSelectCategoryFilter={(_categoryName) => {
                    setActiveTab('products');
                  }}
                />
              )}

              {/* 6. Màn hình Bán hàng */}
              {activeTab === 'sales' && isTabAllowedForRole(currentUser?.role, 'sales') && (
                <SalesView
                  invoices={invoices}
                  partners={partners}
                  inventory={inventory}
                  onAddInvoice={handleAddInvoice}
                  onUpdatePayment={handleUpdateInvoicePayment}
                  onDeleteInvoice={handleDeleteInvoice}
                  onPrintInvoice={(inv) => setPrintDoc({ doc: inv, kind: 'INVOICE' })}
                />
              )}

              {/* 7. Màn hình Nhập hàng */}
              {activeTab === 'purchases' && isTabAllowedForRole(currentUser?.role, 'purchases') && (
                <PurchasesView
                  invoices={invoices}
                  partners={partners}
                  inventory={inventory}
                  onAddInvoice={handleAddInvoice}
                  onUpdatePayment={handleUpdateInvoicePayment}
                  onDeleteInvoice={handleDeleteInvoice}
                  onPrintInvoice={(inv) => setPrintDoc({ doc: inv, kind: 'INVOICE' })}
                />
              )}

              {/* 8. Màn hình Đề Xuất & Duyệt Nhập/Xuất Hàng (Purchasing & Sales Requisitions) */}
              {activeTab === 'requisitions' && isTabAllowedForRole(currentUser?.role, 'requisitions') && (
                <RequisitionsView
                  requisitions={requisitions}
                  inventory={inventory}
                  partners={partners}
                  currentUser={currentUser}
                  onSaveRequisition={handleSaveRequisition}
                  onDeleteRequisition={handleDeleteRequisition}
                  onApproveRequisition={handleApproveRequisition}
                  onRejectRequisition={handleRejectRequisition}
                  onConvertToPurchaseInvoice={handleConvertToPurchaseInvoice}
                  onConvertToStockImport={handleConvertToStockImport}
                  onNavigateTab={setActiveTab}
                />
              )}

              {/* 9. Màn hình Chăm Sóc Khách Hàng & Tư Vấn Bán Hàng (CRM & Stylist) */}
              {activeTab === 'crm' && isTabAllowedForRole(currentUser?.role, 'crm') && (
                <CustomerCareView
                  partners={partners}
                  inventory={inventory}
                  careLogs={careLogs}
                  careReminders={careReminders}
                  currentUser={currentUser}
                  onSaveCareLog={handleSaveCareLog}
                  onDeleteCareLog={handleDeleteCareLog}
                  onToggleReminderStatus={handleToggleReminderStatus}
                  onDeleteReminder={handleDeleteReminder}
                  onNavigateTab={setActiveTab}
                />
              )}

              {/* 10. Màn hình Kho */}
              {activeTab === 'inventory' && isTabAllowedForRole(currentUser?.role, 'inventory') && (
                <InventoryView
                  inventory={inventory}
                  inventoryLogs={inventoryLogs}
                  partners={partners}
                  currentUser={currentUser}
                  onAddItem={handleAddInventoryItem}
                  onDeleteItem={handleDeleteInventoryItem}
                  onAddStockVoucher={handleAddStockVoucher}
                  onDeleteStockVoucher={handleDeleteStockVoucher}
                  onPrintStockVoucher={handlePrintStockVoucher}
                  onNavigateToRequisitions={() => setActiveTab('requisitions')}
                  onRefreshInventory={() => {
                    ProductService.getAll().then(items => {
                      if (items && items.length > 0) setInventory(items);
                    });
                    InventoryService.getLogs().then(res => {
                      if (res?.logs && res.logs.length > 0) setInventoryLogs(res.logs);
                    });
                  }}
                />
              )}

              {/* 9. Màn hình Sổ quỹ */}
              {activeTab === 'cashbook' && isTabAllowedForRole(currentUser?.role, 'cashbook') && (
                <CashBookView
                  transactions={cashTransactions}
                  partners={partners}
                  accounts={accounts}
                  onAddTransaction={handleAddCashTransaction}
                  onDeleteTransaction={handleDeleteCashTransaction}
                  onPrintVoucher={(t) => setPrintDoc({ doc: t, kind: 'CASH' })}
                />
              )}

              {/* 10. Màn hình Công nợ */}
              {activeTab === 'debts' && isTabAllowedForRole(currentUser?.role, 'debts') && (
                <DebtsView
                  partners={partners}
                  invoices={invoices}
                  cashTransactions={cashTransactions}
                  onAddPartner={handleAddPartner}
                  onOpenQuickCash={(type) => setQuickCashModal({ open: true, type })}
                />
              )}

              {/* 11. Màn hình Báo cáo */}
              {activeTab === 'reports' && isTabAllowedForRole(currentUser?.role, 'reports') && (
                <ReportsView
                  companyInfo={companyInfo}
                  accounts={accounts}
                  journalEntries={journalEntries}
                  invoices={invoices}
                  cashTransactions={cashTransactions}
                  inventory={inventory}
                  employees={employees}
                  partners={partners}
                  periodFilter={periodFilter}
                  currentUser={currentUser}
                  onPrintReport={() => window.print()}
                />
              )}

              {/* 12. Màn hình Nhật ký chung */}
              {activeTab === 'journal' && isTabAllowedForRole(currentUser?.role, 'journal') && (
                <JournalView
                  journalEntries={journalEntries}
                  accounts={accounts}
                  onAddJournalEntry={handleAddJournalEntry}
                  onDeleteJournalEntry={handleDeleteJournalEntry}
                />
              )}

              {/* 13. Màn hình Hệ thống tài khoản */}
              {activeTab === 'accounts' && isTabAllowedForRole(currentUser?.role, 'accounts') && (
                <AccountsView
                  accounts={accounts}
                  journalEntries={journalEntries}
                  onOpenAccountLedger={() => setActiveTab('journal')}
                />
              )}
            </main>
          </div>
        )}

      </div>

      {/* Global AI Assistant Gemini Modal */}
      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        companyInfo={companyInfo}
        contextData={{
          totalCashTransactions: cashTransactions.length,
          totalInvoices: invoices.length,
          companyInfo,
        }}
      />

      {/* Company Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        companyInfo={companyInfo}
        onSaveCompanyInfo={setCompanyInfo}
        onExportBackup={StorageService.exportFullBackupJSON}
        onImportBackup={StorageService.importBackupJSON}
        onResetToDefaults={StorageService.resetToDefaults}
      />

      {/* Print Preview Modal */}
      <PrintDocumentModal
        isOpen={Boolean(printDoc.doc)}
        onClose={() => setPrintDoc({ doc: null, kind: 'CASH' })}
        document={printDoc.doc}
        documentKind={printDoc.kind}
        companyInfo={companyInfo}
      />

      {/* Quick Cash Transaction Modal */}
      <TransactionModal
        isOpen={quickCashModal.open}
        onClose={() => setQuickCashModal({ ...quickCashModal, open: false })}
        onSave={handleAddCashTransaction}
        partners={partners}
        accounts={accounts}
        initialType={quickCashModal.type}
      />

      {/* Quick Invoice Modal */}
      <InvoiceModal
        isOpen={quickInvoiceModal.open}
        onClose={() => setQuickInvoiceModal({ ...quickInvoiceModal, open: false })}
        onSave={handleAddInvoice}
        partners={partners}
        inventory={inventory}
        initialType={quickInvoiceModal.type}
      />

      {/* ================= WORKSTATION LOCK SCREEN OVERLAY ================= */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-white shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 text-amber-400">
              <span className="text-3xl">🔒</span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/60">
                TRẠM NỘI BỘ ĐANG TẠM KHÓA
              </span>
              <h2 className="text-xl font-bold text-white mt-2">
                {currentUser?.name || 'Nhân Sự Nội Bộ'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {currentUser?.roleTitle || 'Đang bảo vệ dữ liệu ca làm việc'}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Simple PIN / Password validation (any pin or 123456)
                if (unlockPassword.length > 0) {
                  setIsScreenLocked(false);
                  setUnlockPassword('');
                  setUnlockError(false);
                } else {
                  setUnlockError(true);
                }
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nhập Mật Khẩu / Mã PIN Để Mở Khóa:
                </label>
                <input
                  type="password"
                  autoFocus
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Nhập mã PIN hoặc mật khẩu..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {unlockError && (
                <p className="text-[11px] text-rose-400 text-center font-semibold">
                  Vui lòng nhập mật khẩu hoặc mã PIN!
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Mở Khóa Màn Hình
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsScreenLocked(false);
                    handleLogout();
                  }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
                >
                  Đăng Xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FIXED BOTTOM INTERNAL WORKSTATION STATUS BAR (DESKTOP) ================= */}
      <footer className="hidden md:flex fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 text-slate-300 text-[11px] px-4 py-1.5 items-center justify-between gap-2 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Trạm Làm Việc: <strong>{currentUser ? currentUser.name : 'Chưa đăng nhập'}</strong></span>
            {currentUser && (
              <span className="text-[10px] bg-slate-800 text-pink-300 px-2 py-0.5 rounded border border-slate-700">
                {currentUser.roleTitle.split('(')[0]}
              </span>
            )}
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">
            📍 {currentUser?.branch || 'Showroom 120 Phố Huế, Q. Hai Bà Trưng, Hà Nội'}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400 flex-wrap">
          <span className="text-emerald-400 font-sans">● Máy In Bill POS: Sẵn Sàng</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">Phím tắt:</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-300 border border-slate-700">[F1] AI Trợ Lý</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-300 border border-slate-700">[F2] Thu Ngân POS</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-pink-300 border border-slate-700">[F3] Đề Xuất</span>
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 border border-slate-700">[F4] Khóa Máy</span>
        </div>
      </footer>

      {/* ================= SMART MOBILE BOTTOM NAVIGATION BAR ================= */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        unpaidInvoiceCount={unpaidInvoicesCount}
        lowStockCount={lowStockCount}
        pendingRequisitionsCount={requisitions.filter(r => r.status === 'PENDING').length}
        careRemindersCount={careReminders.filter(r => r.status === 'PENDING').length}
        currentUser={currentUser}
      />

      {/* ================= SLIDE-IN MOBILE ERP DRAWER ================= */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onFastSwitchUser={handleFastSwitchUser}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportBackup={StorageService.exportFullBackupJSON}
        onLockScreen={() => setIsScreenLocked(true)}
        unpaidInvoiceCount={unpaidInvoicesCount}
        lowStockCount={lowStockCount}
        pendingRequisitionsCount={requisitions.filter(r => r.status === 'PENDING').length}
        careRemindersCount={careReminders.filter(r => r.status === 'PENDING').length}
        employeeCount={employees.length}
        customerCount={customerCount}
        supplierCount={supplierCount}
        productCount={inventory.length}
      />

      {/* ================= MODAL ĐỔI MẬT KHẨU TÀI KHOẢN (PHASE 8.1) ================= */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

    </div>
  );
}
