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
import { Partner, PartnerType, Invoice, CashTransaction } from '../../types/accounting';
import { formatCurrency, downloadCSV } from '../../utils/formatters';

interface DebtsViewProps {
  partners: Partner[];
  invoices: Invoice[];
  cashTransactions: CashTransaction[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onOpenQuickCash: (type: 'CASH_RECEIPT' | 'CASH_PAYMENT', partnerId: string) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  partners,
  invoices,
  cashTransactions: _cashTransactions,
  onAddPartner,
  onOpenQuickCash
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    const headers = ['Mã ĐT', 'Tên Đối Tác', 'Phân loại', 'MST', 'SĐT', 'Địa chỉ', 'Công nợ phải thu (TK 131)', 'Công nợ phải trả (TK 331)'];
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
    downloadCSV('CongNoDoiTac_DND_Fashion.csv', [headers, ...rows]);
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
            <span>Quản Lý Công Nợ Khách Hàng & Nhà Cung Cấp</span>
          </h2>
          <p className="text-xs text-[#6c595f] mt-1">
            Theo dõi nợ phải thu khách hàng thời trang (TK 131) và nợ phải trả nhà cung cấp vải / may mặc (TK 331).
          </p>
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
          <span className="text-xs text-[#6c595f]">Phân loại:</span>
          <select
            value={partnerTypeFilter}
            onChange={e => setPartnerTypeFilter(e.target.value as any)}
            className="bg-[#fbf8ff] border border-pink-200 text-xs text-[#181a2e] rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">Tất cả đối tác</option>
            <option value="CUSTOMER">Khách hàng thời trang (TK 131)</option>
            <option value="SUPPLIER">Nhà cung cấp xưởng may (TK 331)</option>
          </select>
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
                            onClick={() => onOpenQuickCash('CASH_RECEIPT', p.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
                            title="Lập phiếu thu nợ từ khách hàng"
                          >
                            + Thu Nợ
                          </button>
                        )}
                        {p.totalPayable > 0 && (
                          <button
                            onClick={() => onOpenQuickCash('CASH_PAYMENT', p.id)}
                            className="px-2.5 py-1 bg-[#a93054] hover:bg-[#89153d] text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
                            title="Lập phiếu chi trả nợ nhà cung cấp"
                          >
                            - Trả Nợ
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
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as PartnerType)}
                    className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg p-2 text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
                  >
                    <option value="CUSTOMER">Khách hàng (TK 131)</option>
                    <option value="SUPPLIER">Nhà cung cấp (TK 331)</option>
                    <option value="BOTH">Cả hai</option>
                  </select>
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

    </div>
  );
};
