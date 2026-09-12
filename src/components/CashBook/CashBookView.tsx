import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download,
  Wallet
} from 'lucide-react';
import { CashTransaction, TransactionType, Partner, Account } from '../../types/accounting';
import { formatCurrency, formatDate, downloadCSV } from '../../utils/formatters';
import { TransactionModal } from './TransactionModal';

interface CashBookViewProps {
  transactions: CashTransaction[];
  partners: Partner[];
  accounts: Account[];
  onAddTransaction: (transaction: Omit<CashTransaction, 'id'>, andPrint?: boolean) => void;
  onDeleteTransaction: (id: string) => void;
  onPrintVoucher: (transaction: CashTransaction) => void;
}

export const CashBookView: React.FC<CashBookViewProps> = ({
  transactions,
  partners,
  accounts,
  onAddTransaction,
  onDeleteTransaction,
  onPrintVoucher
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fundFilter, setFundFilter] = useState<'ALL' | '1111' | '1121'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<TransactionType>('CASH_RECEIPT');

  // Filtering
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFund = fundFilter === 'ALL' || t.fundAccountCode === fundFilter;

    return matchesSearch && matchesFund;
  });

  // Calculate totals
  const totalReceipts = filteredTransactions
    .filter(t => t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = filteredTransactions
    .filter(t => t.type === 'CASH_PAYMENT' || t.type === 'BANK_WITHDRAWAL')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleOpenAddModal = (type: TransactionType) => {
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Mã CT', 'Ngày', 'Loại', 'Người nộp/nhận', 'Lý do', 'TK Quỹ', 'TK Đối ứng', 'Số tiền (VND)'];
    const rows = filteredTransactions.map(t => [
      t.code,
      formatDate(t.date),
      t.type,
      t.personName,
      t.reason,
      t.fundAccountCode,
      t.oppositeAccountCode,
      t.amount
    ]);
    downloadCSV('SoQuyThuChi_DND_Fashion.csv', [headers, ...rows]);
  };

  return (
    <div id="cashbook-view" className="space-y-5 pb-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-pink-100 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#181a2e] flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <span>Sổ Quỹ Tiền Mặt & Tiền Gửi Ngân Hàng</span>
          </h2>
          <p className="text-xs text-[#6c595f] mt-1">
            Theo dõi dòng tiền thu chi, quản lý quỹ tiền mặt (TK 1111) và tài khoản ngân hàng (TK 1121).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-receipt"
            onClick={() => handleOpenAddModal('CASH_RECEIPT')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Thu (01-TT)</span>
          </button>

          <button
            id="btn-add-payment"
            onClick={() => handleOpenAddModal('CASH_PAYMENT')}
            className="flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Chi (02-TT)</span>
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

      {/* Summary KPI Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6c595f] font-semibold">
            <span>Tổng Tiền Thu (Phiếu Thu + Nộp NH)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-2">
            +{formatCurrency(totalReceipts)}
          </div>
        </div>

        <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6c595f] font-semibold">
            <span>Tổng Tiền Chi (Phiếu Chi + Rút NH)</span>
            <ArrowUpRight className="w-4 h-4 text-[#a93054]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#a93054] mt-2">
            -{formatCurrency(totalPayments)}
          </div>
        </div>

        <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#6c595f] font-semibold">
            <span>Chênh Lệch Dòng Tiền Thuận</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className={`text-xl font-bold font-mono mt-2 ${totalReceipts >= totalPayments ? 'text-emerald-700' : 'text-[#a93054]'}`}>
            {formatCurrency(totalReceipts - totalPayments)}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-pink-100 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số phiếu, tên người nộp/nhận, lý do..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#fbf8ff] border border-pink-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#181a2e] placeholder-slate-400 focus:outline-none focus:border-[#fb6f92]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#6c595f]">Lọc quỹ:</span>
          <select
            value={fundFilter}
            onChange={e => setFundFilter(e.target.value as any)}
            className="bg-[#fbf8ff] border border-pink-200 text-xs text-[#181a2e] rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">Tất cả tài khoản quỹ</option>
            <option value="1111">Tiền mặt tại quỹ (TK 1111)</option>
            <option value="1121">Tiền gửi ngân hàng (TK 1121)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#181a2e]">
            <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
              <tr>
                <th className="py-3 px-4">Số Chứng Từ</th>
                <th className="py-3 px-4">Ngày Hạch Toán</th>
                <th className="py-3 px-4">Phân Loại</th>
                <th className="py-3 px-4">Người Nộp / Nhận Tiền</th>
                <th className="py-3 px-4">Nội Dung / Diễn Giải Thu Chi</th>
                <th className="py-3 px-4 text-center font-mono">TK Quỹ</th>
                <th className="py-3 px-4 text-center font-mono">TK Đối Ứng</th>
                <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không tìm thấy chứng từ thu/chi nào.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isReceipt = t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT';

                  return (
                    <tr key={t.id} className="hover:bg-[#fbf8ff] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#a93054]">
                        {t.code}
                      </td>
                      <td className="py-3 px-4 text-[#6c595f]">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-[10px] ${isReceipt ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#ffe5ec] text-[#a93054] border border-pink-200'}`}>
                          {t.type === 'CASH_RECEIPT' && 'Phiếu Thu (TM)'}
                          {t.type === 'CASH_PAYMENT' && 'Phiếu Chi (TM)'}
                          {t.type === 'BANK_DEPOSIT' && 'Báo Có (NH)'}
                          {t.type === 'BANK_WITHDRAWAL' && 'Báo Nợ (NH)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#181a2e]">
                        {t.personName}
                      </td>
                      <td className="py-3 px-4 text-[#4e4447]">
                        {t.reason}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {t.fundAccountCode}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {t.oppositeAccountCode}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${isReceipt ? 'text-emerald-700' : 'text-[#a93054]'}`}>
                        {isReceipt ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onPrintVoucher(t)}
                            title="In phiếu thu / chi mẫu chuẩn"
                            className="p-1.5 bg-[#f4f2ff] hover:bg-[#edecff] text-[#a93054] rounded-lg transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa chứng từ ${t.code}?`)) {
                                onDeleteTransaction(t.id);
                              }
                            }}
                            title="Xóa chứng từ"
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

      {/* Transaction Create Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddTransaction}
        partners={partners}
        accounts={accounts}
        initialType={modalInitialType}
      />

    </div>
  );
};
