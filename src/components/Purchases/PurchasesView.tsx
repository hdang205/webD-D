import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  Download, 
  Printer, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Layers, 
  Building2, 
  FileText,
  DollarSign,
  Eye
} from 'lucide-react';
import { Invoice, Partner, InventoryItem, AuthUser } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/accountingEngine';
import { exportToExcel } from '../../utils/excelExport';
import { CreatePurchaseModal } from './CreatePurchaseModal';
import { InvoiceDetailModal } from '../Invoices/InvoiceDetailModal';

interface PurchasesViewProps {
  invoices: Invoice[];
  partners: Partner[];
  inventory: InventoryItem[];
  currentUser?: AuthUser | null;
  onAddInvoice: (invoice: Omit<Invoice, 'id'>, andPrint?: boolean) => void;
  onUpdatePayment: (id: string, paidAmount: number) => void;
  onDeleteInvoice: (id: string) => void;
  onPrintInvoice: (invoice: Invoice) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  invoices,
  partners,
  inventory,
  currentUser,
  onAddInvoice,
  onUpdatePayment,
  onDeleteInvoice,
  onPrintInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

  // Filter only Purchase Invoices
  const purchaseInvoices = invoices.filter(i => i.type === 'PURCHASE');

  const filteredInvoices = purchaseInvoices.filter(inv => {
    const matchSearch = 
      inv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.partnerTaxCode && inv.partnerTaxCode.includes(searchTerm));

    let matchStatus = true;
    if (statusFilter === 'PAID') matchStatus = inv.status === 'PAID';
    if (statusFilter === 'UNPAID') matchStatus = inv.status !== 'PAID';

    return matchSearch && matchStatus;
  });

  // KPIs
  const totalPurchaseCost = purchaseInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalVatDeductible = purchaseInvoices.reduce((sum, i) => sum + i.vatTotal, 0);
  const totalPaidToSuppliers = purchaseInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalPendingSupplierDebt = totalPurchaseCost - totalPaidToSuppliers;

  const handleExportCSV = () => {
    const now = new Date();
    const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const headers = [
      'STT',
      'Mã HĐ Mua',
      'Ngày Nhập',
      'Nhà Cung Cấp / Xưởng May',
      'Mã Số Thuế',
      'Tiền Hàng Chưa VAT (VNĐ)',
      'Thuế GTGT Khấu Trừ 133 (VNĐ)',
      'Tổng Tiền Thanh Toán (VNĐ)',
      'Đã Thanh Toán (VNĐ)',
      'Công Nợ Còn Lại (VNĐ)',
      'Trạng Thái',
      'Ghi Chú'
    ];

    const rows = purchaseInvoices.map((i, idx) => [
      idx + 1,
      i.code,
      formatDate(i.date),
      i.partnerName,
      i.partnerTaxCode || '',
      i.subtotal,
      i.vatTotal,
      i.grandTotal,
      i.paidAmount,
      Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)),
      i.status === 'PAID' ? 'Đã thanh toán' : i.status === 'PARTIAL' ? 'Thanh toán 1 phần' : 'Chưa thanh toán',
      i.note || ''
    ]);

    exportToExcel({
      title: 'BÁO CÁO HÓA ĐƠN NHẬP HÀNG & MUA HÀNG D&D',
      subtitle: `Tổng giá trị nhập: ${formatCurrency(totalPurchaseCost)} | Nợ NCC: ${formatCurrency(totalPendingSupplierDebt)}`,
      filename: `Bao_cao_nhap_hang_${dateSuffix}.xlsx`,
      sheetName: 'Hóa Đơn Nhập Hàng',
      headers,
      rows,
      currencyColumns: [5, 6, 7, 8, 9],
      numberColumns: [0],
      includeTotalRow: true,
      totalLabel: 'TỔNG CỘNG',
      totalColumns: [5, 6, 7, 8, 9]
    });
  };

  return (
    <div id="purchases-view" className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Nhập Hàng Xưởng
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#a93054] text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lập Đơn Nhập Hàng</span>
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
            <span>Tổng Giá Trị Hàng Nhập</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">{formatCurrency(totalPurchaseCost)}</div>
          <div className="text-[10px] text-slate-400">{purchaseInvoices.length} lô hàng đã nhập kho</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Thuế GTGT Khấu Trừ (133)</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-700 font-mono">{formatCurrency(totalVatDeductible)}</div>
          <div className="text-[10px] text-slate-400">Được khấu trừ thuế đầu vào</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Đã Trả Xưởng May</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(totalPaidToSuppliers)}</div>
          <div className="text-[10px] text-slate-400">Tiền mặt / Chuyển khoản</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Nợ Phải Trả NCC (331)</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalPendingSupplierDebt)}</div>
          <div className="text-[10px] text-slate-400">Còn phải trả nhà cung cấp</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-rose-100/80 p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, tên nhà cung cấp / xưởng..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-500 whitespace-nowrap">Trạng thái:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${statusFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${statusFilter === 'PAID' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600'}`}
            >
              Đã trả đủ
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${statusFilter === 'UNPAID' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-600'}`}
            >
              Còn nợ NCC (331)
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Invoices Table */}
      <div className="bg-white border border-rose-100/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-rose-50/50 text-slate-700 font-semibold border-b border-rose-100">
              <tr>
                <th className="py-3 px-4 w-28">Số HĐ Nhập</th>
                <th className="py-3 px-4 w-24">Ngày Mua</th>
                <th className="py-3 px-4">Nhà Cung Cấp / Xưởng May</th>
                <th className="py-3 px-4">Chi Tiết Lô Hàng</th>
                <th className="py-3 px-4 text-right">Tổng Tiền Nhập</th>
                <th className="py-3 px-4 text-right">Đã Trả</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center w-36">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không có đơn nhập hàng nào trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => {
                  const isPaid = invoice.status === 'PAID';
                  const remainingDebt = invoice.grandTotal - invoice.paidAmount;

                  return (
                    <tr key={invoice.id} className="hover:bg-pink-50/30 transition">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedInvoiceForDetail(invoice)}
                          className="font-mono font-bold text-[#a93054] hover:underline cursor-pointer text-left block"
                          title="Bấm để xem chi tiết hóa đơn"
                        >
                          {invoice.code}
                        </button>
                        {invoice.invoiceSymbol && (
                          <div className="text-[10px] text-slate-400 font-mono">Ký hiệu: {invoice.invoiceSymbol}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => setSelectedInvoiceForDetail(invoice)}
                          className="font-bold text-slate-800 hover:text-[#a93054] cursor-pointer"
                        >
                          {invoice.partnerName}
                        </div>
                        {invoice.partnerAddress && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{invoice.partnerAddress}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-700 font-medium">
                          {invoice.items.map(i => `${i.itemName} (x${i.quantity})`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tiền hàng 156: {formatCurrency(invoice.subtotal)} • VAT 133: {formatCurrency(invoice.vatTotal)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(invoice.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(invoice.paidAmount)}
                        {remainingDebt > 0 && (
                          <div className="text-[10px] text-rose-600 font-normal">Nợ 331: {formatCurrency(remainingDebt)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3" /> Đã trả đủ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Nợ NCC 331
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoiceForDetail(invoice)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Xem chi tiết hóa đơn mua hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintInvoice(invoice)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="In hóa đơn mua hàng"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isPaid && (
                            <button
                              onClick={() => {
                                if (confirm(`Xác nhận đã thanh toán đủ ${formatCurrency(invoice.grandTotal)} cho nhà cung cấp ${invoice.partnerName}?`)) {
                                  onUpdatePayment(invoice.id, invoice.grandTotal);
                                }
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Xác nhận trả nợ đủ"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
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

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoiceForDetail}
        invoice={selectedInvoiceForDetail}
        onClose={() => setSelectedInvoiceForDetail(null)}
        onPrint={onPrintInvoice}
        onUpdatePayment={onUpdatePayment}
      />

      {/* Dedicated Purchase Creation Modal */}
      <CreatePurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddInvoice}
        partners={partners}
        inventory={inventory}
        currentUser={currentUser}
      />

    </div>
  );
};
