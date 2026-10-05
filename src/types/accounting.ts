export type AccountingStandard = 'TT133' | 'TT200';

export interface CompanyInfo {
  name: string;
  taxCode: string;
  address: string;
  phone: string;
  email: string;
  bankAccount: string;
  bankName: string;
  directorName: string;
  chiefAccountant: string;
  treasurerName: string;
  accountingStandard: AccountingStandard;
  fiscalYear: number;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'OFF_BALANCE';

export interface Account {
  code: string;
  name: string;
  parentCode?: string;
  type: AccountType;
  level: number;
  isDetail: boolean; // Có thể hạch toán trực tiếp hay chỉ là TK tổng hợp
  openingDebit: number; // Dư Nợ đầu kỳ
  openingCredit: number; // Dư Có đầu kỳ
  description?: string;
}

export type TransactionType = 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL';
export type CashTransactionCategory = 'GENERAL' | 'CUSTOMER_DEBT_COLLECTION' | 'SUPPLIER_DEBT_PAYMENT';

export interface CashTransaction {
  id: string;
  code: string; // PT001, PC001, UNC001, PTN001, PCN001...
  date: string;
  type: TransactionType;
  category?: CashTransactionCategory; // Phân biệt Thu nợ KH / Trả nợ NCC / Thu chi thường
  personName: string;
  personAddress?: string;
  reason: string;
  amount: number;
  oppositeAccountCode: string; // TK đối ứng (VD: 511, 131, 331, 642)
  fundAccountCode: string; // TK Quỹ (1111, 1121)
  invoiceRef?: string;
  invoiceId?: string;
  partnerId?: string; // Khách hàng hoặc Nhà cung cấp
  partnerName?: string;
  createdByName: string;
  note?: string;
}

export type InvoiceType = 'SALES' | 'PURCHASE';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountRate: number; // %
  discountAmount: number;
  vatRate: number; // 0, 5, 8, 10
  vatAmount: number;
  totalAmount: number; // = (SoLuong * DonGia - ChietKhau) * (1 + VAT/100)
}

export interface Invoice {
  id: string;
  code: string; // HD001, HDM001
  invoiceSymbol?: string; // K24T
  date: string;
  dueDate?: string;
  type: InvoiceType;
  partnerId: string;
  partnerName: string;
  partnerTaxCode?: string;
  partnerAddress?: string;
  items: InvoiceItem[];
  subtotal: number; // Tổng tiền chưa VAT
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  note?: string;
  createdBy?: string;
  createdByName?: string;
  employeeName?: string;
}

export type PartnerType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export type CustomerTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'STANDARD' | 'WHOLESALE';

export interface Partner {
  id: string;
  code: string; // KH001, NCC001
  name: string;
  type: PartnerType;
  taxCode: string;
  phone: string;
  address: string;
  email?: string;
  tier?: CustomerTier; // VIP Diamond, Gold, Silver...
  creditLimit?: number; // Hạn mức công nợ (VND)
  bankAccount?: string; // STK nhà cung cấp
  bankName?: string;
  openingDebtDebit: number; // Nợ đầu kỳ phải thu (131)
  openingDebtCredit: number; // Nợ đầu kỳ phải trả (331)
  currentDebt?: number; // Công nợ hiện tại
  notes?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  productCount?: number;
}

export interface InventoryItem {
  id: string;
  code: string; // SP001, VT001
  name: string;
  unit: string; // Cái, Chiếc, Bộ, Đôi...
  category: string; // Đầm & Váy, Áo Sơ Mi, Quần Jeans, Blazer, Phụ Kiện...
  categoryId?: string; // ID tham chiếu bảng categories trong DB SQLite
  size?: string; // S, M, L, XL, FreeSize
  color?: string; // Trắng, Đen, Kem, Xanh, Hồng Pastel...
  barcode?: string;
  imageUrl?: string;
  costPrice: number; // Giá vốn (TK 156)
  sellingPrice: number; // Giá bán niêm yết
  openingQuantity: number; // Tồn thực tế
  openingValue: number; // Giá trị tồn
  minStockLevel: number; // Định mức tồn tối thiểu
  description?: string;
}

export type UserRole = 
  | 'DIRECTOR' 
  | 'CHIEF_ACCOUNTANT' 
  | 'WAREHOUSE_MANAGER' 
  | 'SALES_CASHIER' 
  | 'PURCHASING_STAFF' 
  | 'SALES_STAFF' 
  | 'STAFF';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  email: string;
  phone: string;
  avatar: string;
  branch: string;
}

export type EmployeeDepartment = 'SALES_POS' | 'PURCHASING' | 'ACCOUNTING' | 'WAREHOUSE' | 'MANAGEMENT' | 'MARKETING_DESIGN';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface Employee {
  id: string;
  code: string; // NV001, NV002...
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthday?: string;
  idCardNumber?: string; // CCCD / CMND
  phone: string;
  email: string;
  address?: string;
  department: EmployeeDepartment;
  position: string; // Cửa Hàng Trưởng, Thu Ngân POS, Chuyên Viên Tư Vấn, Nhân Viên Mua Hàng, Kế Toán...
  role: UserRole;
  branch: string; // Showroom Phố Huế, Tổng kho Tân Bình...
  avatar?: string;
  startDate: string; // Ngày vào làm
  baseSalary: number; // Lương cơ bản (VND)
  allowance: number; // Phụ cấp ăn trưa / xăng xe
  commissionRate: number; // % Hoa hồng bán hàng (VD: 1.5%)
  insuranceSalary?: number; // Mức đóng BHXH
  bankAccount?: string; // STK nhận lương
  bankName?: string;
  status: EmployeeStatus; // Đang làm việc / Tạm nghỉ / Đã nghỉ
  username?: string; // Tài khoản đăng nhập hệ thống
  notes?: string;
}

export type InventoryMovementType = 'IMPORT' | 'EXPORT';

export interface InventoryLogItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface InventoryLog {
  id: string;
  code: string; // PN001, PX001
  date: string;
  type: InventoryMovementType;
  invoiceRef?: string;
  partnerId?: string;
  partnerName?: string;
  delivererOrReceiver?: string; // Họ tên người giao/nhận hàng
  warehouseName?: string; // Kho Thời Trang D&D (TK 156)
  stockAccountCode?: string; // TK 156, 152
  oppositeAccountCode?: string; // TK 331, 111, 112, 632
  items: InventoryLogItem[];
  totalValue: number;
  note?: string;
}

// ==================== PHIẾU YÊU CẦU / ĐỀ XUẤT NHẬP & XUẤT HÀNG ====================
export type RequisitionType = 'IMPORT_REQUEST' | 'EXPORT_REQUEST';
export type RequisitionUrgency = 'NORMAL' | 'HIGH' | 'URGENT';
export type RequisitionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface RequisitionItem {
  id: string;
  itemId?: string;
  itemCode: string;
  itemName: string;
  category?: string;
  size?: string;
  color?: string;
  unit: string;
  currentStock: number;
  requestedQty: number;
  approvedQty?: number;
  estimatedUnitPrice: number;
  totalEstimated: number;
  note?: string;
}

export interface StockRequisition {
  id: string;
  code: string; // YCN001, YCX001
  date: string;
  type: RequisitionType;
  urgency: RequisitionUrgency;
  reason: string; // Lý do: Hết tồn kho, Khách đặt riêng, Nhập mẫu mới BST...
  requesterId: string;
  requesterName: string;
  requesterRole: string; // Nhân viên Mua Hàng / Nhân viên Bán Hàng / Thu ngân
  department: string;
  suggestedSupplierId?: string;
  suggestedSupplierName?: string;
  items: RequisitionItem[];
  totalEstimatedAmount: number;
  status: RequisitionStatus;
  approverId?: string;
  approverName?: string;
  approvalDate?: string;
  approvalNotes?: string;
  createdDocumentRef?: string; // Mã HDM001 hoặc PN001 sau khi chuyển thành đơn mua
  notes?: string;
}

// ==================== CHĂM SÓC KHÁCH HÀNG & TƯ VẤN THỜI TRANG (CRM) ====================
export type BodyShape = 'HOURGLASS' | 'PEAR' | 'RECTANGLE' | 'INVERTED_TRIANGLE' | 'APPLE';
export type CustomerCareChannel = 'SHOWROOM' | 'PHONE' | 'ZALO' | 'FACEBOOK' | 'OTHER';
export type CareStatus = 'CONSULTING' | 'ORDER_PLACED' | 'FOLLOW_UP' | 'APPOINTMENT_SCHEDULED' | 'RESOLVED';
export type CarePriority = 'HOT' | 'WARM' | 'COLD';

export interface BodyConsultationData {
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bodyShape?: BodyShape;
  recommendedSize?: string;
  stylePreferences?: string[]; // Công sở, Dạ hội, Dạo phố, Tối giản, Sang trọng...
  styleNotes?: string;
}

export interface CustomerCareLog {
  id: string;
  date: string;
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  staffId: string;
  staffName: string;
  channel: CustomerCareChannel;
  purpose: string; // Tư vấn chọn đầm dự tiệc, Đo size & thử đồ, Chăm sóc sau mua, Hỗ trợ chỉnh sửa form dáng...
  bodyConsultation?: BodyConsultationData;
  customerFeedback?: string;
  actionTaken: string; // Đã gợi ý Đầm Silk Dạ hội đỏ Size M, đã tặng voucher 10%...
  nextAppointmentDate?: string;
  status: CareStatus;
  priority: CarePriority;
  satisfactionRating?: number; // 1 to 5 sao
  notes?: string;
}

export interface CareReminder {
  id: string;
  type: 'BIRTHDAY' | 'INACTIVE_VIP' | 'POST_PURCHASE_FOLLOWUP' | 'GARMENT_ALTERATION';
  title: string;
  description: string;
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  dueDate: string;
  status: 'PENDING' | 'DONE';
  voucherCode?: string;
}

export type PrintDocumentType = 'CASH' | 'INVOICE' | 'STOCK_IMPORT' | 'STOCK_EXPORT';

export interface JournalDetail {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}

export interface JournalEntry {
  id: string;
  code: string; // BTT001
  date: string;
  description: string;
  details: JournalDetail[];
  documentRef?: string; // Mã phiếu thu/chi/hóa đơn tương ứng
  documentType?: 'CASH' | 'INVOICE' | 'INVENTORY' | 'MANUAL';
  createdAt: string;
}

export type FilterPeriod = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';

export interface PeriodFilter {
  period: FilterPeriod;
  startDate?: string;
  endDate?: string;
}
