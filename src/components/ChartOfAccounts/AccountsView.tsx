import React, { useState } from 'react';
import { ListTree, Search, Plus, Eye, BookOpen } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { TableContainer } from '../Common/TableContainer';
import { Account, JournalEntry } from '../../types/accounting';
import { formatCurrency } from '../../utils/formatters';

interface AccountsViewProps {
  accounts: Account[];
  journalEntries: JournalEntry[];
  onOpenAccountLedger: (accountCode: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  journalEntries,
  onOpenAccountLedger
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || acc.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET': return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">1 & 2 - Tài sản</span>;
      case 'LIABILITY': return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">3 - Nợ phải trả</span>;
      case 'EQUITY': return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">4 - Vốn CSH</span>;
      case 'REVENUE': return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">5 - Doanh thu</span>;
      case 'EXPENSE': return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">6, 8 - Chi phí</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">9 - Khác</span>;
    }
  };

  return (
    <div id="accounts-view" className="space-y-5 pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <ListTree className="w-5 h-5" />
            </div>
            <span>Hệ Thống Tài Khoản Kế Toán (Thông Tư 133 / 200)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh mục tài khoản kế toán chuẩn mực, số dư đầu kỳ & chi tiết sổ cái tài khoản
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-rose-100/80 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số hiệu TK (111, 112, 131, 511...) hoặc tên TK..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-500 shrink-0">Loại TK:</span>
          <Dropdown
            size="sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-50 border-slate-200 font-medium"
          >
            <option value="ALL">Tất cả tài khoản</option>
            <option value="ASSET">Tài sản (TK Loại 1 & 2)</option>
            <option value="LIABILITY">Nợ phải trả (TK Loại 3)</option>
            <option value="EQUITY">Vốn chủ sở hữu (TK Loại 4)</option>
            <option value="REVENUE">Doanh thu (TK Loại 5)</option>
            <option value="EXPENSE">Chi phí (TK Loại 6 & 8)</option>
          </Dropdown>
        </div>
      </div>

      {/* Table */}
      <TableContainer>
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#fdf2f4] text-slate-700 font-semibold border-b border-rose-100">
            <tr>
              <th className="py-3 px-4">Số Hiệu TK</th>
              <th className="py-3 px-4">Tên Tài Khoản Kế Toán</th>
              <th className="py-3 px-4">Phân Loại TK</th>
              <th className="py-3 px-4 text-right">Dư Nợ Đầu Kỳ</th>
              <th className="py-3 px-4 text-right">Dư Có Đầu Kỳ</th>
              <th className="py-3 px-4 text-center">Xem Sổ Cái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-50">
            {filteredAccounts.map(acc => {
              const isChild = acc.level > 1;
              return (
                <tr key={acc.code} className={`hover:bg-pink-50/30 transition ${isChild ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className={`py-3 px-4 font-mono font-bold ${isChild ? 'pl-8 text-slate-600 text-[11px]' : 'text-[#a93054] text-xs'}`}>
                    {acc.code}
                  </td>
                  <td className={`py-3 px-4 ${isChild ? 'text-slate-600 font-normal' : 'text-slate-800 font-bold'}`}>
                    {acc.name}
                  </td>
                  <td className="py-3 px-4">
                    {getAccountTypeBadge(acc.type)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                    {acc.openingDebit ? formatCurrency(acc.openingDebit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                    {acc.openingCredit ? formatCurrency(acc.openingCredit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onOpenAccountLedger(acc.code)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a93054] hover:text-[#fb6f92] bg-pink-50 hover:bg-pink-100/80 px-2.5 py-1 rounded-lg transition cursor-pointer border border-pink-200/60"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Xem Sổ Cái</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableContainer>

    </div>
  );
};
