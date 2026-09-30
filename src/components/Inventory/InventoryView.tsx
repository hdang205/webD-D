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
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { ItemModal } from './ItemModal';
import { StockVoucherModal } from './StockVoucherModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { StockAuditModal } from './StockAuditModal';
import { StockAuditDetailModal } from './StockAuditDetailModal';
import { DefectiveGoodsModal } from './DefectiveGoodsModal';
import { canUserViewCostPrice, canUserManageStockVouchers, ROLE_CONFIGS } from '../../utils/rbac';
import { 
  InventoryService, 
  InventoryProduct, 
  InventoryMovement, 
  InventorySummary,
  StockAudit,
  DefectiveGood
} from '../../services/inventoryService';

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
  const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY' | 'IMPORT_VOUCHERS' | 'EXPORT_VOUCHERS' | 'AUDIT' | 'DEFECTS'>('STOCK');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherModalType, setVoucherModalType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');

  // Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAdjustProduct, setSelectedAdjustProduct] = useState<InventoryProduct | null>(null);

  // Kiểm kho & Hàng lỗi Modal States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<StockAudit | null>(null);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);

  // Live Database State
  const [dbProducts, setDbProducts] = useState<InventoryProduct[]>([]);
  const [dbSummary, setDbSummary] = useState<InventorySummary | null>(null);
  const [dbMovements, setDbMovements] = useState<InventoryMovement[]>([]);
  const [dbAudits, setDbAudits] = useState<StockAudit[]>([]);
  const [dbDefects, setDbDefects] = useState<DefectiveGood[]>([]);
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
      const [prods, sum, logsRes, auditsRes, defectsRes] = await Promise.all([
        InventoryService.getAll(),
        InventoryService.getSummary(),
        InventoryService.getLogs(),
        InventoryService.getAudits(),
        InventoryService.getDefects()
      ]);
      if (prods) setDbProducts(prods);
      if (sum) setDbSummary(sum);
      if (logsRes?.movements) setDbMovements(logsRes.movements);
      if (auditsRes) setDbAudits(auditsRes);
      if (defectsRes) setDbDefects(defectsRes);
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

  const handleAuditSuccess = (res: any) => {
    setSuccessToast(res?.message || 'Đã xác nhận kiểm kho và cân bằng tồn kho thành công!');
    setTimeout(() => setSuccessToast(null), 4000);
    loadInventoryData();
    if (onRefreshInventory) onRefreshInventory();
  };

  const handleDefectSuccess = (res: any) => {
    setSuccessToast(res?.message || 'Đã ghi nhận và xử lý hàng lỗi thành công!');
    setTimeout(() => setSuccessToast(null), 4000);
    loadInventoryData();
    if (onRefreshInventory) onRefreshInventory();
  };

  const handleExportExcel = () => {
    const now = new Date();
    const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    if (activeTab === 'STOCK') {
      const headers = ['STT', 'Mã Sản Phẩm', 'Tên Sản Phẩm Thời Trang', 'ĐVT', 'Nhóm Thời Trang', 'Giá Bán (VNĐ)'];
      const currencyCols: number[] = [5];
      if (canViewCost) {
        headers.push('Giá Nhập (VNĐ)', 'Tổng Giá Trị Tồn Kho');
        currencyCols.push(6, 7);
      }
      headers.push('Số Lượng Tồn Kho', 'Trạng Thái');

      const rows = filteredProducts.map((i, idx) => {
        const row: any[] = [
          idx + 1,
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

      exportToExcel({
        title: 'BÁO CÁO TỒN KHO THỜI TRANG D&D',
        subtitle: `Số lượng mã hàng: ${filteredProducts.length} | Tổng tồn kho: ${formatNumber(totalStockQuantity)} sp`,
        filename: `Bao_cao_ton_kho_${dateSuffix}.xlsx`,
        sheetName: 'Tồn Kho D&D',
        headers,
        rows,
        currencyColumns: currencyCols,
        numberColumns: [0, canViewCost ? 8 : 6],
        includeTotalRow: true,
        totalLabel: 'TỔNG CỘNG',
        totalColumns: canViewCost ? [7, 8] : [5, 6]
      });
    } else if (activeTab === 'AUDIT') {
      const headers = ['STT', 'Mã Phiếu', 'Ngày Kiểm Kho', 'Người Thực Hiện', 'Lý Do Kiểm Kho', 'Số Mặt Hàng', 'Khớp', 'Thiếu', 'Thừa', 'Tổng Chênh Lệch', 'Trạng Thái', 'Ghi Chú'];
      const rows = dbAudits.map((a, idx) => [
        idx + 1,
        a.code,
        formatDate(a.date),
        a.auditorName,
        a.reason,
        a.totalItems,
        a.matchedCount,
        a.shortageCount,
        a.surplusCount,
        a.totalDiff,
        a.status,
        a.note || ''
      ]);

      exportToExcel({
        title: 'BÁO CÁO KẾT QUẢ KIỂM KÊ KHO HÀNG D&D',
        subtitle: `Tổng số phiếu kiểm: ${dbAudits.length}`,
        filename: `Bao_cao_kiem_kho_${dateSuffix}.xlsx`,
        sheetName: 'Phiếu Kiểm Kho',
        headers,
        rows,
        numberColumns: [0, 5, 6, 7, 8, 9],
        includeTotalRow: true,
        totalLabel: 'TỔNG CỘNG',
        totalColumns: [5, 6, 7, 8, 9]
      });
    } else if (activeTab === 'DEFECTS') {
      const headers = ['STT', 'Mã Phiếu', 'Ngày Ghi Nhận', 'Mã SP', 'Tên Sản Phẩm', 'ĐVT', 'Số Lượng Lỗi', 'Lý Do Lỗi', 'Hướng Xử Lý', 'Người Xử Lý', 'Giá Vốn (VNĐ)', 'Tổn Thất (VNĐ)', 'Ghi Chú'];
      const rows = dbDefects.map((d, idx) => [
        idx + 1,
        d.code,
        formatDate(d.date),
        d.itemCode,
        d.itemName,
        d.unit,
        d.quantity,
        d.reason,
        d.actionTitle,
        d.handlerName,
        d.costPrice,
        d.totalLoss,
        d.note || ''
      ]);

      exportToExcel({
        title: 'BÁO CÁO THEO DÕI VÀ XỬ LÝ HÀNG LỖI / HỎNG',
        subtitle: `Tổng số sự vụ lỗi: ${dbDefects.length}`,
        filename: `Bao_cao_hang_loi_${dateSuffix}.xlsx`,
        sheetName: 'Hàng Lỗi & Hỏng',
        headers,
        rows,
        currencyColumns: [10, 11],
        numberColumns: [0, 6],
        includeTotalRow: true,
        totalLabel: 'TỔNG CỘNG',
        totalColumns: [6, 11]
      });
    } else if (activeTab === 'HISTORY') {
      const headers = ['STT', 'Thời Gian', 'Mã SKU', 'Tên Sản Phẩm', 'Loại Giao Dịch', 'Số Lượng', 'Tồn Trước', 'Tồn Sau', 'Người Thực Hiện', 'Tham Chiếu', 'Diễn Giải'];
      const rows = filteredMovements.map((m, idx) => [
        idx + 1,
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

      exportToExcel({
        title: 'BÁO CÁO LỊCH SỬ NHẬP XUẤT KHO D&D',
        subtitle: `Tổng số bản ghi biến động: ${filteredMovements.length}`,
        filename: `Lich_su_nhap_xuat_kho_${dateSuffix}.xlsx`,
        sheetName: 'Lịch Sử Biến Động',
        headers,
        rows,
        numberColumns: [0, 6, 7]
      });
    } else if (activeTab === 'IMPORT_VOUCHERS') {
      const headers = ['STT', 'Số Phiếu Nhập', 'Ngày Nhập', 'Nhà Cung Cấp / Xưởng', 'Kho Nhập', 'Diễn Giải', 'Tổng Tiền Nhập (VNĐ)'];
      const rows = filteredImportLogs.map((l, idx) => [
        idx + 1,
        l.code,
        formatDate(l.date),
        l.partnerName || '-',
        l.warehouseName || 'Kho D&D',
        l.note || '',
        l.totalValue
      ]);

      exportToExcel({
        title: 'BÁO CÁO DANH SÁCH PHIẾU NHẬP KHO D&D',
        subtitle: `Tổng số phiếu nhập: ${filteredImportLogs.length}`,
        filename: `Bao_cao_nhap_hang_${dateSuffix}.xlsx`,
        sheetName: 'Phiếu Nhập Kho',
        headers,
        rows,
        currencyColumns: [6],
        numberColumns: [0],
        includeTotalRow: true,
        totalLabel: 'TỔNG CỘNG TIỀN NHẬP',
        totalColumns: [6]
      });
    } else {
      const headers = ['STT', 'Số Phiếu Xuất', 'Ngày Xuất', 'Khách Hàng / Showroom', 'Kho Xuất', 'Lý Do Xuất', 'Tổng Giá Vốn (VNĐ)'];
      const rows = filteredExportLogs.map((l, idx) => [
        idx + 1,
        l.code,
        formatDate(l.date),
        l.partnerName || '-',
        l.warehouseName || 'Kho D&D',
        l.note || '',
        l.totalValue
      ]);

      exportToExcel({
        title: 'BÁO CÁO DANH SÁCH PHIẾU XUẤT KHO D&D',
        subtitle: `Tổng số phiếu xuất: ${filteredExportLogs.length}`,
        filename: `Bao_cao_xuat_hang_${dateSuffix}.xlsx`,
        sheetName: 'Phiếu Xuất Kho',
        headers,
        rows,
        currencyColumns: [6],
        numberColumns: [0],
        includeTotalRow: true,
        totalLabel: 'TỔNG CỘNG GIÁ VỐN XUẤT',
        totalColumns: [6]
      });
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
                id="btn-open-audit-modal"
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Phiếu Kiểm Kho</span>
              </button>

              <button
                id="btn-open-defect-modal"
                onClick={() => setIsDefectModalOpen(true)}
                className="flex items-center gap-1.5 bg-linear-to-r from-amber-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Báo Hàng Lỗi</span>
              </button>

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
                <span>Lập Phiếu Nhập Kho</span>
              </button>

              <button
                id="btn-create-export-voucher"
                onClick={() => handleOpenVoucherModal('EXPORT')}
                className="flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <PackageMinus className="w-4 h-4" />
                <span>Lập Phiếu Xuất Kho</span>
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
              <span>Đề Xuất Nhập Mẫu Hết Hàng</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-white hover:bg-[#fbf8ff] text-[#4e4447] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#fb6f92]" />
            <span>Xuất Excel (.xlsx)</span>
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
            id="tab-btn-audit"
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-[#4e4447] hover:text-[#181a2e]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>Kiểm Kho ({dbAudits.length})</span>
          </button>

          <button
            id="tab-btn-defects"
            onClick={() => setActiveTab('DEFECTS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'DEFECTS'
                ? 'bg-white text-amber-700 shadow-xs font-bold'
                : 'text-[#4e4447] hover:text-[#181a2e]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Hàng Lỗi ({dbDefects.length})</span>
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

      {/* 2.1. TAB KIỂM KHO (STOCK AUDITS) */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quản Lý & Lịch Sử Phiếu Kiểm Kho</h3>
                <p className="text-xs text-[#6c595f]">Đối soát thực tế đếm tại kho với dữ liệu tồn hệ thống, tự động cân bằng tồn kho</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Phiếu Kiểm Kho Mới</span>
              </button>
            </div>
          </div>

          {/* KPI Summary for Audit */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-pink-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-[#6c595f]">Tổng Phiếu Kiểm Kho</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">{dbAudits.length}</div>
            </div>
            <div className="bg-white border border-pink-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-[#6c595f]">Mặt Hàng Đã Kiểm</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {dbAudits.reduce((s, a) => s + (a.totalItems || 0), 0)} <span className="text-xs font-normal">mã</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700">Khớp Hoàn Toàn</span>
              <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
                {dbAudits.reduce((s, a) => s + (a.matchedCount || 0), 0)} <span className="text-xs font-normal">mã</span>
              </div>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-700">Mặt Hàng Thiếu Kho</span>
              <div className="text-lg font-bold font-mono text-rose-800 mt-1">
                {dbAudits.reduce((s, a) => s + (a.shortageCount || 0), 0)} <span className="text-xs font-normal">mã</span>
              </div>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-700">Mặt Hàng Thừa Kho</span>
              <div className="text-lg font-bold font-mono text-blue-800 mt-1">
                {dbAudits.reduce((s, a) => s + (a.surplusCount || 0), 0)} <span className="text-xs font-normal">mã</span>
              </div>
            </div>
          </div>

          {/* Audits Table */}
          <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#fbf8ff] text-[#4e4447] font-bold text-[11px] border-b border-pink-100">
                  <tr>
                    <th className="py-3 px-4">Mã Phiếu</th>
                    <th className="py-3 px-4">Ngày Kiểm</th>
                    <th className="py-3 px-4">Người Thực Hiện</th>
                    <th className="py-3 px-4">Lý Do Kiểm Kê</th>
                    <th className="py-3 px-4 text-center">Mặt Hàng</th>
                    <th className="py-3 px-4 text-center">Khớp</th>
                    <th className="py-3 px-4 text-center">Thiếu</th>
                    <th className="py-3 px-4 text-center">Thừa</th>
                    <th className="py-3 px-4 text-center">Chênh Lệch</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {dbAudits.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Chưa có phiếu kiểm kho nào. Nhấn "+ Tạo Phiếu Kiểm Kho Mới" để bắt đầu kiểm đếm.
                      </td>
                    </tr>
                  ) : (
                    dbAudits.map(audit => (
                      <tr key={audit.id} className="hover:bg-[#fbf8ff] transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#a93054]">{audit.code}</td>
                        <td className="py-3 px-4 text-[#6c595f]">{formatDate(audit.date)}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{audit.auditorName}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-[220px] truncate" title={audit.reason}>
                          {audit.reason}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{audit.totalItems}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {audit.matchedCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {audit.shortageCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              -{audit.shortageCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {audit.surplusCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              +{audit.surplusCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {audit.totalDiff === 0 ? (
                            <span className="text-emerald-600">0</span>
                          ) : audit.totalDiff > 0 ? (
                            <span className="text-blue-600">+{audit.totalDiff}</span>
                          ) : (
                            <span className="text-rose-600">{audit.totalDiff}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {audit.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedAuditDetail(audit)}
                            className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-[#a93054] rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2.2. TAB QUẢN LÝ HÀNG LỖI / HỎNG (DEFECTS) */}
      {activeTab === 'DEFECTS' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-pink-100 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quản Lý & Theo Dõi Sản Phẩm Lỗi / Hỏng</h3>
                <p className="text-xs text-[#6c595f]">Kiểm tra tồn kho, trừ kho khả dụng và phân loại hướng xử lý: Báo nhập lại / Trả NCC / Hủy hàng lỗi</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDefectModalOpen(true)}
                className="flex items-center gap-1.5 bg-linear-to-r from-amber-600 to-rose-600 hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Khai Báo Hàng Lỗi</span>
              </button>
            </div>
          </div>

          {/* KPI Summary for Defects */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-pink-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-[#6c595f]">Tổng Phiếu Hàng Lỗi</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">{dbDefects.length}</div>
            </div>
            <div className="bg-white border border-pink-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-[#6c595f]">Tổng Lượng Hàng Lỗi</span>
              <div className="text-lg font-bold font-mono text-rose-700 mt-1">
                {dbDefects.reduce((s, d) => s + (d.quantity || 0), 0)} <span className="text-xs font-normal">sp</span>
              </div>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-700">Trả Nhà Cung Cấp</span>
              <div className="text-lg font-bold font-mono text-amber-800 mt-1">
                {dbDefects.filter(d => d.actionType === 'RETURN_SUPPLIER').reduce((s, d) => s + (d.quantity || 0), 0)} <span className="text-xs font-normal">sp</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700">Báo Nhập Lại</span>
              <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
                {dbDefects.filter(d => d.actionType === 'REORDER').reduce((s, d) => s + (d.quantity || 0), 0)} <span className="text-xs font-normal">sp</span>
              </div>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-700">Xuất Hủy Hàng Lỗi</span>
              <div className="text-lg font-bold font-mono text-rose-800 mt-1">
                {dbDefects.filter(d => d.actionType === 'DISPOSE').reduce((s, d) => s + (d.quantity || 0), 0)} <span className="text-xs font-normal">sp</span>
              </div>
            </div>
          </div>

          {/* Defects Table */}
          <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#fbf8ff] text-[#4e4447] font-bold text-[11px] border-b border-pink-100">
                  <tr>
                    <th className="py-3 px-4">Mã Phiếu</th>
                    <th className="py-3 px-4">Ngày Ghi Nhận</th>
                    <th className="py-3 px-4">Sản Phẩm</th>
                    <th className="py-3 px-4 text-center">Số Lượng Lỗi</th>
                    <th className="py-3 px-4">Lý Do Lỗi / Hỏng</th>
                    <th className="py-3 px-4 text-center">Hướng Xử Lý</th>
                    <th className="py-3 px-4">Người Xử Lý</th>
                    <th className="py-3 px-4 text-right">Tổng Tổn Thất (VNĐ)</th>
                    <th className="py-3 px-4">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {dbDefects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Chưa có sự vụ hàng lỗi nào được ghi nhận. Nhấn "+ Khai Báo Hàng Lỗi" để theo dõi.
                      </td>
                    </tr>
                  ) : (
                    dbDefects.map(d => (
                      <tr key={d.id} className="hover:bg-[#fbf8ff] transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#a93054]">{d.code}</td>
                        <td className="py-3 px-4 text-[#6c595f]">{formatDate(d.date)}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#a93054] mr-1.5">{d.itemCode}</span>
                          <span className="font-medium text-slate-800">{d.itemName}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                          {d.quantity} {d.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{d.reason}</td>
                        <td className="py-3 px-4 text-center">
                          {d.actionType === 'RETURN_SUPPLIER' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Trả NCC
                            </span>
                          )}
                          {d.actionType === 'REORDER' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Báo Nhập Lại
                            </span>
                          )}
                          {d.actionType === 'DISPOSE' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Hủy Hàng Lỗi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{d.handlerName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(d.totalLoss)}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{d.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Stock Audit Modal */}
      <StockAuditModal
        isOpen={isAuditModalOpen}
        productList={displayProducts}
        currentUser={currentUser}
        onClose={() => setIsAuditModalOpen(false)}
        onSuccess={handleAuditSuccess}
      />

      {/* Stock Audit Detail Modal */}
      <StockAuditDetailModal
        audit={selectedAuditDetail}
        onClose={() => setSelectedAuditDetail(null)}
      />

      {/* Defective Goods Modal */}
      <DefectiveGoodsModal
        isOpen={isDefectModalOpen}
        productList={displayProducts}
        currentUser={currentUser}
        onClose={() => setIsDefectModalOpen(false)}
        onSuccess={handleDefectSuccess}
      />

    </div>
  );
};
