import React, { useState } from 'react';
import { X, Save, Printer, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { CashTransaction, TransactionType, Partner, Account } from '../../types/accounting';
import { getCurrentISODate } from '../../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<CashTransaction, 'id'>, andPrint?: boolean) => void;
  partners: Partner[];
  accounts: Account[];
  initialType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  partners,
  accounts,
  initialType = 'CASH_RECEIPT'
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [code, setCode] = useState(() => `${type === 'CASH_RECEIPT' ? 'PT' : type === 'CASH_PAYMENT' ? 'PC' : 'UNC'}${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(getCurrentISODate());
  const [personName, setPersonName] = useState('');
  const [personAddress, setPersonAddress] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [partnerId, setPartnerId] = useState('');
  const [fundAccountCode, setFundAccountCode] = useState('1111');
  const [oppositeAccountCode, setOppositeAccountCode] = useState('511');

  if (!isOpen) return null;

  const handlePartnerChange = (id: string) => {
    setPartnerId(id);
    const partner = partners.find(p => p.id === id);
    if (partner) {
      setPersonName(partner.name);
      setPersonAddress(partner.address);
      if (partner.type === 'CUSTOMER') setOppositeAccountCode('131');
      if (partner.type === 'SUPPLIER') setOppositeAccountCode('331');
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const prefix = newType === 'CASH_RECEIPT' ? 'PT' : newType === 'CASH_PAYMENT' ? 'PC' : 'UNC';
    setCode(`${prefix}${Math.floor(100 + Math.random() * 900)}`);
    if (newType === 'CASH_RECEIPT') {
      setFundAccountCode('1111');
      setOppositeAccountCode('511');
    } else if (newType === 'CASH_PAYMENT') {
      setFundAccountCode('1111');
      setOppositeAccountCode('642');
    } else if (newType === 'BANK_DEPOSIT') {
      setFundAccountCode('1121');
      setOppositeAccountCode('131');
    } else {
      setFundAccountCode('1121');
      setOppositeAccountCode('331');
    }
  };

  const handleSubmit = (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do thu/chi.');
      return;
    }

    const selectedPartner = partners.find(p => p.id === partnerId);

    onSave({
      code,
      date,
      type,
      personName: personName || 'Khách hàng / Đối tác',
      personAddress,
      reason,
      amount: Number(amount),
      oppositeAccountCode,
      fundAccountCode,
      partnerId,
      partnerName: selectedPartner?.name || personName || '',
      createdByName: 'Phạm Minh Trang',
    }, andPrint);

    onClose();
  };

  const isReceipt = type.includes('RECEIPT') || type.includes('DEPOSIT');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-rose-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${isReceipt ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-[#a93054]'}`}>
              {isReceipt ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isReceipt ? 'Lập Phiếu Thu / Báo Có Ngân Hàng' : 'Lập Phiếu Chi / Ủy Nhiệm Chi'}
              </h3>
              <p className="text-xs text-[#a93054] font-medium">Hỗ trợ in chứng từ kế toán chuẩn Mẫu 01-TT / 02-TT</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
          
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTypeChange('CASH_RECEIPT')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'CASH_RECEIPT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Phiếu Thu (Tiền mặt)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('CASH_PAYMENT')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'CASH_PAYMENT' ? 'bg-[#a93054] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Phiếu Chi (Tiền mặt)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('BANK_DEPOSIT')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'BANK_DEPOSIT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Báo Có (Ngân hàng)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('BANK_WITHDRAWAL')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'BANK_WITHDRAWAL' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ủy Nhiệm Chi (NH)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            
            {/* Code */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Số chứng từ *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Ngày hạch toán *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Số tiền (VNĐ) *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="VD: 15000000"
                required
                min={1000}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

          </div>

          {/* Partner & Person details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Select Partner */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Đối tác liên quan</label>
              <Dropdown
                value={partnerId}
                onChange={e => handlePartnerChange(e.target.value)}
                className="w-full bg-white border-slate-200"
                searchPlaceholder="Tìm kiếm đối tác..."
              >
                <option value="">-- Chọn khách hàng / xưởng cung cấp --</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </Dropdown>
            </div>

            {/* Person Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Họ tên người nộp / nhận tiền *</label>
              <input
                type="text"
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                placeholder="VD: Nguyễn Thu Thảo"
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

          </div>

          {/* Person Address */}
          <div className="text-xs">
            <label className="block text-slate-700 font-bold mb-1">Địa chỉ người nộp / nhận tiền</label>
            <input
              type="text"
              value={personAddress}
              onChange={e => setPersonAddress(e.target.value)}
              placeholder="VD: Showroom 120 Phố Huế, P. Bùi Thị Xuân, Q. Hai Bà Trưng, Hà Nội"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
            />
          </div>

          {/* Reason */}
          <div className="text-xs">
            <label className="block text-slate-700 font-bold mb-1">Lý do thu / chi *</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="VD: Thu tiền bán lẻ đầm dạ hội thời trang ca sáng, Chi tạm ứng xưởng may..."
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
            />
          </div>

          {/* Double-entry Ledger Preview */}
          <div className="p-3 bg-pink-50/50 border border-pink-100 rounded-2xl space-y-2 text-xs">
            <span className="font-bold text-[#a93054] block">Định khoản hạch toán tự động (VAS):</span>
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Tài khoản Quỹ ({isReceipt ? 'Nợ TK' : 'Có TK'}):</span>
                <Dropdown
                  value={fundAccountCode}
                  onChange={e => setFundAccountCode(e.target.value)}
                  className="w-full bg-white border-slate-200 font-bold font-mono"
                >
                  <option value="1111">1111 - Tiền mặt tại quỹ</option>
                  <option value="1121">1121 - Tiền gửi ngân hàng</option>
                </Dropdown>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Tài khoản Đối ứng ({isReceipt ? 'Có TK' : 'Nợ TK'}):</span>
                <Dropdown
                  value={oppositeAccountCode}
                  onChange={e => setOppositeAccountCode(e.target.value)}
                  className="w-full bg-white border-slate-200 font-bold font-mono"
                  searchPlaceholder="Tìm tài khoản đối ứng..."
                >
                  <option value="511">511 - Doanh thu bán hàng</option>
                  <option value="131">131 - Phải thu khách hàng</option>
                  <option value="331">331 - Phải trả xưởng/nhà cung cấp</option>
                  <option value="642">642 - Chi phí quản lý & vận hành</option>
                  <option value="641">641 - Chi phí bán hàng</option>
                  <option value="334">334 - Phải trả lương nhân viên</option>
                  <option value="156">156 - Mua hàng hóa thời trang</option>
                  <option value="141">141 - Tạm ứng nhân viên</option>
                </Dropdown>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Chứng Từ</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#fb6f92] to-[#a93054] hover:opacity-95 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Lưu & In Phiếu Ngay</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
