import React from 'react';
import { 
  X, 
  Printer, 
  Receipt, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Sparkles,
  ShoppingBag,
  Truck,
  Building2,
  Tag,
  DollarSign
} from 'lucide-react';
import { Invoice, AuthUser } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (invoice: Invoice) => void;
  onUpdatePayment?: (id: string, paidAmount: number) => void;
  currentUser?: AuthUser | null;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onPrint,
  onUpdatePayment,
  currentUser
}) => {
  if (!isOpen || !invoice) return null;

  const isSales = invoice.type === 'SALES';
  const isPaid = invoice.status === 'PAID';
  const remainingDebt = invoice.grandTotal - invoice.paidAmount;

  const handleQuickPay = () => {
    if (!onUpdatePayment) return;
    if (confirm(`Xác nhận đối tác đã thanh toán toàn bộ số tiền còn thiếu (${formatCurrency(remainingDebt)}) cho hóa đơn ${invoice.code}?`)) {
      onUpdatePayment(invoice.id, invoice.grandTotal);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-pink-100 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#181a2e] to-slate-900 text-white p-5 flex items-center justify-between border-b border-pink-950">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isSales ? 'bg-[#fb6f92]/20 text-[#fb6f92] border border-[#fb6f92]/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
              {isSales ? <ShoppingBag className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  {isSales ? 'Chi Tiết Hóa Đơn Bán Hàng' : 'Chi Tiết Hóa Đơn Mua Hàng'}
                </h3>
                <span className="font-mono text-xs font-black bg-white/10 px-2.5 py-0.5 rounded-full text-pink-200 border border-white/10">
                  {invoice.code}
                </span>
                {invoice.invoiceSymbol && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Ký hiệu: {invoice.invoiceSymbol})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ngày lập: <strong className="text-slate-200 font-mono">{formatDate(invoice.date)}</strong> • Chứng từ số: <strong className="text-slate-200 font-mono">{invoice.invoiceNumber || invoice.code}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={() => onPrint(invoice)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer border border-white/10"
                title="In hóa đơn"
              >
                <Printer className="w-3.5 h-3.5 text-pink-300" />
                <span>In HĐ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Partner & Payment Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Partner Info Box */}
            <div className="bg-[#fbf8ff] border border-pink-100 rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-bold text-[#6c595f] uppercase tracking-wider flex items-center gap-1.5">
                {isSales ? <User className="w-3.5 h-3.5 text-[#fb6f92]" /> : <Building2 className="w-3.5 h-3.5 text-indigo-500" />}
                <span>{isSales ? 'Thông Tin Khách Hàng (TK 131)' : 'Thông Tin Xưởng / Nhà Cung Cấp (TK 331)'}</span>
              </div>
              
              <div>
                <div className="text-sm font-black text-[#181a2e]">{invoice.partnerName}</div>
                {invoice.partnerTaxCode && (
                  <div className="text-[#6c595f] font-mono text-[11px] mt-0.5">
                    Mã số thuế: <strong className="text-[#181a2e]">{invoice.partnerTaxCode}</strong>
                  </div>
                )}
                {invoice.partnerAddress && (
                  <div className="text-[#6c595f] text-[11px] flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-[#a93054] shrink-0" />
                    <span>{invoice.partnerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="bg-[#fbf8ff] border border-pink-100 rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-bold text-[#6c595f] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#a93054]" />
                  <span>Trạng Thái Thanh Toán</span>
                </span>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ĐÃ THANH TOÁN ĐỦ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                    <Clock className="w-3 h-3 text-amber-700" /> CÒN NỢ CÔNG NỢ
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white rounded-xl border border-pink-100">
                  <span className="text-[#6c595f] block">Đã thanh toán:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-pink-100">
                  <span className="text-[#6c595f] block">Còn phải thu/trả:</span>
                  <span className={`font-mono font-bold text-sm ${remainingDebt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {formatCurrency(remainingDebt)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Items Detail Table */}
          <div className="border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-[#f4f2ff] px-4 py-2.5 border-b border-pink-100 font-bold text-[#181a2e] flex items-center justify-between">
              <span>Danh Sách Mặt Hàng Chi Tiết</span>
              <span className="text-[11px] text-[#6c595f]">Số dòng: {invoice.items?.length || 0}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#181a2e]">
                <thead className="bg-pink-50/50 text-[#6c595f] font-semibold border-b border-pink-100">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">Mã & Tên Sản Phẩm</th>
                    <th className="py-2.5 px-3 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 text-right">Số Lượng</th>
                    <th className="py-2.5 px-3 text-right">Đơn Giá (VNĐ)</th>
                    {invoice.discountTotal > 0 && <th className="py-2.5 px-3 text-right">Chiết Khấu</th>}
                    <th className="py-2.5 px-3 text-right">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-[#fbf8ff]">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#181a2e]">{item.itemName}</div>
                        {item.itemCode && (
                          <div className="text-[10px] text-[#a93054] font-mono">{item.itemCode}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#6c595f]">{item.unit || 'Cái'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#181a2e]">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#4e4447]">{formatCurrency(item.unitPrice)}</td>
                      {invoice.discountTotal > 0 && (
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                          {item.discountRate ? `${item.discountRate}%` : '-'}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#a93054]">
                        {formatCurrency(item.totalAmount || (item.quantity * item.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals & Accounting Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Note & Additional Info */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Ghi Chú & Định Khoản Kế Toán:
              </span>
              <p className="text-[#6c595f] italic">
                {invoice.note || 'Hóa đơn đã được ghi nhận tự động vào hệ thống ERP theo chuẩn VAS (TT 133/200).'}
              </p>
              <div className="text-[10px] text-slate-500 font-mono pt-1">
                {isSales ? (
                  <span>Nợ TK 111, 112, 131 / Có TK 511, 3331</span>
                ) : (
                  <span>Nợ TK 156, 1331 / Có TK 111, 112, 331</span>
                )}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-[#fbf8ff] p-4 rounded-2xl border border-pink-100 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#4e4447]">
                <span>Tiền hàng trước thuế & chiết khấu:</span>
                <span className="font-mono font-bold text-[#181a2e]">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span>Chiết khấu giảm giá:</span>
                  <span className="font-mono font-bold">-{formatCurrency(invoice.discountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[#4e4447]">
                <span>Thuế GTGT ({invoice.vatRate || 8}%):</span>
                <span className="font-mono font-bold text-[#181a2e]">+{formatCurrency(invoice.vatTotal)}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-pink-100/70 rounded-xl border border-pink-200">
                <span className="font-black text-[#181a2e]">TỔNG CỘNG HÓA ĐƠN:</span>
                <span className="font-mono font-black text-sm text-[#a93054]">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-pink-100 p-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            {!isPaid && onUpdatePayment && (
              <button
                onClick={handleQuickPay}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>Xác Nhận Thu / Trả Đủ Nợ ({formatCurrency(remainingDebt)})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={() => onPrint(invoice)}
                className="flex items-center gap-1.5 bg-white hover:bg-pink-50 text-[#a93054] font-bold text-xs px-4 py-2 rounded-xl border border-pink-200 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Hóa Đơn Này</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
