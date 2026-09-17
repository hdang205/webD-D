import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Crown, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Award, 
  Download, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { Partner, Invoice, CustomerTier } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/accountingEngine';
import { InvoiceDetailModal } from '../Invoices/InvoiceDetailModal';

interface CustomersViewProps {
  partners: Partner[];
  invoices: Invoice[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onUpdatePartner?: (partner: Partner) => void;
  onDeletePartner?: (id: string) => void;
  onNavigateToInvoice?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  partners,
  invoices,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onNavigateToInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Partner | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    taxCode: '',
    phone: '',
    address: '',
    email: '',
    tier: 'STANDARD' as CustomerTier,
    creditLimit: 20000000,
    openingDebtDebit: 0,
    notes: '',
  });

  const customerList = partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH');

  // Compute live debt for customers
  const getCustomerCurrentDebt = (partner: Partner) => {
    const customerInvoices = invoices.filter(inv => inv.type === 'SALES' && (inv.partnerId === partner.id || inv.partnerName === partner.name));
    const invoiceTotal = customerInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const invoicePaid = customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const unpaidInvoiceDebt = invoiceTotal - invoicePaid;
    return (partner.openingDebtDebit || 0) + unpaidInvoiceDebt;
  };

  const getCustomerTotalSpend = (partner: Partner) => {
    const customerInvoices = invoices.filter(inv => inv.type === 'SALES' && (inv.partnerId === partner.id || inv.partnerName === partner.name));
    return customerInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  };

  const filteredCustomers = customerList.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchTier = tierFilter === 'ALL' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  // KPI Calculations
  const totalCustomers = customerList.length;
  const vipCount = customerList.filter(c => c.tier === 'DIAMOND' || c.tier === 'GOLD').length;
  const totalReceivables = customerList.reduce((sum, c) => sum + getCustomerCurrentDebt(c), 0);
  const totalCreditLimit = customerList.reduce((sum, c) => sum + (c.creditLimit || 20000000), 0);

  const handleOpenAddModal = () => {
    setEditingPartner(null);
    setFormError(null);
    setFormData({
      code: `KH00${customerList.length + 1}`,
      name: '',
      taxCode: '',
      phone: '',
      address: '',
      email: '',
      tier: 'STANDARD',
      creditLimit: 20000000,
      openingDebtDebit: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Partner) => {
    setEditingPartner(customer);
    setFormError(null);
    setFormData({
      code: customer.code,
      name: customer.name,
      taxCode: customer.taxCode || '',
      phone: customer.phone || '',
      address: customer.address || '',
      email: customer.email || '',
      tier: customer.tier || 'STANDARD',
      creditLimit: customer.creditLimit || 20000000,
      openingDebtDebit: customer.openingDebtDebit || 0,
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formData.name.trim();
    if (!cleanName) {
      setFormError('Họ tên khách hàng là bắt buộc.');
      return;
    }

    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      setFormError('Số điện thoại khách hàng là bắt buộc.');
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

    if (editingPartner && onUpdatePartner) {
      onUpdatePartner({
        ...editingPartner,
        ...formData,
        name: cleanName,
        phone: cleanPhone,
        type: 'CUSTOMER',
        openingDebtCredit: 0,
      });
    } else {
      onAddPartner({
        ...formData,
        name: cleanName,
        phone: cleanPhone,
        type: 'CUSTOMER',
        openingDebtCredit: 0,
      });
    }
    setIsModalOpen(false);
  };

  const getTierBadge = (tier?: CustomerTier) => {
    switch (tier) {
      case 'DIAMOND':
        return (
          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Sparkles className="w-3 h-3 text-[#fb6f92]" /> VIP Diamond
          </span>
        );
      case 'GOLD':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Award className="w-3 h-3 text-amber-500" /> VIP Gold
          </span>
        );
      case 'SILVER':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Bạc (Silver)
          </span>
        );
      case 'WHOLESALE':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Đại Lý Sỉ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50/60 text-slate-600 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
            Thành Viên
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    let csv = '\uFEFFMã KH,Tên Khách Hàng,Phân Hạng VIP,SĐT,Email,Địa Chỉ,Mã Số Thuế,Công Nợ Phải Thu 131,Hạn Mức Tín Dụng\n';
    customerList.forEach(c => {
      csv += `"${c.code}","${c.name}","${c.tier || 'STANDARD'}","${c.phone}","${c.email || ''}","${c.address || ''}","${c.taxCode}","${getCustomerCurrentDebt(c)}","${c.creditLimit || 20000000}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Khach_Hang_DND_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="customers-view" className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Quản Lý Khách Hàng & Thẻ VIP Boutique
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hồ sơ khách hàng, phân hạng thành viên VIP, hạn mức tín dụng công nợ (TK 131)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#a93054] text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khách Hàng Mới</span>
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
            <span>Tổng Khách Hàng</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">{totalCustomers}</div>
          <div className="text-[10px] text-slate-400">Đang hoạt động trong kỳ</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Hạng VIP Diamond & Gold</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono">{vipCount} khách</div>
          <div className="text-[10px] text-slate-400">Được chiết khấu 5% - 15%</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Công Nợ Phải Thu (131)</span>
            <CreditCard className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalReceivables)}</div>
          <div className="text-[10px] text-slate-400">Dư nợ khách hàng chưa trả</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Tổng Hạn Mức Tín Dụng</span>
            <Sparkles className="w-4 h-4 text-[#fb6f92]" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">{formatCurrency(totalCreditLimit)}</div>
          <div className="text-[10px] text-slate-400">Hạn mức cấp nợ tối đa</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-rose-100/80 p-3 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã KH, SĐT, địa chỉ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-500 whitespace-nowrap">Hạng VIP:</span>
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#fb6f92]"
          >
            <option value="ALL">Tất cả phân hạng</option>
            <option value="DIAMOND">VIP Diamond</option>
            <option value="GOLD">VIP Gold</option>
            <option value="SILVER">Thành viên Bạc</option>
            <option value="WHOLESALE">Đại lý bán buôn</option>
            <option value="STANDARD">Thành viên chuẩn</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-rose-100/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-rose-50/50 text-slate-700 font-semibold border-b border-rose-100">
              <tr>
                <th className="py-3 px-4 w-28">Mã KH</th>
                <th className="py-3 px-4">Tên Khách Hàng</th>
                <th className="py-3 px-4">Phân Hạng VIP</th>
                <th className="py-3 px-4">Liên Hệ & Địa Chỉ</th>
                <th className="py-3 px-4 text-right">Tổng Mua Hàng</th>
                <th className="py-3 px-4 text-right">Công Nợ Phải Thu (131)</th>
                <th className="py-3 px-4 text-right">Hạn Mức Nợ</th>
                <th className="py-3 px-4 text-center w-28">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const debt = getCustomerCurrentDebt(customer);
                  const totalSpend = getCustomerTotalSpend(customer);
                  const isOverCredit = debt > (customer.creditLimit || 20000000);

                  return (
                    <tr key={customer.id} className="hover:bg-pink-50/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                        {customer.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{customer.name}</div>
                        {customer.taxCode && (
                          <div className="text-[10px] text-slate-400 font-mono">MST: {customer.taxCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getTierBadge(customer.tier)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{customer.phone || 'Chưa có SĐT'}</span>
                        </div>
                        {customer.address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-xs">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                        {totalSpend > 0 ? formatCurrency(totalSpend) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {debt > 0 ? (
                          <span className={isOverCredit ? 'text-rose-600 font-extrabold' : 'text-amber-700'}>
                            {formatCurrency(debt)}
                            {isOverCredit && <span className="text-[9px] block text-rose-500 font-normal">Vượt hạn mức!</span>}
                          </span>
                        ) : (
                          <span className="text-emerald-700">0 ₫</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(customer.creditLimit || 20000000)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedCustomerHistory(customer)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Xem lịch sử đơn hàng"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {onDeletePartner && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa khách hàng ${customer.name}?`)) {
                                  onDeletePartner(customer.id);
                                }
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Xóa khách hàng"
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
        </div>
      </div>

      {/* Customer Purchase History Modal */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Lịch Sử Mua Hàng: {selectedCustomerHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500">Mã KH: {selectedCustomerHistory.code} • SĐT: {selectedCustomerHistory.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomerHistory(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-rose-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {invoices
                .filter(inv => inv.type === 'SALES' && (inv.partnerId === selectedCustomerHistory.id || inv.partnerName === selectedCustomerHistory.name))
                .length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Chưa có giao dịch hóa đơn bán hàng nào phát sinh cho khách này.</p>
                ) : (
                  invoices
                    .filter(inv => inv.type === 'SALES' && (inv.partnerId === selectedCustomerHistory.id || inv.partnerName === selectedCustomerHistory.name))
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
                              {inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-1">
                            {inv.items.map(i => `${i.itemName} (x${i.quantity})`).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-[#a93054]">{formatCurrency(inv.grandTotal)}</div>
                          <div className="text-[10px] text-slate-400">VAT: {formatCurrency(inv.vatTotal)}</div>
                        </div>
                      </div>
                    ))
                )}
            </div>

            <div className="flex justify-end pt-2 border-t border-rose-100">
              <button
                onClick={() => setSelectedCustomerHistory(null)}
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {editingPartner ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Mới Khách Hàng Boutique'}
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
                  <label className="block text-slate-700 font-semibold mb-1">Mã Khách Hàng *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phân Hạng Khách Hàng</label>
                  <select
                    value={formData.tier}
                    onChange={e => setFormData({ ...formData, tier: e.target.value as CustomerTier })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  >
                    <option value="STANDARD">Thành Viên Chuẩn</option>
                    <option value="SILVER">Thành Viên Bạc (Silver)</option>
                    <option value="GOLD">VIP Gold</option>
                    <option value="DIAMOND">VIP Diamond</option>
                    <option value="WHOLESALE">Đại Lý Bán Sỉ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Họ Tên Khách Hàng / Tên Cửa Hàng *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nguyễn Thu Thảo"
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
                    placeholder="0912 345 678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Số Thuế (MST)</label>
                  <input
                    type="text"
                    value={formData.taxCode}
                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                    placeholder="VD: 0108819201"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa Chỉ Nhận Hàng / Giao Hàng</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="VD: 45 Nguyễn Thái Học, Ba Đình, Hà Nội"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hạn Mức Công Nợ Cấp Cho Khách (VND)</label>
                  <input
                    type="number"
                    value={formData.creditLimit || ''}
                    onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    placeholder="20000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dư Nợ Phải Thu Đầu Kỳ (TK 131)</label>
                  <input
                    type="number"
                    value={formData.openingDebtDebit || ''}
                    onChange={e => setFormData({ ...formData, openingDebtDebit: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono text-rose-600 font-bold focus:bg-white focus:border-[#fb6f92] focus:outline-none"
                  />
                </div>
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
                  <span>{editingPartner ? 'Cập Nhật Hồ Sơ' : 'Lưu Khách Hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
