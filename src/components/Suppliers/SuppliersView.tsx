import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Download, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  ArrowDownRight,
  PackageCheck,
  Package,
  Landmark,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Partner, Invoice } from '../../types/accounting';
import { TableContainer } from '../Common/TableContainer';
import { formatCurrency, formatDate } from '../../utils/accountingEngine';
import { InvoiceDetailModal } from '../Invoices/InvoiceDetailModal';
import { exportToExcel } from '../../utils/excelExport';
import { SupplierService } from '../../services/masterDataService';

interface SuppliersViewProps {
  partners: Partner[];
  invoices: Invoice[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onUpdatePartner?: (partner: Partner) => void;
  onDeletePartner?: (id: string) => void;
  onOpenQuickPayment?: (supplier: Partner) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  partners,
  invoices,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onOpenQuickPayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedSupplierHistory, setSelectedSupplierHistory] = useState<Partner | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Supplier Detail Modal Tab & Products
  const [supplierModalTab, setSupplierModalTab] = useState<'PRODUCTS' | 'INVOICES'>('PRODUCTS');
  const [supplierProductsList, setSupplierProductsList] = useState<any[]>([]);
  const [loadingSupplierProducts, setLoadingSupplierProducts] = useState(false);

  useEffect(() => {
    if (selectedSupplierHistory) {
      setLoadingSupplierProducts(true);
      SupplierService.getProducts(selectedSupplierHistory.id)
        .then(prods => setSupplierProductsList(prods || []))
        .catch(() => setSupplierProductsList([]))
        .finally(() => setLoadingSupplierProducts(false));
    } else {
      setSupplierProductsList([]);
      setSupplierModalTab('PRODUCTS');
    }
  }, [selectedSupplierHistory]);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    taxCode: '',
    phone: '',
    address: '',
    email: '',
    bankAccount: '',
    bankName: '',
    openingDebtCredit: 0,
    notes: '',
  });

  const supplierList = partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH');

  // Compute live debt for suppliers (TK 331)
  const getSupplierCurrentDebt = (partner: Partner) => {
    const supplierInvoices = invoices.filter(inv => inv.type === 'PURCHASE' && (inv.partnerId === partner.id || inv.partnerName === partner.name));
    const invoiceTotal = supplierInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const invoicePaid = supplierInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const unpaidDebt = invoiceTotal - invoicePaid;
    return (partner.openingDebtCredit || 0) + unpaidDebt;
  };

  const getSupplierTotalSupplied = (partner: Partner) => {
    const supplierInvoices = invoices.filter(inv => inv.type === 'PURCHASE' && (inv.partnerId === partner.id || inv.partnerName === partner.name));
    return supplierInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredSuppliers = supplierList.filter(s => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // KPIs
  const totalSuppliers = supplierList.length;
  const totalPayables = supplierList.reduce((sum, s) => sum + getSupplierCurrentDebt(s), 0);
  const totalSuppliedValue = supplierList.reduce((sum, s) => sum + getSupplierTotalSupplied(s), 0);
  const suppliersWithDebtCount = supplierList.filter(s => getSupplierCurrentDebt(s) > 0).length;

  const handleOpenAddModal = () => {
    setEditingPartner(null);
    setFormError(null);
    setFormData({
      code: `NCC00${supplierList.length + 1}`,
      name: '',
      taxCode: '',
      phone: '',
      address: '',
      email: '',
      bankAccount: '',
      bankName: 'Ngân hàng Techcombank',
      openingDebtCredit: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Partner) => {
    setEditingPartner(supplier);
    setFormError(null);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      taxCode: supplier.taxCode || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      email: supplier.email || '',
      bankAccount: supplier.bankAccount || '',
      bankName: supplier.bankName || '',
      openingDebtCredit: supplier.openingDebtCredit || 0,
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formData.name.trim();
    if (!cleanName) {
      setFormError('Tên đơn vị / xưởng may là bắt buộc.');
      return;
    }

    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      setFormError('Số điện thoại nhà cung cấp là bắt buộc.');
      return;
    }

    const PHONE_REGEX = /^[0-9+() -]{9,15}$/;
    if (!PHONE_REGEX.test(cleanPhone)) {
      setFormError('Số điện thoại không hợp lệ (cần từ 9 - 15 chữ số).');
      return;
    }

    // Kiểm tra trùng số điện thoại
    const isDuplicate = partners.some(p => 
      p.phone && 
      p.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '') &&
      (!editingPartner || p.id !== editingPartner.id)
    );
    if (isDuplicate) {
      setFormError(`Số điện thoại "${cleanPhone}" đã tồn tại trong hệ thống.`);
      return;
    }

    if (formData.email && formData.email.trim()) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(formData.email.trim())) {
        setFormError('Địa chỉ email không đúng định dạng.');
        return;
      }
    }

    try {
      if (editingPartner && onUpdatePartner) {
        await onUpdatePartner({
          ...editingPartner,
          ...formData,
          name: cleanName,
          phone: cleanPhone,
          type: 'SUPPLIER',
          openingDebtDebit: 0,
        });
      } else {
        await onAddPartner({
          ...formData,
          name: cleanName,
          phone: cleanPhone,
          type: 'SUPPLIER',
          openingDebtDebit: 0,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Có lỗi xảy ra khi lưu nhà cung cấp.');
    }
  };

  const handleExportCSV = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const headers = [
      'Mã NCC',
      'Tên Nhà Cung Cấp',
      'Mã Số Thuế',
      'Số Điện Thoại',
      'Email',
      'Địa Chỉ',
      'Số Tài Khoản',
      'Ngân Hàng',
      'Công Nợ Phải Trả (TK 331)'
    ];
    const rows = supplierList.map(s => [
      s.code,
      s.name,
      s.taxCode,
      s.phone,
      s.email || '',
      s.address || '',
      s.bankAccount || '',
      s.bankName || '',
      getSupplierCurrentDebt(s)
    ]);

    exportToExcel({
      title: 'DANH SÁCH NHÀ CUNG CẤP & XƯỞNG MAY GIA CÔNG D&D FASHION',
      subtitle: `Thống kê thông tin đối tác & công nợ phải trả (TK 331) | Tổng số NCC: ${supplierList.length}`,
      filename: `Danh_sach_nha_cung_cap_${today}.xlsx`,
      sheetName: 'Nha_Cung_Cap',
      headers,
      rows,
      currencyColumns: [8],
      includeTotalRow: true,
      totalLabel: 'TỔNG CÔNG NỢ PHẢI TRẢ',
      totalColumns: [8]
    });
  };

  return (
    <div id="suppliers-view" className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Nhà Cung Cấp
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#a93054] text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhà Cung Cấp</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-rose-50/60 hover:bg-rose-100 text-slate-700 font-medium text-xs px-3 py-2 rounded-xl border border-rose-200/60 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Tổng Nhà Cung Cấp</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">{totalSuppliers}</div>
          <div className="text-[10px] text-slate-400">Xưởng may & Đại lý vải</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Công Nợ Phải Trả (331)</span>
            <CreditCard className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalPayables)}</div>
          <div className="text-[10px] text-slate-400">{suppliersWithDebtCount} NCC đang có dư nợ</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Giá Trị Nhập Hàng</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(totalSuppliedValue)}</div>
          <div className="text-[10px] text-slate-400">Tổng hóa đơn mua trong kỳ</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Tài Khoản Hạch Toán</span>
            <Landmark className="w-4 h-4 text-[#fb6f92]" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">TK 331</div>
          <div className="text-[10px] text-slate-400">VAS TT133 & TT200</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-rose-100/80 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên xưởng, mã NCC, SĐT, địa chỉ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Supplier Table */}
      <TableContainer>
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#fdf2f4] text-slate-700 font-semibold border-b border-rose-100">
              <tr>
                <th className="py-3 px-4 w-28">Mã NCC</th>
                <th className="py-3 px-4">Tên Nhà Cung Cấp / Xưởng May</th>
                <th className="py-3 px-4">Thông Tin Liên Hệ</th>
                <th className="py-3 px-4">Tài Khoản Ngân Hàng</th>
                <th className="py-3 px-4 text-right">Tổng Nhập Hàng</th>
                <th className="py-3 px-4 text-right">Công Nợ Phải Trả (331)</th>
                <th className="py-3 px-4 text-center w-32">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có thông tin nhà cung cấp nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(supplier => {
                  const debt = getSupplierCurrentDebt(supplier);
                  const totalSupplied = getSupplierTotalSupplied(supplier);

                  return (
                    <tr key={supplier.id} className="hover:bg-pink-50/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                        {supplier.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{supplier.name}</div>
                        {supplier.taxCode && (
                          <div className="text-[10px] text-slate-400 font-mono">MST: {supplier.taxCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{supplier.phone || 'Chưa có SĐT'}</span>
                        </div>
                        {supplier.address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-xs">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {supplier.bankAccount ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800">{supplier.bankAccount}</div>
                            <div className="text-[10px] text-slate-500">{supplier.bankName || 'Ngân hàng'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Tiền mặt / Chưa có STK</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                        {totalSupplied > 0 ? formatCurrency(totalSupplied) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {debt > 0 ? (
                          <span className="text-rose-600 font-extrabold">{formatCurrency(debt)}</span>
                        ) : (
                          <span className="text-emerald-700">0 ₫</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedSupplierHistory(supplier)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Xem lịch sử hóa đơn mua hàng"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(supplier)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {onDeletePartner && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa nhà cung cấp ${supplier.name}?`)) {
                                  onDeletePartner(supplier.id);
                                }
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Xóa nhà cung cấp"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </TableContainer>

      {/* Supplier Products & Invoices History Modal */}
      {selectedSupplierHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Chi Tiết Nhà Cung Cấp: {selectedSupplierHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500">Mã NCC: {selectedSupplierHistory.code} • MST: {selectedSupplierHistory.taxCode || 'Chưa có'} • SĐT: {selectedSupplierHistory.phone || 'Chưa có'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSupplierHistory(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSupplierModalTab('PRODUCTS')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  supplierModalTab === 'PRODUCTS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-[#fb6f92]" />
                <span>Sản phẩm đang cung cấp ({supplierProductsList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSupplierModalTab('INVOICES')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  supplierModalTab === 'INVOICES'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Lịch sử nhập hàng ({invoices.filter(inv => inv.type === 'PURCHASE' && (inv.partnerId === selectedSupplierHistory.id || inv.partnerName === selectedSupplierHistory.name)).length})</span>
              </button>
            </div>

            {/* Tab 1: Sản phẩm đang cung cấp */}
            {supplierModalTab === 'PRODUCTS' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {loadingSupplierProducts ? (
                  <p className="text-xs text-slate-400 text-center py-8">Đang tải danh sách sản phẩm...</p>
                ) : supplierProductsList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">Nhà cung cấp này chưa có sản phẩm liên kết nào.</p>
                ) : (
                  <TableContainer maxHeight="max-h-[350px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">Sản phẩm</th>
                          <th className="p-2 w-28">Danh mục</th>
                          <th className="p-2 w-16 text-center">ĐVT</th>
                          <th className="p-2 w-28 text-right">Giá nhập gần nhất</th>
                          <th className="p-2 w-20 text-center">Tồn kho HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {supplierProductsList.map((prod, idx) => (
                          <tr key={prod.id || idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2">
                              <div className="font-bold text-slate-800">{prod.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Mã: {prod.code}</div>
                            </td>
                            <td className="p-2 text-slate-600">{prod.category || 'Thời trang'}</td>
                            <td className="p-2 text-center text-slate-500">{prod.unit || 'Cái'}</td>
                            <td className="p-2 text-right font-mono font-bold text-[#a93054]">
                              {formatCurrency(prod.lastPurchasePrice || prod.costPrice || 0)}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-slate-700">
                              {prod.currentStock ?? prod.openingQuantity ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableContainer>
                )}
              </div>
            )}

            {/* Tab 2: Lịch sử hóa đơn nhập hàng */}
            {supplierModalTab === 'INVOICES' && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {invoices
                  .filter(inv => inv.type === 'PURCHASE' && (inv.partnerId === selectedSupplierHistory.id || inv.partnerName === selectedSupplierHistory.name))
                  .length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Chưa có hóa đơn mua hàng nào từ nhà cung cấp này.</p>
                  ) : (
                    invoices
                      .filter(inv => inv.type === 'PURCHASE' && (inv.partnerId === selectedSupplierHistory.id || inv.partnerName === selectedSupplierHistory.name))
                      .map(inv => (
                        <div 
                          key={inv.id} 
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                          className="p-3.5 bg-slate-50 hover:bg-pink-50/50 border border-slate-100 hover:border-pink-200 rounded-xl flex items-center justify-between text-xs cursor-pointer transition"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-800 flex items-center gap-2">
                              <span className="text-[#a93054] hover:underline">{inv.code}</span>
                              <span className="text-[10px] text-slate-400">({formatDate(inv.date)})</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {inv.status === 'PAID' ? 'Đã trả đủ' : 'Còn nợ NCC'}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-1">
                              {inv.items.map(i => `${i.itemName} (x${i.quantity})`).join(', ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-[#a93054]">{formatCurrency(inv.grandTotal)}</div>
                            <div className="text-[10px] text-slate-400">Thuế VAT 133: {formatCurrency(inv.vatTotal)}</div>
                          </div>
                        </div>
                      ))
                  )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-rose-100">
              <button
                onClick={() => setSelectedSupplierHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoiceForDetail}
        invoice={selectedInvoiceForDetail}
        onClose={() => setSelectedInvoiceForDetail(null)}
      />

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingPartner ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Mới Nhà Cung Cấp / Xưởng May'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Nhà Cung Cấp *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Số Thuế (MST)</label>
                  <input
                    type="text"
                    value={formData.taxCode}
                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                    placeholder="VD: 0301982736"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên Đơn Vị / Xưởng May Gia Công *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Xưởng May Thời Trang Garment Vina"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-bold focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Điện Thoại *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="028 3910 8888"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Kế Toán NCC</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="dathang@garmentvina.vn"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa Chỉ Xưởng / Kho Giao Hàng</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="VD: Lô D3, KCN Tân Bình, Tân Phú, TP. Hồ Chí Minh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Tài Khoản Ngân Hàng (STK)</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="VD: 1903998822001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tên Ngân Hàng Mở STK</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="VD: Techcombank / Vietcombank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Dư Nợ Phải Trả Đầu Kỳ (TK 331)</label>
                <input
                  type="number"
                  value={formData.openingDebtCredit || ''}
                  onChange={e => setFormData({ ...formData, openingDebtCredit: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono text-rose-600 font-bold focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-white bg-[#fb6f92] hover:bg-[#a93054] rounded-xl font-semibold transition cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingPartner ? 'Cập Nhật Nhà Cung Cấp' : 'Lưu Nhà Cung Cấp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
