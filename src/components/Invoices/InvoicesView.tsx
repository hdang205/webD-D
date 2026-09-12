import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Trash2, 
  DollarSign, 
  Download,
  Info
} from 'lucide-react';
import { Invoice, InvoiceType, Partner, InventoryItem } from '../../types/accounting';
import { formatCurrency, formatDate, downloadCSV } from '../../utils/formatters';
import { InvoiceModal } from './InvoiceModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  partners: Partner[];
  inventory: InventoryItem[];
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdatePayment: (id: string, paidAmount: number) => void;
  onDeleteInvoice: (id: string) => void;
  onPrintInvoice: (invoice: Invoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  partners,
  inventory,
  onAddInvoice,
  onUpdatePayment,
  onDeleteInvoice,
  onPrintInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<InvoiceType>('SALES');

  // Filtered list
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'PAID' ? inv.status === 'PAID' : inv.status !== 'PAID');

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenAdd = (type: InvoiceType) => {
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Số HĐ', 'Ký hiệu', 'Ngày lập', 'Loại', 'Đối tác', 'MST', 'Tổng tiền', 'Đã thanh toán', 'Trạng thái'];
    const rows = filteredInvoices.map(i => [
      i.code,
      i.invoiceSymbol || '',
      formatDate(i.date),
      i.type === 'SALES' ? 'Bán hàng' : 'Mua hàng',
      i.partnerName,
      i.partnerTaxCode || '',
      i.grandTotal,
      i.paidAmount,
      i.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'
    ]);
    downloadCSV('DanhSachHoaDon_DND_Fashion.csv', [headers, ...rows]);
  };

  return (
    <div id="invoices-view" className="space-y-5 pb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-pink-100 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#181a2e] flex items-center gap-2">
            <div className="p-2 bg-[#ffe5ec] text-[#a93054] rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <span>Nghiệp Vụ Hóa Đơn Bán Hàng & Mua Hàng</span>
          </h2>
          <p className="text-xs text-[#6c595f] mt-1">
            Ghi nhận doanh thu bán buôn/bán lẻ (TK 511), thuế GTGT (TK 3331/1331) & công nợ khách hàng (TK 131/331).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-sales-invoice"
            onClick={() => handleOpenAdd('SALES')}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Hóa Đơn Bán Hàng</span>
          </button>

          <button
            id="btn-add-purchase-invoice"
            onClick={() => handleOpenAdd('PURCHASE')}
            className="flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Hóa Đơn Mua Hàng / Chi Phí</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-[#fbf8ff] text-[#4e4447] font-semibold text-xs px-3 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Notice Banner explaining separation of Invoice vs Stock movement */}
      <div className="bg-[#f4f2ff] border border-pink-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#4e4447]">
        <Info className="w-4 h-4 text-[#a93054] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#181a2e]">Quy trình chuẩn kế toán thời trang D&D: </span>
          Nghiệp vụ Hóa Đơn ghi nhận Doanh thu & Công nợ tài chính độc lập. Việc xuất/nhập vật chất thực tế trong kho được kiểm soát bằng 
          <span className="font-bold text-[#a93054]"> Phiếu Nhập Kho (01-VT) </span> và <span className="font-bold text-[#a93054]"> Phiếu Xuất Kho (02-VT) </span> trong tab Quản Lý Kho.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-pink-100 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số hóa đơn, tên đối tác..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#181a2e] placeholder-slate-400 focus:outline-none focus:border-[#fb6f92]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6c595f]">Loại:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-[#fbf8ff] border border-pink-200 text-xs text-[#181a2e] rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Tất cả hóa đơn</option>
              <option value="SALES">Hóa đơn Bán hàng (Đầu ra)</option>
              <option value="PURCHASE">Hóa đơn Mua hàng (Đầu vào)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6c595f]">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-[#fbf8ff] border border-pink-200 text-xs text-[#181a2e] rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="UNPAID">Chưa thanh toán hết</option>
              <option value="PAID">Đã thanh toán đủ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#181a2e]">
            <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
              <tr>
                <th className="py-3 px-4">Số / Ký Hiệu HĐ</th>
                <th className="py-3 px-4">Ngày Lập</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4">Khách Hàng / Nhà Cung Cấp</th>
                <th className="py-3 px-4 text-right">Tổng Tiền (VNĐ)</th>
                <th className="py-3 px-4 text-right">Đã Thanh Toán</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy hóa đơn nào.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isSales = inv.type === 'SALES';
                  const remaining = inv.grandTotal - inv.paidAmount;
                  const isPaid = inv.status === 'PAID';

                  return (
                    <tr key={inv.id} className="hover:bg-[#fbf8ff] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                        {inv.code}
                        {inv.invoiceSymbol && <span className="text-[10px] text-[#6c595f] ml-1">({inv.invoiceSymbol})</span>}
                      </td>
                      <td className="py-3 px-4 text-[#6c595f]">
                        {formatDate(inv.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${isSales ? 'bg-[#ffe5ec] text-[#a93054] border border-pink-200' : 'bg-[#e0e0fc] text-[#4e4447] border border-indigo-200'}`}>
                          {isSales ? 'HĐ Bán Hàng' : 'HĐ Mua Hàng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#181a2e]">
                        {inv.partnerName}
                        {inv.partnerTaxCode && (
                          <span className="block text-[10px] text-[#6c595f] font-mono">MST: {inv.partnerTaxCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-[#181a2e]">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4e4447]">
                        {formatCurrency(inv.paidAmount)}
                        {remaining > 0 && (
                          <span className="block text-[10px] text-rose-500 font-semibold">Còn nợ: {formatCurrency(remaining)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đã xong
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" /> Còn nợ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                const pay = prompt(`Nhập số tiền thanh toán cho hóa đơn ${inv.code} (Còn nợ ${formatCurrency(remaining)}):`, remaining.toString());
                                if (pay && !isNaN(Number(pay))) {
                                  onUpdatePayment(inv.id, inv.paidAmount + Number(pay));
                                }
                              }}
                              title="Ghi nhận thanh toán hóa đơn"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="In hóa đơn bán hàng / mua hàng"
                            className="p-1.5 hover:bg-[#f4f2ff] text-[#a93054] rounded-lg transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa hóa đơn ${inv.code}?`)) {
                                onDeleteInvoice(inv.id);
                              }
                            }}
                            title="Xóa hóa đơn"
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Invoice Create Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddInvoice}
        partners={partners}
        inventory={inventory}
        initialType={modalInitialType}
      />

    </div>
  );
};
