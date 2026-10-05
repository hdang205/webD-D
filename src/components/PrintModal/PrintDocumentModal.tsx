import React from 'react';
import { X, Printer } from 'lucide-react';
import { CashTransaction, Invoice, InventoryLog, CompanyInfo, PrintDocumentType } from '../../types/accounting';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToWords';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: CashTransaction | Invoice | InventoryLog | null;
  documentKind: PrintDocumentType;
  companyInfo: CompanyInfo;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  documentKind,
  companyInfo
}) => {
  if (!isOpen || !document) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCash = documentKind === 'CASH';
  const isInvoice = documentKind === 'INVOICE';
  const isStockImport = documentKind === 'STOCK_IMPORT';
  const isStockExport = documentKind === 'STOCK_EXPORT';
  const isStock = isStockImport || isStockExport;

  const cashDoc = isCash ? (document as CashTransaction) : null;
  const invoiceDoc = isInvoice ? (document as Invoice) : null;
  const stockDoc = isStock ? (document as InventoryLog) : null;

  // Determine standard voucher template code
  const getTemplateCode = () => {
    if (isCash) {
      return cashDoc?.type === 'CASH_RECEIPT' || cashDoc?.type === 'BANK_DEPOSIT' 
        ? 'Mẫu số 01-TT' 
        : 'Mẫu số 02-TT';
    }
    if (isStockImport) return 'Mẫu số 01-VT';
    if (isStockExport) return 'Mẫu số 02-VT';
    return invoiceDoc?.type === 'SALES' ? 'Mẫu số 01-GTKT' : 'Mẫu số 02-GTKT';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-rose-100 relative print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none print:p-6 my-auto">
        
        {/* Modal Action Header (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 border-b border-rose-100 print:hidden mb-6">
          <span className="text-xs font-bold text-[#a93054] uppercase tracking-wider">
            XEM TRƯỚC MẪU IN CHỨNG TỪ KẾ TOÁN CHUẨN ({companyInfo.accountingStandard})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-95 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="space-y-5 text-sm print:space-y-4">
          
          {/* Company Info Header */}
          <div className="flex justify-between items-start pb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="D&D Fashion" className="w-12 h-12 object-contain rounded-full border border-slate-200 bg-white p-0.5 shrink-0" />
              <div className="space-y-0.5">
                <h2 className="font-extrabold text-base text-slate-900 uppercase tracking-tight">
                  {companyInfo.name || 'CỬA HÀNG THỜI TRANG D&D'}
                </h2>
                <p className="text-xs text-slate-600">Địa chỉ: {companyInfo.address}</p>
                <p className="text-xs text-slate-600">
                  Mã số thuế: <strong>{companyInfo.taxCode}</strong> | Điện thoại: {companyInfo.phone}
                </p>
              </div>
            </div>
            <div className="text-right text-xs font-mono text-slate-700 space-y-0.5 shrink-0">
              <p className="font-bold">{getTemplateCode()}</p>
              <p className="text-[11px] text-slate-500">(Ban hành theo {companyInfo.accountingStandard})</p>
            </div>
          </div>

          {/* ==================== 1. DOCUMENT: PHIẾU NHẬP KHO / XUẤT KHO ==================== */}
          {isStock && stockDoc && (
            <>
              <div className="text-center space-y-1 pt-1">
                <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
                  {stockDoc.type === 'IMPORT' ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}
                </h1>
                <p className="text-xs text-slate-600 font-mono">
                  Ngày {formatDate(stockDoc.date)} • Số phiếu: <strong>{stockDoc.code}</strong>
                </p>
              </div>

              {/* Info Box */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl space-y-1.5 border border-slate-200 text-xs">
                <div className="flex flex-wrap gap-4 justify-between">
                  <p>
                    <strong>{stockDoc.type === 'IMPORT' ? 'Họ tên người giao hàng / NCC:' : 'Họ tên người nhận / KH:'}</strong>{' '}
                    {stockDoc.delivererOrReceiver || stockDoc.partnerName || 'Đối tác thời trang D&D'}
                  </p>
                </div>
                <p>
                  <strong>Kho hàng:</strong> {stockDoc.warehouseName || 'Kho Thời Trang D&D (TK 156)'}
                </p>
                <p>
                  <strong>Lý do {stockDoc.type === 'IMPORT' ? 'nhập kho' : 'xuất kho'}:</strong> {stockDoc.note || (stockDoc.type === 'IMPORT' ? 'Nhập kho hàng thời trang mới từ nhà cung cấp / xưởng' : 'Xuất kho bán hàng')}
                </p>
                {stockDoc.invoiceRef && (
                  <p className="font-mono text-slate-700">
                    <strong>Theo chứng từ/HĐ số:</strong> {stockDoc.invoiceRef}
                  </p>
                )}
                <div className="flex gap-8 text-[11px] font-mono text-slate-700 pt-1.5 border-t border-slate-200">
                  <span>Tài khoản kho: <strong>TK {stockDoc.stockAccountCode || '156'}</strong></span>
                  <span>Tài khoản đối ứng: <strong>TK {stockDoc.oppositeAccountCode || (stockDoc.type === 'IMPORT' ? '331' : '632')}</strong></span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-10">STT</th>
                    <th className="p-2 border border-slate-300 w-24">Mã SKU</th>
                    <th className="p-2 border border-slate-300">Tên Sản Phẩm Thời Trang</th>
                    <th className="p-2 border border-slate-300 text-center w-16">ĐVT</th>
                    <th className="p-2 border border-slate-300 text-center w-20">
                      {stockDoc.type === 'IMPORT' ? 'SL Nhập' : 'SL Xuất'}
                    </th>
                    <th className="p-2 border border-slate-300 text-right w-28">Đơn Giá</th>
                    <th className="p-2 border border-slate-300 text-right w-32">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {stockDoc.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">{item.itemCode || `SP00${idx + 1}`}</td>
                      <td className="p-2 border border-slate-300 font-semibold text-slate-900">{item.itemName}</td>
                      <td className="p-2 border border-slate-300 text-center text-slate-600">{item.unit || 'Chiếc'}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-slate-800">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="text-right font-mono text-xs pt-1 border-t border-slate-300">
                <p className="text-sm font-bold text-slate-900">
                  Tổng cộng giá trị {stockDoc.type === 'IMPORT' ? 'nhập' : 'xuất'}: {formatCurrency(stockDoc.totalValue)}
                </p>
              </div>

              {/* Words Box */}
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Tổng số tiền viết bằng chữ: </span>
                <span className="font-bold italic text-slate-900">{numberToVietnameseWords(stockDoc.totalValue)}</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-6 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">{stockDoc.type === 'IMPORT' ? 'Người Giao Hàng' : 'Người Nhận Hàng'}</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px] leading-tight">
                    {stockDoc.delivererOrReceiver || stockDoc.partnerName || 'Người giao/nhận'}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Thủ Kho</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.treasurerName || 'Vũ Quốc Hùng'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Kế Toán Trưởng</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.chiefAccountant || 'Phạm Minh Trang'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Giám Đốc</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên, đóng dấu)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.directorName || 'Lê Thị Duyên'}</p>
                </div>
              </div>
            </>
          )}

          {/* ==================== 2. DOCUMENT: PHIẾU THU / PHIẾU CHI ==================== */}
          {isCash && cashDoc && (
            <>
              <div className="text-center space-y-1 pt-1">
                <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
                  {cashDoc.type === 'CASH_RECEIPT' || cashDoc.type === 'BANK_DEPOSIT' ? 'PHIẾU THU' : 'PHIẾU CHI'}
                </h1>
                <p className="text-xs text-slate-600 font-mono">
                  Ngày {formatDate(cashDoc.date)} • Số phiếu: <strong>{cashDoc.code}</strong>
                </p>
              </div>

              {/* Info Box */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl space-y-2 border border-slate-200 text-xs">
                <div className="flex">
                  <span className="w-52 font-semibold text-slate-700">
                    {cashDoc.type === 'CASH_RECEIPT' || cashDoc.type === 'BANK_DEPOSIT' ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:'}
                  </span>
                  <span className="flex-1 font-bold text-slate-900">{cashDoc.personName || cashDoc.partnerName || 'Khách hàng / Đối tác'}</span>
                </div>

                {cashDoc.personAddress && (
                  <div className="flex">
                    <span className="w-52 font-semibold text-slate-700">Địa chỉ:</span>
                    <span className="flex-1 text-slate-800">{cashDoc.personAddress}</span>
                  </div>
                )}

                <div className="flex">
                  <span className="w-52 font-semibold text-slate-700">Lý do thu / chi:</span>
                  <span className="flex-1 italic text-slate-800">{cashDoc.reason}</span>
                </div>

                <div className="flex">
                  <span className="w-52 font-semibold text-slate-700">Số tiền:</span>
                  <span className="flex-1 font-mono font-bold text-base text-slate-900">
                    {formatCurrency(cashDoc.amount)}
                  </span>
                </div>

                <div className="flex gap-8 text-[11px] font-mono text-slate-700 pt-1.5 border-t border-slate-200">
                  <span>Tài khoản Quỹ: <strong>TK {cashDoc.fundAccountCode || '1111'}</strong></span>
                  <span>Tài khoản Đối ứng: <strong>TK {cashDoc.oppositeAccountCode || '511'}</strong></span>
                </div>
              </div>

              {/* Words Box */}
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Tổng số tiền viết bằng chữ: </span>
                <span className="font-bold italic text-slate-900">{numberToVietnameseWords(cashDoc.amount)}</span>
              </div>

              {/* Signatures for Cash */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs pt-6 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">
                    {cashDoc.type === 'CASH_RECEIPT' || cashDoc.type === 'BANK_DEPOSIT' ? 'Người Nộp Tiền' : 'Người Nhận Tiền'}
                  </p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{cashDoc.personName || 'Người nộp/nhận'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Người Lập Phiếu</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{cashDoc.createdByName || 'Phạm Minh Trang'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Thủ Quỹ</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.treasurerName || 'Vũ Quốc Hùng'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Kế Toán Trưởng</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.chiefAccountant || 'Phạm Minh Trang'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Giám Đốc</p>
                  <p className="text-[10px] text-slate-500">(Ký, đóng dấu)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.directorName || 'Lê Thị Duyên'}</p>
                </div>
              </div>
            </>
          )}

          {/* ==================== 3. DOCUMENT: HÓA ĐƠN BÁN HÀNG / MUA HÀNG ==================== */}
          {isInvoice && invoiceDoc && (
            <>
              <div className="text-center space-y-1 pt-1">
                <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
                  {invoiceDoc.type === 'SALES' ? 'HÓA ĐƠN BÁN HÀNG' : 'HÓA ĐƠN MUA HÀNG'}
                </h1>
                <p className="text-xs text-slate-600 font-mono">
                  Ký hiệu: <strong>{invoiceDoc.invoiceSymbol || 'K26T'}</strong> • Số: <strong>{invoiceDoc.code}</strong> • Ngày: {formatDate(invoiceDoc.date)}
                </p>
              </div>

              {/* Info Box */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl space-y-1.5 border border-slate-200 text-xs">
                <div className="flex flex-wrap gap-4 justify-between">
                  <p>
                    <strong>{invoiceDoc.type === 'SALES' ? 'Khách hàng / Đơn vị mua:' : 'Nhà cung cấp / Xưởng may:'}</strong>{' '}
                    {invoiceDoc.partnerName}
                  </p>
                </div>
                {invoiceDoc.partnerTaxCode && (
                  <p><strong>Mã số thuế:</strong> {invoiceDoc.partnerTaxCode}</p>
                )}
                {invoiceDoc.partnerAddress && (
                  <p><strong>Địa chỉ:</strong> {invoiceDoc.partnerAddress}</p>
                )}
                {invoiceDoc.note && (
                  <p><strong>Ghi chú / Diễn giải:</strong> {invoiceDoc.note}</p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-10">STT</th>
                    <th className="p-2 border border-slate-300 w-24">Mã SKU</th>
                    <th className="p-2 border border-slate-300">Tên Sản Phẩm Thời Trang</th>
                    <th className="p-2 border border-slate-300 text-center w-16">ĐVT</th>
                    <th className="p-2 border border-slate-300 text-center w-16">SL</th>
                    <th className="p-2 border border-slate-300 text-right w-24">Đơn Giá</th>
                    <th className="p-2 border border-slate-300 text-right w-28">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDoc.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">{item.itemCode || `SP00${idx + 1}`}</td>
                      <td className="p-2 border border-slate-300 font-semibold text-slate-900">{item.itemName}</td>
                      <td className="p-2 border border-slate-300 text-center text-slate-600">{item.unit || 'Chiếc'}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono text-slate-800">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Subtotal & VAT Breakdown */}
              <div className="space-y-1 text-right font-mono text-xs pt-1 border-t border-slate-300">
                <p>Tiền hàng: <strong>{formatCurrency(invoiceDoc.subtotal)}</strong></p>
                <p>Thuế GTGT ({invoiceDoc.items[0]?.vatRate || 8}%): <strong>{formatCurrency(invoiceDoc.vatTotal)}</strong></p>
                <p className="text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                  Tổng cộng thanh toán: {formatCurrency(invoiceDoc.grandTotal)}
                </p>
              </div>

              {/* Words Box */}
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Tổng số tiền viết bằng chữ: </span>
                <span className="font-bold italic text-slate-900">{numberToVietnameseWords(invoiceDoc.grandTotal)}</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-6 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">{invoiceDoc.type === 'SALES' ? 'Người Mua Hàng' : 'Người Bán Hàng'}</p>
                  <p className="text-[10px] text-slate-500">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{invoiceDoc.partnerName}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Người Lập Hóa Đơn</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.chiefAccountant || 'Phạm Minh Trang'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Thủ Kho / Giao Hàng</p>
                  <p className="text-[10px] text-slate-500">(Ký, họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.treasurerName || 'Vũ Quốc Hùng'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">Thủ Trưởng Đơn Vị</p>
                  <p className="text-[10px] text-slate-500">(Ký, đóng dấu)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold text-slate-800 text-[11px]">{companyInfo.directorName || 'Lê Thị Duyên'}</p>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
