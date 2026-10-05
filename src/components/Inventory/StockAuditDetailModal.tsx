import React from 'react';
import { X, ClipboardCheck, CheckCircle2, TrendingDown, TrendingUp, Download, Printer } from 'lucide-react';
import { StockAudit } from '../../services/inventoryService';
import { formatDate, formatNumber, formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { TableContainer } from '../Common/TableContainer';

interface StockAuditDetailModalProps {
  audit: StockAudit | null;
  onClose: () => void;
}

export const StockAuditDetailModal: React.FC<StockAuditDetailModalProps> = ({
  audit,
  onClose
}) => {
  if (!audit) return null;

  const items = audit.items || [];

  const handleExportExcel = () => {
    const headers = [
      'STT',
      'Mã Sản Phẩm',
      'Tên Sản Phẩm Thời Trang',
      'ĐVT',
      'Tồn Hệ Thống',
      'Thực Tế Kiểm Đếm',
      'Chênh Lệch',
      'Trạng Thái',
      'Giá Vốn (VNĐ)',
      'Giá Trị Chênh Lệch (VNĐ)',
      'Ghi Chú'
    ];

    const rows = items.map((it, idx) => [
      idx + 1,
      it.itemCode,
      it.itemName,
      it.unit,
      it.systemStock,
      it.actualStock,
      it.difference,
      it.status === 'MATCH' ? 'Khớp' : it.status === 'SHORTAGE' ? 'Thiếu hàng' : 'Thừa hàng',
      it.costPrice,
      it.differenceValue,
      it.note || ''
    ]);

    const dateCompact = (audit.date || '').replace(/-/g, '');

    exportToExcel({
      title: `PHIẾU KIỂM KÊ KHO HÀNG - ${audit.code}`,
      subtitle: `Ngày kiểm: ${formatDate(audit.date)} | Người thực hiện: ${audit.auditorName} | Lý do: ${audit.reason}`,
      filename: `Phieu_kiem_kho_${audit.code}_${dateCompact}.xlsx`,
      sheetName: 'Chi Tiết Kiểm Kho',
      headers,
      rows,
      currencyColumns: [8, 9],
      numberColumns: [0, 4, 5, 6],
      includeTotalRow: true,
      totalLabel: 'TỔNG CỘNG',
      totalColumns: [6, 9]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-pink-100 w-full max-w-4xl my-6 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-[#fb6f92] to-[#ff8fab] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide">CHI TIẾT PHIẾU KIỂM KHO: {audit.code}</h2>
                <span className="px-2 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-bold">
                  {audit.status}
                </span>
              </div>
              <p className="text-xs text-pink-100">Ngày kiểm: {formatDate(audit.date)} | Người thực hiện: {audit.auditorName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition cursor-pointer text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#fbf8ff] rounded-2xl border border-pink-100">
              <span className="text-[11px] font-semibold text-[#6c595f]">Tổng mặt hàng kiểm:</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {audit.totalItems} <span className="text-xs font-normal">mã</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700">Khớp hoàn toàn:</span>
              <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
                {audit.matchedCount} <span className="text-xs font-normal">mã</span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-[11px] font-semibold text-rose-700">Thiếu hàng:</span>
              <div className="text-lg font-bold font-mono text-rose-800 mt-1">
                {audit.shortageCount} <span className="text-xs font-normal">mã</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-700">Thừa hàng:</span>
              <div className="text-lg font-bold font-mono text-blue-800 mt-1">
                {audit.surplusCount} <span className="text-xs font-normal">mã</span>
              </div>
            </div>
          </div>

          {/* Reason & Note */}
          <div className="p-3.5 bg-[#fbf8ff] rounded-2xl border border-pink-100 text-xs text-[#4e4447] space-y-1">
            <div><b>Lý do kiểm kho:</b> {audit.reason}</div>
            {audit.note && <div><b>Ghi chú:</b> {audit.note}</div>}
          </div>

          {/* Items Table */}
          <TableContainer maxHeight="max-h-[340px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#fbf8ff] text-[#4e4447] text-[11px] font-bold border-b border-pink-100 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Mã & Tên Sản Phẩm</th>
                  <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-24 text-center">Tồn HT</th>
                  <th className="py-2.5 px-3 w-24 text-center">Thực Tế</th>
                  <th className="py-2.5 px-3 w-24 text-center">Chênh Lệch</th>
                  <th className="py-2.5 px-3 w-28 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50 text-xs">
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-[#fbf8ff]/60 transition">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-[#a93054] text-[11px] mr-2">{it.itemCode}</span>
                      <span className="font-medium text-slate-800">{it.itemName}</span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600">{it.unit}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                      {formatNumber(it.systemStock)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 bg-pink-50/20">
                      {formatNumber(it.actualStock)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {it.difference === 0 ? (
                        <span className="text-emerald-600">0</span>
                      ) : it.difference > 0 ? (
                        <span className="text-blue-600">+{it.difference}</span>
                      ) : (
                        <span className="text-rose-600">{it.difference}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {it.status === 'MATCH' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Khớp
                        </span>
                      )}
                      {it.status === 'SHORTAGE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <TrendingDown className="w-3 h-3 text-rose-600" />
                          Thiếu
                        </span>
                      )}
                      {it.status === 'SURPLUS' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          Thừa
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">{it.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#fbf8ff] border-t border-pink-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-pink-200 text-[#4e4447] text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
