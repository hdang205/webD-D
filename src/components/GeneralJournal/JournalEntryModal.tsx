import React, { useState } from 'react';
import { X, Save, Plus, Trash2, BookOpenCheck } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { TableContainer } from '../Common/TableContainer';
import { JournalEntry, JournalDetail, Account } from '../../types/accounting';
import { getCurrentISODate, formatCurrency } from '../../utils/formatters';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  accounts: Account[];
}

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts
}) => {
  const [code, setCode] = useState(() => `BT${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(getCurrentISODate());
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<JournalDetail[]>([
    { accountCode: '1111', accountName: 'Tiền mặt', debitAmount: 0, creditAmount: 0 },
    { accountCode: '511', accountName: 'Doanh thu bán hàng và cung cấp dịch vụ', debitAmount: 0, creditAmount: 0 },
  ]);

  if (!isOpen) return null;

  const handleAccountChange = (index: number, accountCode: string) => {
    const acc = accounts.find(a => a.code === accountCode);
    const updated = [...details];
    updated[index] = {
      ...updated[index],
      accountCode,
      accountName: acc?.name || `Tài khoản ${accountCode}`,
    };
    setDetails(updated);
  };

  const handleDebitChange = (index: number, val: number) => {
    const updated = [...details];
    updated[index] = {
      ...updated[index],
      debitAmount: Math.max(0, val),
      creditAmount: val > 0 ? 0 : updated[index].creditAmount, // Clear credit if debit entered
    };
    setDetails(updated);
  };

  const handleCreditChange = (index: number, val: number) => {
    const updated = [...details];
    updated[index] = {
      ...updated[index],
      creditAmount: Math.max(0, val),
      debitAmount: val > 0 ? 0 : updated[index].debitAmount, // Clear debit if credit entered
    };
    setDetails(updated);
  };

  const handleAddRow = () => {
    setDetails([
      ...details,
      { accountCode: '1111', accountName: 'Tiền mặt', debitAmount: 0, creditAmount: 0 }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (details.length <= 2) {
      alert('Một bút toán phải có ít nhất 2 dòng định khoản Nợ/Có.');
      return;
    }
    setDetails(details.filter((_, i) => i !== index));
  };

  const totalDebit = details.reduce((sum, d) => sum + (d.debitAmount || 0), 0);
  const totalCredit = details.reduce((sum, d) => sum + (d.creditAmount || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return alert('Vui lòng nhập diễn giải cho bút toán.');
    if (!isBalanced) {
      alert(`Bút toán chưa cân bằng! Tổng Nợ (${formatCurrency(totalDebit)}) khác Tổng Có (${formatCurrency(totalCredit)}).`);
      return;
    }

    onSave({
      code,
      date,
      description,
      details,
      documentType: 'MANUAL',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-rose-100 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tạo Bút Toán Định Khoản Tổng Hợp (Nợ / Có)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-rose-50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã bút toán</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày hạch toán</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Diễn giải nghiệp vụ *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Trích chi phí khấu hao tài sản cố định tháng 8..."
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
            />
          </div>

          {/* Details Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">Các Dòng Định Khoản Tài Khoản</span>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-[#fb6f92] hover:text-[#a93054] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng
              </button>
            </div>

            <TableContainer maxHeight="max-h-[280px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fdf2f4] text-slate-700 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Tài Khoản Kế Toán</th>
                    <th className="py-2.5 px-3 text-right w-36">Phát Sinh Nợ</th>
                    <th className="py-2.5 px-3 text-right w-36">Phát Sinh Có</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/70 bg-white">
                  {details.map((d, idx) => (
                    <tr key={idx} className="hover:bg-pink-50/20">
                      <td className="py-2 px-3">
                        <Dropdown
                          size="sm"
                          value={d.accountCode}
                          onChange={e => handleAccountChange(idx, e.target.value)}
                          className="w-full bg-slate-50 border-slate-200 text-xs"
                          searchPlaceholder="Tìm kiếm tài khoản..."
                        >
                          {accounts.map(a => (
                            <option key={a.code} value={a.code}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </Dropdown>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={d.debitAmount || ''}
                          onChange={e => handleDebitChange(idx, Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-right font-mono text-emerald-700 font-bold focus:bg-white focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={d.creditAmount || ''}
                          onChange={e => handleCreditChange(idx, Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-right font-mono text-rose-600 font-bold focus:bg-white focus:border-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>

          {/* Balancing Check Footer */}
          <div className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-xl font-mono text-xs">
            <div className="text-slate-700">
              <span>Tổng Nợ: <strong className="text-emerald-700">{formatCurrency(totalDebit)}</strong></span>
              <span className="mx-2 text-slate-400">•</span>
              <span>Tổng Có: <strong className="text-rose-600">{formatCurrency(totalCredit)}</strong></span>
            </div>
            <div>
              {isBalanced ? (
                <span className="text-emerald-700 font-bold bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px]">✓ Bút toán CÂN BẰNG</span>
              ) : (
                <span className="text-rose-600 font-bold bg-rose-100/70 border border-rose-300 px-2 py-0.5 rounded-full text-[11px]">✕ LỆCH ({formatCurrency(Math.abs(totalDebit - totalCredit))})</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-rose-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isBalanced}
              className="flex items-center gap-1.5 px-5 py-2 text-white bg-[#fb6f92] hover:bg-[#a93054] disabled:opacity-40 rounded-xl font-semibold transition cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Ghi Sổ Bút Toán</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
