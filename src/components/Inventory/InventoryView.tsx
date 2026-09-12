import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Printer,
  PackagePlus,
  PackageMinus,
  FileSpreadsheet,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Sliders,
  History,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { InventoryItem, InventoryLog, Partner, AuthUser } from '../../types/accounting';
import { formatCurrency, formatNumber, downloadCSV, formatDate } from '../../utils/formatters';
import { ItemModal } from './ItemModal';
import { StockVoucherModal } from './StockVoucherModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { canUserViewCostPrice, canUserManageStockVouchers, ROLE_CONFIGS } from '../../utils/rbac';
import { InventoryService, InventoryProduct, InventoryMovement, InventorySummary } from '../../services/inventoryService';

interface InventoryViewProps {
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  partners: Partner[];
  currentUser?: AuthUser | null;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onAddStockVoucher: (voucher: Omit<InventoryLog, 'id'>, andPrint?: boolean) => void;
  onDeleteStockVoucher: (id: string) => void;
  onPrintStockVoucher: (voucher: InventoryLog) => void;
  onNavigateToRequisitions?: () => void;
  onRefreshInventory?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  inventoryLogs,
  partners,
  currentUser,
  onAddItem,
  onDeleteItem,
  onAddStockVoucher,
  onDeleteStockVoucher,
  onPrintStockVoucher,
  onNavigateToRequisitions,
  onRefreshInventory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY' | 'IMPORT_VOUCHERS' | 'EXPORT_VOUCHERS'>('STOCK');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalType, setVoucherModalType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<InventoryProduct | null>(null);

  // Live Database State
  const [dbProducts, setDbProducts] = useState<InventoryProduct[]>([]);
  const [dbSummary, setDbSummary] = useState<InventorySummary | null>(null);
  const [dbMovements, setDbMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const canViewCost = canUserViewCostPrice(currentUser);
  const canManageVouchers = canUserManageStockVouchers(currentUser);
  const userRole = currentUser?.role || 'DIRECTOR';
  const roleConfig = ROLE_CONFIGS[userRole] || ROLE_CONFIGS.STAFF;

  // Tải dữ liệu tồn kho thực tế từ SQLite REST API
  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      const [prods, sum, logsRes] = await Promise.all([
        InventoryService.getAll(),
        InventoryService.getSummary(),
        InventoryService.getLogs()
      ]);
      if (prods) setDbProducts(prods);
      if (sum) setDbSummary(sum);
      if (logsRes?.movements) setDbMovements(logsRes.movements);
    } catch (err) {
      console.warn('Không thể tải trực tiếp từ /api/inventory, dùng fallback props:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Danh sách sản phẩm kết hợp DB và props fallback
  const displayProducts: InventoryProduct[] = useMemo(() => {
    if (dbProducts.length > 0) {
      return dbProducts;
    }
    return inventory.map(item => {
      const stock = item.openingQuantity ?? 0;
      const min = item.minStockLevel ?? 5;
      let status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' = 'IN_STOCK';
      let statusText = 'Còn hàng';
      if (stock === 0) {
        status = 'OUT_OF_STOCK';
        statusText = 'Hết hàng';
      } else if (stock <= min) {
        status = 'LOW_STOCK';
        statusText = 'Sắp hết';
      }
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        category: item.category,
        categoryId: item.categoryId,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        currentStock: stock,
        openingQuantity: stock,
        inventoryValue: stock * item.costPrice,
        minStockLevel: min,
        status,
        statusText,
        description: item.description
      };
    });
  }, [dbProducts, inventory]);

  // Danh sách các danh mục duy nhất để populate bộ lọc
  const categories = useMemo(() => {
    const set = new Set<string>();
    displayProducts.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [displayProducts]);

  // Bộ lọc sản phẩm theo search, category và status
  const filteredProducts = useMemo(() => {
    return displayProducts.filter(item => {
      const matchesSearch = 
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = 
        selectedCategory === 'ALL' || 
        item.category === selectedCategory || 
        item.categoryId === selectedCategory;

      const matchesStatus = 
        selectedStatus === 'ALL' || 
        item.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [displayProducts, searchTerm, selectedCategory, selectedStatus]);

  // Bộ lọc lịch sử nhập xuất
  const filteredMovements = useMemo(() => {
    return dbMovements.filter(m => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        m.itemCode.toLowerCase().includes(s) ||
        m.itemName.toLowerCase().includes(s) ||
        m.logCode.toLowerCase().includes(s) ||
        (m.invoiceRef && m.invoiceRef.toLowerCase().includes(s)) ||
        (m.note && m.note.toLowerCase().includes(s))
      );
    });
  }, [dbMovements, searchTerm]);

  // Tính toán KPI Tổng quan kho
  const totalSkus = dbSummary?.totalSkus ?? displayProducts.length;
  const totalStockQuantity = dbSummary?.totalStockQuantity ?? displayProducts.reduce((sum, item) => sum + (item.currentStock ?? item.openingQuantity ?? 0), 0);
  const totalInventoryValue = dbSummary?.totalInventoryValue ?? displayProducts.reduce((sum, item) => sum + ((item.currentStock ?? item.openingQuantity ?? 0) * item.costPrice), 0);
  const outOfStockCount = dbSummary?.zeroStockCount ?? displayProducts.filter(i => (i.currentStock ?? i.openingQuantity ?? 0) === 0).length;
  const lowStockCount = dbSummary?.lowStockCount ?? displayProducts.filter(i => {
    const s = i.currentStock ?? i.openingQuantity ?? 0;
    return s > 0 && s <= (i.minStockLevel ?? 5);
  }).length;
  const inStockCount = dbSummary?.inStockCount ?? displayProducts.filter(i => (i.currentStock ?? i.openingQuantity ?? 0) > (i.minStockLevel ?? 5)).length;

  const importLogs = inventoryLogs.filter(log => log.type === 'IMPORT');
  const exportLogs = inventoryLogs.filter(log => log.type === 'EXPORT');

  const filteredImportLogs = importLogs.filter(log =>
    log.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.partnerName && log.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.note && log.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredExportLogs = exportLogs.filter(log =>
    log.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.partnerName && log.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.note && log.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenVoucherModal = (type: 'IMPORT' | 'EXPORT') => {
    setVoucherModalType(type);
    setIsVoucherModalOpen(true);
  };

  const handleOpenAdjustModal = (product?: InventoryProduct) => {
    setSelectedAdjustProduct(product || null);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSuccess = (updatedProd: any) => {
    setSuccessToast(`Đã điều chỉnh tồn kho cho ${updatedProd.name} thành ${updatedProd.currentStock} sản phẩm.`);
    setTimeout(() => setSuccessToast(null), 4000);
    loadInventoryData();
    if (onRefreshInventory) onRefreshInventory();
  };

  const handleExportCSV = () => {
    if (activeTab === 'STOCK') {
      const headers = ['Mã Sản Phẩm', 'Tên Sản Phẩm Thời Trang', 'ĐVT', 'Nhóm Thời Trang', 'Giá Bán (VNĐ)'];
      if (canViewCost) {
        headers.push('Giá Nhập (VNĐ)', 'Tổng Giá Trị Tồn Kho');
      }
      headers.push('Số Lượng Tồn Kho', 'Trạng Thái');
      const rows = filteredProducts.map(i => {
        const row: any[] = [
          i.code,
          i.name,
          i.unit,
          i.category || '',
          i.sellingPrice
        ];
        if (canViewCost) {
          row.push(i.costPrice, (i.currentStock ?? i.openingQuantity ?? 0) * i.costPrice);
        }
        row.push(i.currentStock ?? i.openingQuantity ?? 0, i.statusText);
        return row;
      });
      downloadCSV('BaoCaoTonKho_DND_Fashion.csv', [headers, ...rows]);
    } else if (activeTab === 'HISTORY') {
      const headers = ['Thời Gian', 'Mã SKU', 'Tên Sản Phẩm', 'Loại Giao Dịch', 'Số Lượng', 'Tồn Trước', 'Tồn Sau', 'Người Thực Hiện', 'Tham Chiếu', 'Diễn Giải'];
      const rows = filteredMovements.map(m => [
        formatDate(m.date),
        m.itemCode,
        m.itemName,
        m.transactionType,
        m.movementType === 'EXPORT' ? `-${m.quantity}` : `+${m.quantity}`,
        m.stockBefore,
        m.stockAfter,
        m.operator,
        m.invoiceRef || m.logCode,
        m.note || ''
      ]);
      downloadCSV('LichSuNhapXuatKho_DND.csv', [headers, ...rows]);
    } else if (activeTab === 'IMPORT_VOUCHERS') {
      const headers = ['Số Phiếu Nhập', 'Ngày Nhập', 'Nhà Cung Cấp / Xưởng', 'Kho Nhập', 'Diễn Giải', 'Tổng Tiền Nhập (VNĐ)'];
      const rows = filteredImportLogs.map(l => [
        l.code,
        formatDate(l.date),
        l.partnerName || '-',
        l.warehouseName || 'Kho D&D',
        l.note || '',
        l.totalValue
      ]);
      downloadCSV('DanhSachPhieuNhapKho_DND.csv', [headers, ...rows]);
    } else {
      const headers = ['Số Phiếu Xuất', 'Ngày Xuất', 'Khách Hàng / Showroom', 'Kho Xuất', 'Lý Do Xuất', 'Tổng Giá Vốn (VNĐ)'];
      const rows = filteredExportLogs.map(l => [
        l.code,
        formatDate(l.date),
        l.partnerName || '-',
        l.warehouseName || 'Kho D&D',
        l.note || '',
        l.totalValue
      ]);
      downloadCSV('DanhSachPhieuXuatKho_DND.csv', [headers, ...rows]);
    }
  };

  return (
    <div id="inventory-view" className="space-y-5 pb-8 animate-fadeIn">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-pink-100 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#ffe5ec] text-[#a93054] rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#181a2e]">
                Kho Hàng & Phiếu Nhập Xuất
              </h2>
              <p className="text-xs text-[#6c595f] mt-0.5">
                {canManageVouchers
                  ? 'Quản lý tồn kho thực tế SQLite, điều chỉnh kiểm kê, tra cứu thẻ kho & lập phiếu xuất nhập'
                  : 'Tra cứu tồn kho thực tế, kiểm tra số lượng size/màu & lập đề xuất khi hàng sắp hết'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons - Role Aware */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadInventoryData}
            className="flex items-center gap-1.5 bg-[#fbf8ff] hover:bg-pink-50 text-[#a93054] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
            title="Làm mới dữ liệu từ SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Đồng Bộ Kho</span>
          </button>

          {canManageVouchers && (
            <>
              <button
                id="btn-open-adjust-modal"
                onClick={() => handleOpenAdjustModal()}
                className="flex items-center gap-1.5 bg-[#f4f2ff] hover:bg-[#edecff] text-[#a93054] font-bold text-xs px-3.5 py-2 rounded-xl border border-pink-200 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Sliders className="w-4 h-4 text-[#a93054]" />
                <span>Điều Chỉnh Tồn Kho</span>
              </button>

              <button
                id="btn-create-import-voucher"
                onClick={() => handleOpenVoucherModal('IMPORT')}
                className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ Lập Phiếu Nhập Kho</span>
              </button>

              <button
                id="btn-create-export-voucher"
                onClick={() => handleOpenVoucherModal('EXPORT')}
                className="flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <PackageMinus className="w-4 h-4" />
                <span>+ Lập Phiếu Xuất Kho</span>
              </button>

              {roleConfig.canEditProducts && (
                <button
                  onClick={() => setIsItemModalOpen(true)}
                  className="flex items-center gap-1.5 bg-white hover:bg-[#fbf8ff] text-[#181a2e] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#a93054]" />
                  <span>Thêm Sản Phẩm</span>
                </button>
              )}
            </>
          )}

          {(!canManageVouchers && onNavigateToRequisitions) && (
            <button
              onClick={onNavigateToRequisitions}
              className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>+ Đề Xuất Nhập Mẫu Hết Hàng</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-[#fbf8ff] text-[#4e4447] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. TỔNG QUAN KHO - 6 KPI Cards Chính Xác Từ SQLite Database */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Tổng số mã sản phẩm */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">Tổng Số Mã SKU</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-[#181a2e] mt-2 font-mono">
            {totalSkus} <span className="text-[10px] font-sans text-slate-500 font-normal">mã</span>
          </div>
          <p className="text-[10px] text-[#6c595f] mt-0.5">Mẫu mã toàn hệ thống</p>
        </div>

        {/* KPI 2: Tổng số lượng tồn */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">Tổng Số Lượng Tồn</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-indigo-700 mt-2 font-mono">
            {formatNumber(totalStockQuantity)} <span className="text-[10px] font-sans text-slate-500 font-normal">sp</span>
          </div>
          <p className="text-[10px] text-[#6c595f] mt-0.5">SUM(current_stock)</p>
        </div>

        {/* KPI 3: Số sản phẩm còn hàng */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">Còn Hàng An Toàn</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-2 font-mono">
            {inStockCount} <span className="text-[10px] font-sans text-slate-500 font-normal">mã</span>
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5">&gt; Định mức an toàn</p>
        </div>

        {/* KPI 4: Số sản phẩm sắp hết */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">Sản Phẩm Sắp Hết</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-lg font-bold mt-2 font-mono ${lowStockCount > 0 ? 'text-amber-600' : 'text-[#181a2e]'}`}>
            {lowStockCount} <span className="text-[10px] font-sans text-slate-500 font-normal">mã</span>
          </div>
          <p className="text-[10px] text-amber-600 mt-0.5">≤ Tồn tối thiểu</p>
        </div>

        {/* KPI 5: Số sản phẩm hết hàng */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">Hết Hàng (Tồn = 0)</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className={`text-lg font-bold mt-2 font-mono ${outOfStockCount > 0 ? 'text-rose-600' : 'text-[#181a2e]'}`}>
            {outOfStockCount} <span className="text-[10px] font-sans text-slate-500 font-normal">mã</span>
          </div>
          <p className="text-[10px] text-rose-600 mt-0.5">Cần bổ sung gấp</p>
        </div>

        {/* KPI 6: Tổng giá trị tồn kho */}
        <div className="bg-white border border-pink-100 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6c595f]">
              {canViewCost ? 'Giá Trị Tồn (TK 156)' : 'Tổng Sản Phẩm'}
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-purple-700 mt-2 truncate">
            {canViewCost ? formatCurrency(totalInventoryValue) : `${formatNumber(totalStockQuantity)} sp`}
          </div>
          <p className="text-[10px] text-[#6c595f] mt-0.5">
            {canViewCost ? 'Giá vốn tồn kho' : 'Sẵn sàng phục vụ POS'}
          </p>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 pb-2">
        <div className="flex gap-1.5 p-1 bg-[#f4f2ff] rounded-xl text-xs font-semibold">
          <button
            id="tab-btn-stock"
            onClick={() => setActiveTab('STOCK')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'STOCK'
                ? 'bg-white text-[#a93054] shadow-xs font-bold'
                : 'text-[#4e4447] hover:text-[#181a2e]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kho Hàng & Tồn Kho ({filteredProducts.length})</span>
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-white text-[#a93054] shadow-xs font-bold'
                : 'text-[#4e4447] hover:text-[#181a2e]'
            }`}
          >
            <History className="w-4 h-4 text-[#a93054]" />
            <span>Lịch Sử Nhập Xuất Kho ({dbMovements.length})</span>
          </button>

          {(canManageVouchers || userRole === 'CHIEF_ACCOUNTANT') && (
            <>
              <button
                id="tab-btn-import-vouchers"
                onClick={() => setActiveTab('IMPORT_VOUCHERS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
                  activeTab === 'IMPORT_VOUCHERS'
                    ? 'bg-white text-[#fb6f92] shadow-xs font-bold'
                    : 'text-[#4e4447] hover:text-[#181a2e]'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-[#fb6f92]" />
                <span>Phiếu Nhập ({importLogs.length})</span>
              </button>

              <button
                id="tab-btn-export-vouchers"
                onClick={() => setActiveTab('EXPORT_VOUCHERS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
                  activeTab === 'EXPORT_VOUCHERS'
                    ? 'bg-white text-[#a93054] shadow-xs font-bold'
                    : 'text-[#4e4447] hover:text-[#181a2e]'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-[#a93054]" />
                <span>Phiếu Xuất ({exportLogs.length})</span>
              </button>
            </>
          )}
        </div>

        {/* 8 & 9. SEARCH & CATEGORY FILTER & STATUS FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Category Filter Dropdown */}
          {activeTab === 'STOCK' && (
            <div className="flex items-center gap-1 bg-white border border-pink-200 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-xs text-[#181a2e] focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">Tất cả danh mục ({displayProducts.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter Tabs (Chỉ cho Tab Stock) */}
          {activeTab === 'STOCK' && (
            <div className="flex items-center bg-[#fbf8ff] border border-pink-200 rounded-xl p-0.5 text-[11px] font-medium">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'ALL' ? 'bg-white text-[#a93054] font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedStatus('IN_STOCK')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'IN_STOCK' ? 'bg-emerald-50 text-emerald-800 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Còn hàng
              </button>
              <button
                onClick={() => setSelectedStatus('LOW_STOCK')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'LOW_STOCK' ? 'bg-amber-50 text-amber-800 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Sắp hết
              </button>
              <button
                onClick={() => setSelectedStatus('OUT_OF_STOCK')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatus === 'OUT_OF_STOCK' ? 'bg-rose-50 text-rose-800 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                Hết hàng
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-inventory"
              type="text"
              placeholder={
                activeTab === 'STOCK'
                  ? 'Tìm mã SP, tên áo, váy, đầm...'
                  : activeTab === 'HISTORY'
                  ? 'Tìm mã SP, số phiếu, lý do...'
                  : activeTab === 'IMPORT_VOUCHERS'
                  ? 'Tìm số phiếu nhập, NCC...'
                  : 'Tìm số phiếu xuất, người nhận...'
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-pink-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92]"
            />
          </div>
        </div>
      </div>

      {/* 1. HIỂN THỊ TỒN KHO - Tab 1: Kho Hàng & Tồn Kho Thực Tế */}
      {activeTab === 'STOCK' && (
        <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
                <tr>
                  <th className="py-3 px-4">Mã Sản Phẩm</th>
                  <th className="py-3 px-4">Tên Sản Phẩm Thời Trang</th>
                  <th className="py-3 px-4 text-center">ĐVT</th>
                  <th className="py-3 px-4">Danh Mục</th>
                  {canViewCost && (
                    <th className="py-3 px-4 text-right">Giá Nhập (TK 156)</th>
                  )}
                  <th className="py-3 px-4 text-right">Giá Bán Niêm Yết</th>
                  <th className="py-3 px-4 text-right">Tồn Kho</th>
                  {canViewCost && (
                    <th className="py-3 px-4 text-right">Giá Trị Tồn</th>
                  )}
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  {canManageVouchers && (
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={canViewCost ? 10 : 8} className="py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      Không tìm thấy sản phẩm thời trang nào phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item) => {
                    const currentStock = item.currentStock ?? item.openingQuantity ?? 0;
                    const minStock = item.minStockLevel ?? 5;
                    const isOutOfStock = currentStock === 0;
                    const isLowStock = currentStock > 0 && currentStock <= minStock;

                    return (
                      <tr key={item.id} className="hover:bg-[#fbf8ff] transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                          {item.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#181a2e]">{item.name}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-400 line-clamp-1">{item.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-[#6c595f]">{item.unit}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-pink-50 text-[#a93054] text-[11px] font-medium border border-pink-100">
                            {item.category || 'Thời trang D&D'}
                          </span>
                        </td>
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono text-[#6c595f]">
                            {formatCurrency(item.costPrice)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#a93054]">
                          {formatCurrency(item.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#181a2e]">
                          <span className={`text-sm ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600 font-extrabold' : 'text-emerald-700'}`}>
                            {formatNumber(currentStock)}
                          </span>
                        </td>
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(currentStock * item.costPrice)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Hết hàng</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Sắp hết (≤ {minStock})</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Còn hàng</span>
                            </span>
                          )}
                        </td>
                        {canManageVouchers && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenAdjustModal(item)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 hover:bg-[#ffe5ec] text-[#a93054] font-semibold text-[11px] transition cursor-pointer border border-pink-200"
                                title="Điều chỉnh tồn kho (+ hoặc -)"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Sửa kho</span>
                              </button>

                              {roleConfig.canEditProducts && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Xác nhận xóa sản phẩm ${item.name}?`)) {
                                      onDeleteItem(item.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Xóa sản phẩm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. LỊCH SỬ NHẬP XUẤT KHO - Tab 2: Lịch Sử Chi Tiết Biến Động */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
                <tr>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Mã Sản Phẩm</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4 text-center">Loại Giao Dịch</th>
                  <th className="py-3 px-4 text-right">Số Lượng</th>
                  <th className="py-3 px-4 text-right">Tồn Trước</th>
                  <th className="py-3 px-4 text-right">Tồn Sau</th>
                  <th className="py-3 px-4">Người Thực Hiện</th>
                  <th className="py-3 px-4">Tham Chiếu / Diễn Giải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      Chưa có lịch sử biến động nhập xuất kho nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isImport = m.movementType === 'IMPORT';
                    let typeBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {m.transactionType}
                      </span>
                    );

                    if (m.transactionType === 'INITIAL_STOCK') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Tồn Ban Đầu
                        </span>
                      );
                    } else if (m.transactionType === 'PURCHASE') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Nhập Hàng (Mua)
                        </span>
                      );
                    } else if (m.transactionType === 'SALE') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Xuất Bán Hàng
                        </span>
                      );
                    } else if (m.transactionType === 'ADJUSTMENT') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Điều Chỉnh Kho
                        </span>
                      );
                    }

                    return (
                      <tr key={m.id} className="hover:bg-[#fbf8ff] transition">
                        <td className="py-3 px-4 text-[#6c595f] whitespace-nowrap">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                          {m.itemCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#181a2e]">
                          {m.itemName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeBadge}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={isImport ? 'text-emerald-700' : 'text-rose-600'}>
                            {isImport ? `+${formatNumber(m.quantity)}` : `-${formatNumber(m.quantity)}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#6c595f]">
                          {formatNumber(m.stockBefore)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#181a2e]">
                          {formatNumber(m.stockAfter)}
                        </td>
                        <td className="py-3 px-4 text-[#4e4447]">
                          {m.operator}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] font-bold text-[#a93054]">
                            {m.invoiceRef || m.logCode}
                          </div>
                          {m.note && (
                            <div className="text-[10px] text-[#6c595f] line-clamp-1">{m.note}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Danh Sách Phiếu Nhập Kho (Tương thích) */}
      {activeTab === 'IMPORT_VOUCHERS' && (
        <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
                <tr>
                  <th className="py-3 px-4">Số Phiếu Nhập</th>
                  <th className="py-3 px-4">Ngày Nhập</th>
                  <th className="py-3 px-4">Nhà Cung Cấp / Xưởng</th>
                  <th className="py-3 px-4">Kho Nhập</th>
                  <th className="py-3 px-4">Diễn Giải</th>
                  <th className="py-3 px-4 text-right">Tổng Tiền (VNĐ)</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredImportLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có phiếu nhập kho nào.
                    </td>
                  </tr>
                ) : (
                  filteredImportLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fbf8ff] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#fb6f92]">{log.code}</td>
                      <td className="py-3 px-4 text-[#6c595f]">{formatDate(log.date)}</td>
                      <td className="py-3 px-4 font-medium text-[#181a2e]">{log.partnerName || '-'}</td>
                      <td className="py-3 px-4 text-[#6c595f]">{log.warehouseName || 'Kho D&D'}</td>
                      <td className="py-3 px-4 text-[#4e4447]">{log.note || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(log.totalValue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintStockVoucher(log)}
                            className="p-1 text-slate-500 hover:text-[#a93054] rounded transition cursor-pointer"
                            title="In Phiếu Nhập Kho"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canManageVouchers && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa phiếu nhập ${log.code}? Tồn kho sẽ được hoàn lại tương ứng.`)) {
                                  onDeleteStockVoucher(log.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Xóa phiếu nhập"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Danh Sách Phiếu Xuất Kho (Tương thích) */}
      {activeTab === 'EXPORT_VOUCHERS' && (
        <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
                <tr>
                  <th className="py-3 px-4">Số Phiếu Xuất</th>
                  <th className="py-3 px-4">Ngày Xuất</th>
                  <th className="py-3 px-4">Khách Hàng / Showroom Nhận</th>
                  <th className="py-3 px-4">Kho Xuất</th>
                  <th className="py-3 px-4">Lý Do Xuất</th>
                  <th className="py-3 px-4 text-right">Tổng Giá Vốn (VNĐ)</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filteredExportLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có phiếu xuất kho nào.
                    </td>
                  </tr>
                ) : (
                  filteredExportLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fbf8ff] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#a93054]">{log.code}</td>
                      <td className="py-3 px-4 text-[#6c595f]">{formatDate(log.date)}</td>
                      <td className="py-3 px-4 font-medium text-[#181a2e]">{log.partnerName || '-'}</td>
                      <td className="py-3 px-4 text-[#6c595f]">{log.warehouseName || 'Kho D&D'}</td>
                      <td className="py-3 px-4 text-[#4e4447]">{log.note || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#181a2e]">
                        {formatCurrency(log.totalValue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintStockVoucher(log)}
                            className="p-1 text-slate-500 hover:text-[#a93054] rounded transition cursor-pointer"
                            title="In Phiếu Xuất Kho"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canManageVouchers && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa phiếu xuất ${log.code}? Tồn kho sẽ được phục hồi tương ứng.`)) {
                                  onDeleteStockVoucher(log.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Xóa phiếu xuất"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        product={selectedAdjustProduct}
        productList={displayProducts}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={handleAdjustSuccess}
      />

      {/* Item Modal for adding new products */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={onAddItem}
      />

      {/* Stock Voucher Modal for creating Import/Export vouchers */}
      <StockVoucherModal
        isOpen={isVoucherModalOpen}
        type={voucherModalType}
        inventory={inventory}
        partners={partners}
        onClose={() => setIsVoucherModalOpen(false)}
        onSave={onAddStockVoucher}
      />

    </div>
  );
};
