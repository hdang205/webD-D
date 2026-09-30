import React, { useState } from 'react';
import { 
  BookOpenCheck, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Filter 
} from 'lucide-react';
import { JournalEntry, Account } from '../../types/accounting';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { JournalEntryModal } from './JournalEntryModal';

interface JournalViewProps {
  journalEntries: JournalEntry[];
  accounts: Account[];
  onAddJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  onDeleteJournalEntry: (id: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  journalEntries,
  accounts,
  onAddJournalEntry,
  onDeleteJournalEntry
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredEntries = journalEntries.filter(je => 
    je.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    je.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    je.details.some(d => d.accountCode.includes(searchTerm) || d.accountName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportCSV = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const headers = ['Mã Bút Toán', 'Ngày Hạch Toán', 'Diễn Giải Nghiệp Vụ', 'Số Chứng Từ', 'Mã TK', 'Tên Tài Khoản', 'Phát Sinh Nợ', 'Phát Sinh Có'];
    const rows: (string | number)[][] = [];
    
    filteredEntries.forEach(je => {
      je.details.forEach(d => {
        rows.push([
          je.code,
          formatDate(je.date),
          je.description,
          je.documentRef || '',
          d.accountCode,
          d.accountName,
          d.debitAmount || 0,
          d.creditAmount || 0
        ]);
      });
    });

    exportToExcel({
      title: 'SỔ NHẬT KÝ CHUNG D&D FASHION',
      subtitle: `Sổ chi tiết định khoản kế toán kép (VAS) | Tổng số dòng hạch toán: ${rows.length}`,
      filename: `So_nhat_ky_chung_${today}.xlsx`,
      sheetName: 'Nhat_Ky_Chung',
      headers,
      rows,
      currencyColumns: [6, 7],
      includeTotalRow: true,
      totalLabel: 'TỔNG CỘNG PHÁT SINH',
      totalColumns: [6, 7]
    });
  };

  return (
    <div id="journal-view" className="space-y-5 pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <span>Sổ Nhật Ký Chung (General Journal)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem toàn bộ các bút toán hạch toán Kế toán Nợ / Có theo thời gian thực (VAS TT133 & TT200)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#a93054] text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Bút Toán Tổng Hợp</span>
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

      {/* Search */}
      <div className="bg-white border border-rose-100/80 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã BT, diễn giải, số TK (111, 511, 642)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-white border border-rose-100/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-rose-50/50 text-slate-700 font-semibold border-b border-rose-100">
              <tr>
                <th className="py-3 px-4 w-28">Mã Bút Toán</th>
                <th className="py-3 px-4 w-28">Ngày Hạch Toán</th>
                <th className="py-3 px-4">Diễn Giải Nghiệp Vụ</th>
                <th className="py-3 px-4 w-24">Chứng Từ Ref</th>
                <th className="py-3 px-4">Định Khoản TK (Nợ / Có)</th>
                <th className="py-3 px-4 text-right w-32">Phát Sinh Nợ</th>
                <th className="py-3 px-4 text-right w-32">Phát Sinh Có</th>
                <th className="py-3 px-4 text-center w-16">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Chưa có bút toán nhật ký chung nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(je => (
                  <React.Fragment key={je.id}>
                    {je.details.map((d, dIdx) => (
                      <tr key={`${je.id}_${dIdx}`} className="hover:bg-pink-50/30 transition">
                        {dIdx === 0 && (
                          <>
                            <td rowSpan={je.details.length} className="py-3 px-4 font-mono font-bold text-slate-800 align-top border-r border-rose-50">
                              {je.code}
                            </td>
                            <td rowSpan={je.details.length} className="py-3 px-4 text-slate-500 align-top border-r border-rose-50">
                              {formatDate(je.date)}
                            </td>
                            <td rowSpan={je.details.length} className="py-3 px-4 font-medium text-slate-800 align-top border-r border-rose-50">
                              {je.description}
                            </td>
                            <td rowSpan={je.details.length} className="py-3 px-4 font-mono text-slate-500 text-[11px] align-top border-r border-rose-50">
                              {je.documentRef || '-'}
                            </td>
                          </>
                        )}

                        {/* Account details */}
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold text-emerald-700 mr-2 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">{d.accountCode}</span>
                          <span className="text-slate-600 text-[11px]">{d.accountName}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {d.debitAmount ? formatCurrency(d.debitAmount) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                          {d.creditAmount ? formatCurrency(d.creditAmount) : '-'}
                        </td>

                        {dIdx === 0 && (
                          <td rowSpan={je.details.length} className="py-3 px-4 text-center align-top border-l border-rose-50">
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa bút toán ${je.code}?`)) {
                                  onDeleteJournalEntry(je.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Xóa bút toán"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <JournalEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddJournalEntry}
        accounts={accounts}
      />

    </div>
  );
};
