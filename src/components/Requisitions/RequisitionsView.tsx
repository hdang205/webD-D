import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Truck, 
  ShoppingBag, 
  Building2, 
  Tag, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  User, 
  Trash2, 
  Eye, 
  Check, 
  X,
  Printer,
  ChevronDown,
  Layers,
  HelpCircle,
  Package,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { 
  StockRequisition, 
  RequisitionItem, 
  RequisitionStatus, 
  RequisitionType, 
  RequisitionUrgency, 
  AuthUser, 
  InventoryItem, 
  Partner, 
  Invoice,
  InventoryLog 
} from '../../types/accounting';

interface RequisitionsViewProps {
  requisitions: StockRequisition[];
  inventory: InventoryItem[];
  partners: Partner[];
  currentUser: AuthUser | null;
  onSaveRequisition: (req: StockRequisition) => void;
  onDeleteRequisition: (id: string) => void;
  onApproveRequisition: (id: string, notes?: string) => void;
  onRejectRequisition: (id: string, notes?: string) => void;
  onConvertToPurchaseInvoice: (req: StockRequisition) => void;
  onConvertToStockImport: (req: StockRequisition) => void;
  onNavigateTab: (tab: any) => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({
  requisitions,
  inventory,
  partners,
  currentUser,
  onSaveRequisition,
  onDeleteRequisition,
  onApproveRequisition,
  onRejectRequisition,
  onConvertToPurchaseInvoice,
  onConvertToStockImport,
  onNavigateTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequisitionStatus>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | RequisitionUrgency>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | RequisitionType>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingReq, setViewingReq] = useState<StockRequisition | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApproveModal, setShowApproveModal] = useState<StockRequisition | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<StockRequisition | null>(null);

  // New Requisition Form State
  const [formData, setFormData] = useState<{
    type: RequisitionType;
    urgency: RequisitionUrgency;
    reason: string;
    suggestedSupplierId: string;
    notes: string;
    items: RequisitionItem[];
  }>({
    type: 'IMPORT_REQUEST',
    urgency: 'HIGH',
    reason: '',
    suggestedSupplierId: '',
    notes: '',
    items: []
  });

  // Check if current user has approval privileges
  const canApprove = useMemo(() => {
    if (!currentUser) return false;
    return ['DIRECTOR', 'CHIEF_ACCOUNTANT', 'WAREHOUSE_MANAGER'].includes(currentUser.role);
  }, [currentUser]);

  // Suppliers list
  const suppliers = useMemo(() => {
    return partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH');
  }, [partners]);

  // Low stock inventory items
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.openingQuantity <= (i.minStockLevel || 10));
  }, [inventory]);

  // Filtered requisitions list
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const matchSearch = 
        req.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.items.some(it => it.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || it.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'ALL' || req.status === statusFilter;
      const matchUrgency = urgencyFilter === 'ALL' || req.urgency === urgencyFilter;
      const matchType = typeFilter === 'ALL' || req.type === typeFilter;

      return matchSearch && matchStatus && matchUrgency && matchType;
    });
  }, [requisitions, searchTerm, statusFilter, urgencyFilter, typeFilter]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = requisitions.length;
    const pending = requisitions.filter(r => r.status === 'PENDING').length;
    const approved = requisitions.filter(r => r.status === 'APPROVED').length;
    const completed = requisitions.filter(r => r.status === 'COMPLETED').length;
    const totalPendingAmount = requisitions
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.totalEstimatedAmount, 0);

    return { total, pending, approved, completed, totalPendingAmount };
  }, [requisitions]);

  // Open Create Modal with clean defaults
  const handleOpenCreateModal = (prefilledItems?: RequisitionItem[], customReason?: string) => {
    setFormData({
      type: 'IMPORT_REQUEST',
      urgency: 'HIGH',
      reason: customReason || '',
      suggestedSupplierId: suppliers[0]?.id || '',
      notes: '',
      items: prefilledItems && prefilledItems.length > 0 ? prefilledItems : [
        {
          id: `item_${Date.now()}_1`,
          itemCode: '',
          itemName: '',
          unit: 'Cái',
          currentStock: 0,
          requestedQty: 20,
          estimatedUnitPrice: 200000,
          totalEstimated: 4000000,
          note: ''
        }
      ]
    });
    setShowCreateModal(true);
  };

  // Quick action: Pre-fill items from Low Stock Alert
  const handleCreateFromLowStock = () => {
    if (lowStockItems.length === 0) {
      alert('Hiện tại tất cả mặt hàng trong kho đều đủ định mức an toàn!');
      return;
    }
    const prefilled: RequisitionItem[] = lowStockItems.map((it, idx) => ({
      id: `low_${Date.now()}_${idx}`,
      itemId: it.id,
      itemCode: it.code,
      itemName: it.name,
      category: it.category,
      size: it.size,
      color: it.color,
      unit: it.unit,
      currentStock: it.openingQuantity,
      requestedQty: Math.max(20, (it.minStockLevel || 15) * 2 - it.openingQuantity),
      estimatedUnitPrice: it.costPrice || 200000,
      totalEstimated: Math.max(20, (it.minStockLevel || 15) * 2 - it.openingQuantity) * (it.costPrice || 200000),
      note: `Bổ sung tồn kho dưới mức định mức (${it.openingQuantity}/${it.minStockLevel || 10})`
    }));

    handleOpenCreateModal(prefilled, 'Đề xuất đặt may / nhập bổ sung các mặt hàng tồn kho chạm ngưỡng tối thiểu');
  };

  // Add Item Row to Form
  const handleAddItemRow = () => {
    const newItem: RequisitionItem = {
      id: `item_${Date.now()}_${formData.items.length + 1}`,
      itemCode: '',
      itemName: '',
      unit: 'Cái',
      currentStock: 0,
      requestedQty: 10,
      estimatedUnitPrice: 250000,
      totalEstimated: 2500000,
      note: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove Item Row
  const handleRemoveItemRow = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== id)
    }));
  };

  // Select Item from existing Inventory
  const handleSelectInventoryItem = (rowId: string, invId: string) => {
    const inv = inventory.find(i => i.id === invId);
    if (!inv) return;

    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === rowId) {
          const qty = it.requestedQty || 10;
          const price = inv.costPrice || it.estimatedUnitPrice || 200000;
          return {
            ...it,
            itemId: inv.id,
            itemCode: inv.code,
            itemName: inv.name,
            category: inv.category,
            size: inv.size,
            color: inv.color,
            unit: inv.unit,
            currentStock: inv.openingQuantity,
            estimatedUnitPrice: price,
            totalEstimated: qty * price
          };
        }
        return it;
      })
    }));
  };

  // Update item fields
  const handleUpdateItem = (rowId: string, field: keyof RequisitionItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (it.id === rowId) {
          const updated = { ...it, [field]: value };
          if (field === 'requestedQty' || field === 'estimatedUnitPrice') {
            const qty = field === 'requestedQty' ? Number(value) || 0 : it.requestedQty;
            const price = field === 'estimatedUnitPrice' ? Number(value) || 0 : it.estimatedUnitPrice;
            updated.totalEstimated = qty * price;
          }
          return updated;
        }
        return it;
      })
    }));
  };

  // Submit Requisition Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      alert('Vui lòng nhập lý do / mục đích đề xuất nhập hàng!');
      return;
    }
    if (formData.items.length === 0 || formData.items.some(i => !i.itemName.trim() || i.requestedQty <= 0)) {
      alert('Vui lòng nhập đầy đủ thông tin mặt hàng và số lượng đề xuất > 0!');
      return;
    }

    const supplier = suppliers.find(s => s.id === formData.suggestedSupplierId);
    const totalAmount = formData.items.reduce((sum, i) => sum + i.totalEstimated, 0);

    const requesterName = currentUser ? currentUser.name : 'Nhân Viên D&D';
    const requesterRole = currentUser ? currentUser.roleTitle : 'Nhân Viên Bán Hàng';

    const newReq: StockRequisition = {
      id: `req_${Date.now()}`,
      code: `YCN${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      type: formData.type,
      urgency: formData.urgency,
      reason: formData.reason,
      requesterId: currentUser?.id || 'emp_guest',
      requesterName: `${requesterName} (${requesterRole})`,
      requesterRole: requesterRole,
      department: currentUser?.branch || 'Showroom 120 Phố Huế, Hà Nội',
      suggestedSupplierId: supplier?.id,
      suggestedSupplierName: supplier?.name,
      items: formData.items,
      totalEstimatedAmount: totalAmount,
      status: 'PENDING',
      notes: formData.notes
    };

    onSaveRequisition(newReq);
    setShowCreateModal(false);
  };

  // Helpers for badge styles
  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Chờ Quản Lý Duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã Phê Duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Từ Chối Duyệt
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3.5 h-3.5" />
            Đã Nhập/Xuất Hàng
          </span>
        );
    }
  };

  const getUrgencyBadge = (urgency: RequisitionUrgency) => {
    switch (urgency) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500 text-white shadow-2xs">
            <AlertTriangle className="w-3 h-3" />
            Khẩn cấp (Hết hàng)
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500 text-white">
            Ưu tiên cao
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
            Bình thường
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-pink-900 to-slate-900 p-6 rounded-3xl text-white shadow-md">
        <div className="space-y-1">
          {currentUser && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-medium">
                {currentUser.roleTitle}
              </span>
            </div>
          )}
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Đề Xuất Nhập/Xuất</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {lowStockItems.length > 0 && (
            <button
              onClick={handleCreateFromLowStock}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Tự động quét các sản phẩm dưới định mức tồn"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Gợi Ý Nhập {lowStockItems.length} Mẫu Hết Hàng</span>
            </button>
          )}

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#fb6f92] via-[#d63384] to-[#a93054] hover:from-[#f4517d] hover:to-[#912344] text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-pink-500/20 active:scale-95 cursor-pointer border border-white/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="tracking-wide">Lập Đơn Đề Xuất Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Chờ Phê Duyệt</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{kpis.pending}</span>
            <span className="text-xs text-slate-400">phiếu yêu cầu</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            Giá trị: <strong className="text-slate-700">{kpis.totalPendingAmount.toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã Phê Duyệt</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{kpis.approved}</span>
            <span className="text-xs text-slate-400">được duyệt mua</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Sẵn sàng nhập kho / tạo hóa đơn</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã Nhập / Hoàn Thành</span>
            <span className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{kpis.completed}</span>
            <span className="text-xs text-slate-400">đã cập nhật kho</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đã sinh hóa đơn / phiếu nhập</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cảnh Báo Tồn Kho</span>
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{lowStockItems.length}</span>
            <span className="text-xs text-slate-400">mẫu dưới định mức</span>
          </div>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Cần lập đề xuất nhập gấp</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, người lập, sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#a93054]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({requisitions.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <Clock className="w-3 h-3" />
              Chờ Duyệt ({kpis.pending})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              Đã Duyệt ({kpis.approved})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'COMPLETED' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-700 hover:bg-blue-100/60'
              }`}
            >
              Đã Nhập ({kpis.completed})
            </button>
          </div>

          <Dropdown
            size="sm"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as any)}
            className="bg-slate-50 border-slate-200 font-semibold text-slate-700"
          >
            <option value="ALL">Mọi Mức Ưu Tiên</option>
            <option value="URGENT">🚨 Khẩn cấp (Hết hàng)</option>
            <option value="HIGH">⚡ Ưu tiên cao</option>
            <option value="NORMAL">Bình thường</option>
          </Dropdown>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-rose-50/70 text-slate-800 font-bold border-b border-rose-100">
              <tr>
                <th className="py-3 px-4">Mã Phiếu & Ngày</th>
                <th className="py-3 px-4">Người Đề Xuất & Bộ Phận</th>
                <th className="py-3 px-4">Lý Do / Mục Đích</th>
                <th className="py-3 px-4">Chi Tiết Mặt Hàng Yêu Cầu</th>
                <th className="py-3 px-4 text-right">Tổng Dự Kiến</th>
                <th className="py-3 px-4 text-center">Mức Độ</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Không tìm thấy phiếu đề xuất nào phù hợp</p>
                    <button
                      onClick={() => handleOpenCreateModal()}
                      className="mt-3 text-xs font-bold text-[#a93054] underline cursor-pointer"
                    >
                      Bấm vào đây để tạo phiếu yêu cầu nhập hàng mới
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-pink-50/30 transition">
                    {/* Mã & Ngày */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                        <span>{req.code}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{req.date}</span>
                      </div>
                      {req.createdDocumentRef && (
                        <div className="mt-1">
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-bold">
                            Ref: {req.createdDocumentRef}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Người đề xuất */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{req.requesterName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{req.department}</div>
                      {req.suggestedSupplierName && (
                        <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Xưởng: {req.suggestedSupplierName}
                        </div>
                      )}
                    </td>

                    {/* Lý do */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-medium text-slate-800 line-clamp-2">{req.reason}</p>
                      {req.approvalNotes && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-100 mt-1">
                          <strong>Duyệt bởi {req.approverName}:</strong> {req.approvalNotes}
                        </div>
                      )}
                    </td>

                    {/* Chi tiết mặt hàng */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {req.items.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                              • {it.itemName} {it.size ? `(Size ${it.size})` : ''}
                            </span>
                            <span className="text-[11px] font-bold text-slate-900 shrink-0">
                              x{it.requestedQty} {it.unit}
                            </span>
                          </div>
                        ))}
                        {req.items.length > 2 && (
                          <span className="text-[10px] text-slate-400 italic">
                            + {req.items.length - 2} mặt hàng khác...
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tổng tiền dự kiến */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {req.totalEstimatedAmount.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Mức độ */}
                    <td className="py-3.5 px-4 text-center">
                      {getUrgencyBadge(req.urgency)}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingReq(req)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          title="Xem chi tiết phiếu đề xuất"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approval actions for managers */}
                        {req.status === 'PENDING' && canApprove && (
                          <>
                            <button
                              onClick={() => {
                                setShowApproveModal(req);
                                setApprovalNotes('Đã phê duyệt đề xuất. Cho phép bộ phận mua hàng đặt xưởng may.');
                              }}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                              title="Phê duyệt đề xuất này"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setShowRejectModal(req);
                                setApprovalNotes('');
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                              title="Từ chối đề xuất"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Direct conversion to Purchase Invoice or Stock Import */}
                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => onConvertToPurchaseInvoice(req)}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            title="Tạo Hóa Đơn Nhập Hàng Xưởng ngay"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Tạo Đơn Nhập</span>
                          </button>
                        )}

                        {req.status === 'PENDING' && !canApprove && (
                          <button
                            onClick={() => onDeleteRequisition(req.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Hủy phiếu yêu cầu"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ================= MODAL: TẠO PHIẾU ĐỀ XUẤT MỚI ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-rose-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#fb6f92] to-[#a93054] rounded-2xl text-white">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Lập Phiếu Đề Xuất / Yêu Cầu Nhập Hàng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Người lập: <strong>{currentUser?.name || 'Nhân viên Bán/Mua hàng'}</strong> ({currentUser?.roleTitle || 'Bộ phận Showroom'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Loại đề xuất */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại Yêu Cầu
                  </label>
                  <Dropdown
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-50 border-slate-200 font-semibold"
                  >
                    <option value="IMPORT_REQUEST">📥 Yêu Cầu Nhập Hàng / Đặt May Xưởng</option>
                    <option value="EXPORT_REQUEST">📤 Yêu Cầu Xuất Hàng Đi Showroom/Đối tác</option>
                  </Dropdown>
                </div>

                {/* Mức độ ưu tiên */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mức Độ Ưu Tiên
                  </label>
                  <Dropdown
                    value={formData.urgency}
                    onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as any }))}
                    className="w-full bg-slate-50 border-slate-200 font-semibold text-amber-800"
                  >
                    <option value="URGENT">🚨 Khẩn Cấp (Hết Hàng / Khách Đặt Cọc Chờ)</option>
                    <option value="HIGH">⚡ Ưu Tiên Cao (Chuẩn Bị BST)</option>
                    <option value="NORMAL">Bình Thường (Bổ Sung Định Kỳ)</option>
                  </Dropdown>
                </div>

                {/* Gợi ý xưởng may */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Xưởng May / Nhà Cung Cấp Gợi Ý
                  </label>
                  <Dropdown
                    value={formData.suggestedSupplierId}
                    onChange={(e) => setFormData(prev => ({ ...prev, suggestedSupplierId: e.target.value }))}
                    className="w-full bg-slate-50 border-slate-200"
                    searchPlaceholder="Tìm kiếm nhà cung cấp..."
                  >
                    <option value="">-- Chọn Nhà Cung Cấp (Tùy chọn) --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </Dropdown>
                </div>
              </div>

              {/* Lý do đề xuất */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý Do / Mục Đích Đề Xuất Nhập Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đầm dạ hội lụa đỏ size M hết hàng tại showroom, 3 khách VIP đặt cọc trước..."
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#a93054]"
                />
              </div>

              {/* Danh sách mặt hàng */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#fb6f92]" />
                    <span>Danh Sách Sản Phẩm Yêu Cầu ({formData.items.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-xs font-bold text-[#a93054] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Hàng Mục</span>
                  </button>
                </div>

                <div className="border border-rose-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50/50 text-slate-700 font-bold border-b border-rose-100">
                      <tr>
                        <th className="py-2.5 px-3">Chọn Từ Kho Hoặc Nhập Mới</th>
                        <th className="py-2.5 px-2 text-center w-20">Size</th>
                        <th className="py-2.5 px-2 text-center w-24">Tồn Hiện Tại</th>
                        <th className="py-2.5 px-2 text-center w-24">SL Đề Xuất</th>
                        <th className="py-2.5 px-3 text-right w-32">Đơn Giá Dự Kiến</th>
                        <th className="py-2.5 px-3 text-right w-32">Thành Tiền</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((it) => (
                        <tr key={it.id} className="hover:bg-pink-50/20">
                          {/* Tên / Chọn kho */}
                          <td className="py-2 px-3 space-y-1">
                            <Dropdown
                              size="sm"
                              value={it.itemId || ''}
                              onChange={(e) => handleSelectInventoryItem(it.id, e.target.value)}
                              className="w-full bg-slate-50 border-slate-200 font-semibold text-slate-800"
                              searchPlaceholder="Tìm kiếm sản phẩm kho..."
                            >
                              <option value="">-- Chọn sản phẩm có sẵn trong kho hàng --</option>
                              {inventory.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                  [{inv.code}] {inv.name} (Tồn: {inv.openingQuantity} {inv.unit})
                                </option>
                              ))}
                            </Dropdown>
                            <input
                              type="text"
                              placeholder="Tên sản phẩm / Mẫu đặt may..."
                              value={it.itemName}
                              onChange={(e) => handleUpdateItem(it.id, 'itemName', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </td>

                          {/* Size */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="text"
                              placeholder="M / L"
                              value={it.size || ''}
                              onChange={(e) => handleUpdateItem(it.id, 'size', e.target.value)}
                              className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </td>

                          {/* Tồn kho */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-500">
                            {it.currentStock}
                          </td>

                          {/* SL đề xuất */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={it.requestedQty}
                              onChange={(e) => handleUpdateItem(it.id, 'requestedQty', Number(e.target.value))}
                              className="w-full px-2 py-1 text-center bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900"
                            />
                          </td>

                          {/* Đơn giá dự kiến */}
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="any"
                              value={it.estimatedUnitPrice}
                              onChange={(e) => handleUpdateItem(it.id, 'estimatedUnitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                            />
                          </td>

                          {/* Thành tiền */}
                          <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                            {it.totalEstimated.toLocaleString('vi-VN')} đ
                          </td>

                          {/* Xóa */}
                          <td className="py-2 px-2 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(it.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-rose-50/70 border-t border-rose-100 font-bold">
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-right text-slate-800">
                          TỔNG DỰ KIẾN CHI PHÍ ĐỀ XUẤT:
                        </td>
                        <td className="py-3 px-3 text-right text-[#a93054] text-sm font-mono font-extrabold">
                          {formData.items.reduce((s, i) => s + i.totalEstimated, 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú Cho Ban Giám Đốc / Kế Toán Trưởng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về thời hạn cần hàng, cam kết xưởng may..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Gửi Phiếu Yêu Cầu Phê Duyệt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHI TIẾT PHIẾU ĐỀ XUẤT ================= */}
      {viewingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in duration-150">
            
            <div className="flex items-center justify-between border-b border-rose-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Chi Tiết Đơn Đề Xuất #{viewingReq.code}
                  </h2>
                  {getStatusBadge(viewingReq.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày lập: {viewingReq.date} • {viewingReq.requesterName}
                </p>
              </div>
              <button
                onClick={() => setViewingReq(null)}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Mức Độ Ưu Tiên</span>
                <div className="mt-1">{getUrgencyBadge(viewingReq.urgency)}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Xưởng May / Đối Tác</span>
                <div className="mt-1 font-bold text-slate-800 truncate">{viewingReq.suggestedSupplierName || 'Chưa chỉ định'}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Tổng Giá Trị Dự Kiến</span>
                <div className="mt-1 font-extrabold text-[#a93054] font-mono">{viewingReq.totalEstimatedAmount.toLocaleString('vi-VN')} đ</div>
              </div>
            </div>

            {/* Lý do */}
            <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 text-xs">
              <span className="font-bold text-slate-800">Lý do đề xuất:</span>
              <p className="text-slate-700 mt-0.5">{viewingReq.reason}</p>
            </div>

            {/* Phê duyệt log */}
            {viewingReq.approverName && (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã xét duyệt bởi {viewingReq.approverName} ({viewingReq.approvalDate})</span>
                </div>
                {viewingReq.approvalNotes && (
                  <p className="text-emerald-800 italic">{viewingReq.approvalNotes}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="border border-rose-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/60 font-bold text-slate-800 border-b border-rose-100">
                  <tr>
                    <th className="py-2.5 px-3">Mã & Tên Sản Phẩm</th>
                    <th className="py-2.5 px-2 text-center">Size</th>
                    <th className="py-2.5 px-2 text-center">Tồn Kho</th>
                    <th className="py-2.5 px-2 text-center">SL Đề Xuất</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá Dự Kiến</th>
                    <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingReq.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{it.itemName}</div>
                        {it.itemCode && <div className="text-[10px] text-slate-400 font-mono">SKU: {it.itemCode}</div>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">{it.size || '-'}</td>
                      <td className="py-2.5 px-2 text-center text-slate-500">{it.currentStock} {it.unit}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-amber-900">{it.requestedQty} {it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{it.estimatedUnitPrice.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{it.totalEstimated.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setViewingReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {viewingReq.status === 'APPROVED' && (
                  <button
                    onClick={() => {
                      setViewingReq(null);
                      onConvertToPurchaseInvoice(viewingReq);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Chuyển Thành Hóa Đơn Nhập Hàng</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PHÊ DUYỆT ĐỀ XUẤT ================= */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Phê Duyệt Phiếu Đề Xuất #{showApproveModal.code}
                </h3>
                <p className="text-xs text-slate-500">Người duyệt: {currentUser?.name} ({currentUser?.roleTitle})</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Ý Kiến Chỉ Đạo & Ghi Chú Phê Duyệt:
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="VD: Đã duyệt mua gấp lô này, liên hệ xưởng giao hàng trước ngày..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApproveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onApproveRequisition(showApproveModal.id, approvalNotes);
                  setShowApproveModal(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Xác Nhận Phê Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TỪ CHỐI ĐỀ XUẤT ================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Từ Chối Phiếu Đề Xuất #{showRejectModal.code}
                </h3>
                <p className="text-xs text-slate-500">Lý do từ chối sẽ được thông báo cho người lập</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Lý Do Từ Chối / Yêu Cầu Điều Chỉnh:
              </label>
              <textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="VD: Kho tổng vẫn còn tồn tại kho phụ, tạm hoãn đặt thêm..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onRejectRequisition(showRejectModal.id, approvalNotes);
                  setShowRejectModal(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
