import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Phone, 
  MapPin, 
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { Partner, PartnerType, Invoice, CashTransaction } from '../../types/accounting';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { CustomerDebtModal } from './CustomerDebtModal';
import { SupplierDebtModal } from './SupplierDebtModal';

interface DebtsViewProps {
  partners: Partner[];
  invoices: Invoice[];
  cashTransactions: CashTransaction[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onCollectDebt?: (payload: {
    partnerId: string;
    amount: number;
    date: string;
    paymentMethod: 'CASH' | 'BANK';
    note: string;
  }) => Promise<void>;
  onPayDebt?: (payload: {
    partnerId: string;
    amount: number;
    date: string;
    paymentMethod: 'CASH' | 'BANK';
    note: string;
  }) => Promise<void>;
  onOpenQuickCash?: (type: 'CASH_RECEIPT' | 'CASH_PAYMENT', partnerId: string) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  partners,
  invoices,
  cashTransactions: _cashTransactions,
  onAddPartner,
  onCollectDebt,
  onPayDebt,
  onOpenQuickCash: _onOpenQuickCash
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<{ partner: Partner; currentDebt: number } | null>(null);
  const [selectedSupplierForDebt, setSelectedSupplierForDebt] = useState<{ partner: Partner; currentDebt: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Partner Form state
  const [code, setCode] = useState(() => `KH${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [type, setType] = useState<PartnerType>('CUSTOMER');
  const [taxCode, setTaxCode] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingDebtDebit, setOpeningDebtDebit] = useState<number | ''>('');
  const [openingDebtCredit, setOpeningDebtCredit] = useState<number | ''>('');

  // Calculate realtime debt per partner
  const partnersWithDebt = partners.map(p => {
    // Sales Invoices unpaid
    const salesInvoicesDebt = invoices
      .filter(i => i.partnerId === p.id && i.type === 'SALES')
      .reduce((sum, i) => sum + (i.grandTotal - i.paidAmount), 0);

    // Purchase Invoices unpaid
    const purchaseInvoicesDebt = invoices
      .filter(i => i.partnerId === p.id && i.type === 'PURCHASE')
      .reduce((sum, i) => sum + (i.grandTotal - i.paidAmount), 0);

    const totalReceivable = (p.openingDebtDebit || 0) + salesInvoicesDebt;
    const totalPayable = (p.openingDebtCredit || 0) + purchaseInvoicesDebt;

    return {
      ...p,
      totalReceivable,
      totalPayable,
    };
  });

  const filteredPartners = partnersWithDebt.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.taxCode.includes(searchTerm);

    const matchesType = partnerTypeFilter === 'ALL' || p.type === partnerTypeFilter || p.type === 'BOTH';

    return matchesSearch && matchesType;
  });

  const grandTotalReceivables = partnersWithDebt.reduce((sum, p) => sum + p.totalReceivable, 0);
  const grandTotalPayables = partnersWithDebt.reduce((sum, p) => sum + p.totalPayable, 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên đối tác');

    onAddPartner({
      code,
      name,
      type,
      taxCode,
      phone,
      address,
      openingDebtDebit: Number(openingDebtDebit || 0),
      openingDebtCredit: Number(openingDebtCredit || 0),
    });

    setIsAddModalOpen(false);
    setName('');
    setTaxCode('');
    setPhone('');
    setAddress('');
    setOpeningDebtDebit('');
    setOpeningDebtCredit('');
    setCode(`KH${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleExportCSV = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const headers = [
       'Mã ĐT',
       'Tên Đối Tác',
       'Phân Loại',
       'Mã Số Thuế',
       'Số Điện Thoại',
       'Địa Chỉ',
       'Công Nợ Phải Thu (TK 131)',
       'Công Nợ Phải Trả (TK 331)'
    ];
    const rows = filteredPartners.map(p => [
      p.code,
      p.name,
      p.type === 'CUSTOMER' ? 'Khách hàng' : p.type === 'SUPPLIER' ? 'Nhà cung cấp' : 'Cả hai',
      p.taxCode,
      p.phone,
      p.address,
      p.totalReceivable,
      p.totalPayable
    ]);

    exportToExcel({
      title: 'BÁO CÁO CÔNG NỢ ĐỐI TÁC D&D FASHION',
      subtitle: `Theo dõi công nợ phải thu (TK 131) và công nợ phải trả (TK 331) | Tổng số đối tác: ${filteredPartners.length}`,
      filename: `Bao_cao_cong_no_${today}.xlsx`,
      sheetName: 'Cong_No',
      headers,
      rows,
      currencyColumns: [6, 7],
      includeTotalRow: true,
      totalLabel: 'TỔNG CỘNG CÔNG NỢ',
      totalColumns: [6, 7]
    });
  };

  const handleConfirmCollect = async (payload: {
    partnerId: string;
    amount: number;
    date: string;
    paymentMethod: 'CASH' | 'BANK';
    note: string;
  }) => {
    if (onCollectDebt) {
      await onCollectDebt(payload);
      setToastMessage({
        type: 'success',
        text: `Thu nợ thành công số tiền ${formatCurrency(payload.amount)} từ khách hàng!`
      });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleConfirmPay = async (payload: {
    partnerId: string;
    amount: number;
    date: string;
    paymentMethod: 'CASH' | 'BANK';
    note: string;
  }) => {
    if (onPayDebt) {
      await onPayDebt(payload);
      setToastMessage({
        type: 'success',
        text: `Chi trả nợ thành công số tiền ${formatCurrency(payload.amount)} cho nhà cung cấp!`
      });
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <div id="debts-view" className="space-y-5 pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-pink-100 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#181a2e] flex items-center gap-2">
            <div className="p-2 bg-[#ffe5ec] text-[#a93054] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span>Quản Lý Công Nợ</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Đối Tác Mới</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-[#fbf8ff] text-[#4e4447] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6c595f]">Tổng Công Nợ Phải Thu Khách Hàng (TK 131)</span>
            <div className="text-xl font-bold text-emerald-700 font-mono mt-1">{formatCurrency(grandTotalReceivables)}</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6c595f]">Tổng Công Nợ Phải Trả Nhà Cung Cấp (TK 331)</span>
            <div className="text-xl font-bold text-[#a93054] font-mono mt-1">{formatCurrency(grandTotalPayables)}</div>
          </div>
          <div className="p-3 bg-[#ffe5ec] text-[#a93054] rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-pink-100 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên shop, MST..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#181a2e] placeholder-slate-400 focus:outline-none focus:border-[#fb6f92]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#6c595f] shrink-0">Phân loại:</span>
          <Dropdown
            size="sm"
            value={partnerTypeFilter}
            onChange={e => setPartnerTypeFilter(e.target.value as any)}
            className="bg-[#fbf8ff] border-pink-200 font-medium"
          >
            <option value="ALL">Tất cả đối tác</option>
            <option value="CUSTOMER">Khách hàng thời trang (TK 131)</option>
            <option value="SUPPLIER">Nhà cung cấp xưởng may (TK 331)</option>
          </Dropdown>
        </div>
      </div>

      {/* Partners Debt Table */}
      <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#181a2e]">
            <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
              <tr>
                <th className="py-3 px-4">Mã ĐT</th>
                <th className="py-3 px-4">Tên Đối Tác</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4">Liên Hệ & Địa Chỉ</th>
                <th className="py-3 px-4 text-right">Phải Thu (131)</th>
                <th className="py-3 px-4 text-right">Phải Trả (331)</th>
                <th className="py-3 px-4 text-center">Nghiệp Vụ Thu / Trả Nợ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có thông tin đối tác phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-[#fbf8ff] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                      {p.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#181a2e]">{p.name}</div>
                      {p.taxCode && <span className="text-[10px] text-[#6c595f] font-mono">MST: {p.taxCode}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${p.type === 'CUSTOMER' ? 'bg-[#ffe5ec] text-[#a93054] border border-pink-200' : p.type === 'SUPPLIER' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {p.type === 'CUSTOMER' ? 'Khách hàng' : p.type === 'SUPPLIER' ? 'Nhà cung cấp' : 'Cả hai'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#4e4447] max-w-xs">
                      {p.phone && <div className="flex items-center gap-1 text-[11px]"><Phone className="w-3 h-3 text-[#a93054]" />{p.phone}</div>}
                      {p.address && <div className="flex items-center gap-1 text-[10px] truncate mt-0.5"><MapPin className="w-3 h-3 shrink-0 text-slate-400" />{p.address}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(p.totalReceivable)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#a93054]">
                      {formatCurrency(p.totalPayable)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.totalReceivable > 0 && (
                          <button
                            id={`btn-collect-debt-${p.code}`}
                            onClick={() => setSelectedCustomerForDebt({ partner: p, currentDebt: p.totalReceivable })}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs active:scale-95"
                            title="Lập phiếu thu nợ từ khách hàng"
                          >
                            + Thu Nợ
                          </button>
                        )}
                        {p.totalPayable > 0 && (
                          <button
                            id={`btn-pay-debt-${p.code}`}
                            onClick={() => setSelectedSupplierForDebt({ partner: p, currentDebt: p.totalPayable })}
                            className="px-2.5 py-1 bg-[#a93054] hover:bg-[#89153d] text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs active:scale-95"
                            title="Lập phiếu chi trả nợ nhà cung cấp"
                          >
                            Trả Nợ
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

      {/* Add Partner Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-pink-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-[#181a2e]">
            <h3 className="text-base font-bold text-[#181a2e] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#a93054]" />
              <span>Thêm Đối Tác Mới (Khách Hàng / Nhà Cung Cấp)</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#4e4447] font-semibold mb-1">Mã đối tác</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] font-mono focus:outline-none focus:border-[#fb6f92]"
                />
              </div>

              <div>
                <label className="block text-[#4e4447] font-semibold mb-1">Tên công ty / Shop thời trang *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="VD: Showroom Thời Trang Bella"
                  required
                  className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4e4447] font-semibold mb-1">Phân loại</label>
                  <Dropdown
                    value={type}
                    onChange={e => setType(e.target.value as PartnerType)}
                    className="w-full bg-[#fbf8ff] border-pink-200"
                  >
                    <option value="CUSTOMER">Khách hàng (TK 131)</option>
                    <option value="SUPPLIER">Nhà cung cấp (TK 331)</option>
                    <option value="BOTH">Cả hai</option>
                  </Dropdown>
                </div>

                <div>
                  <label className="block text-[#4e4447] font-semibold mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={e => setTaxCode(e.target.value)}
                    placeholder="VD: 010882192"
                    className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] font-mono focus:outline-none focus:border-[#fb6f92]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4e4447] font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0912 345 678"
                    className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
                  />
                </div>

                <div>
                  <label className="block text-[#4e4447] font-semibold mb-1">Dư nợ phải thu đầu kỳ (131)</label>
                  <input
                    type="number"
                    value={openingDebtDebit}
                    onChange={e => setOpeningDebtDebit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] font-mono focus:outline-none focus:border-[#fb6f92]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4e4447] font-semibold mb-1">Địa chỉ trụ sở / Cửa hàng</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="VD: Quận Hoàn Kiếm, Hà Nội"
                  className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-[#4e4447] hover:text-[#181a2e] bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-[#fb6f92] hover:bg-[#e0557b] rounded-xl font-bold shadow-xs"
                >
                  Lưu Đối Tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phiếu Thu Nợ Khách Hàng riêng biệt */}
      {selectedCustomerForDebt && (
        <CustomerDebtModal
          isOpen={true}
          onClose={() => setSelectedCustomerForDebt(null)}
          partner={selectedCustomerForDebt.partner}
          currentDebt={selectedCustomerForDebt.currentDebt}
          onConfirm={handleConfirmCollect}
        />
      )}

      {/* Phiếu Trả Nợ Nhà Cung Cấp riêng biệt */}
      {selectedSupplierForDebt && (
        <SupplierDebtModal
          isOpen={true}
          onClose={() => setSelectedSupplierForDebt(null)}
          partner={selectedSupplierForDebt.partner}
          currentDebt={selectedSupplierForDebt.currentDebt}
          onConfirm={handleConfirmPay}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <div className={`p-1.5 rounded-xl ${toastMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold">{toastMessage.type === 'success' ? 'Thành công' : 'Thông báo'}</div>
            <div className="text-xs text-slate-300">{toastMessage.text}</div>
          </div>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <Plus className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}

    </div>
  );
};
