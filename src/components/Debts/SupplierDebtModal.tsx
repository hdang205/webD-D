import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpRight, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { Partner } from '../../types/accounting';
import { formatCurrency, getCurrentISODate } from '../../utils/formatters';

interface SupplierDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  currentDebt: number;
  onConfirm: (payload: {
    partnerId: string;
    amount: number;
    date: string;
    paymentMethod: 'CASH' | 'BANK';
    note: string;
  }) => Promise<void>;
}

export const SupplierDebtModal: React.FC<SupplierDebtModalProps> = ({
  isOpen,
  onClose,
  partner,
  currentDebt,
  onConfirm
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(getCurrentISODate());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partner) {
      setNote(`Chi trả nợ nhà cung cấp ${partner.name}`);
      setAmount('');
      setError(null);
      setDate(getCurrentISODate());
      setPaymentMethod('CASH');
    }
  }, [partner, isOpen]);

  if (!isOpen || !partner) return null;

  const numAmount = Number(amount || 0);
  const remainingDebt = Math.max(0, currentDebt - numAmount);
  const isOverDebt = numAmount > currentDebt;

  const handleQuickAmount = (val: number) => {
    const target = Math.min(val, currentDebt);
    setAmount(target);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || numAmount <= 0) {
      setError('Số tiền trả nợ phải lớn hơn 0.');
      return;
    }

    if (numAmount > currentDebt) {
      setError(`Số tiền trả (${formatCurrency(numAmount)}) không được vượt quá số nợ hiện tại (${formatCurrency(currentDebt)}).`);
      return;
    }

    if (!date) {
      setError('Vui lòng chọn ngày trả nợ.');
      return;
    }

    if (!note.trim()) {
      setError('Vui lòng nhập nội dung hoặc lý do chi trả nợ.');
      return;
    }

    try {
      setLoading(true);
      await onConfirm({
        partnerId: partner.id,
        amount: numAmount,
        date,
        paymentMethod,
        note: note.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi thực hiện trả nợ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div 
        className="bg-white border border-pink-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-all my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-debt-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#a93054] via-[#c83761] to-[#89153d] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl shadow-xs">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="supplier-debt-modal-title" className="text-base font-bold flex items-center gap-2">
                <span>Phiếu Trả Nợ Nhà Cung Cấp</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-white/20 rounded-md">
                  TK 331
                </span>
              </h3>
              <p className="text-xs text-pink-100 mt-0.5">
                Thanh toán công nợ phải trả xưởng may gia công & cung cấp vải
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-[#181a2e]">
          
          {/* Thông tin nhà cung cấp */}
          <div className="bg-[#fbf8ff] border border-pink-100 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                    {partner.code}
                  </span>
                  <span className="font-bold text-sm text-slate-800">{partner.name}</span>
                </div>
                {partner.phone && (
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-[#fb6f92]" />
                    <span>{partner.phone}</span>
                  </div>
                )}
                {partner.address && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate max-w-xs">{partner.address}</span>
                  </div>
                )}
                {partner.bankAccount && (
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-mono font-semibold">{partner.bankAccount}</span>
                    {partner.bankName && <span className="text-slate-500">({partner.bankName})</span>}
                  </div>
                )}
              </div>

              {/* Tổng nợ hiện tại */}
              <div className="text-right shrink-0 bg-white border border-rose-100 p-2.5 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                  Tổng Nợ Phải Trả (331)
                </span>
                <span className="text-base font-bold font-mono text-[#a93054] block mt-0.5">
                  {formatCurrency(currentDebt)}
                </span>
              </div>
            </div>
          </div>

          {/* Nhập số tiền trả nợ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <span>Số Tiền Chi Trả *</span>
              </label>
              <div className="text-[11px]">
                <span className="text-slate-500">Nợ còn lại: </span>
                <span className={`font-mono font-bold ${isOverDebt ? 'text-rose-600' : 'text-[#a93054]'}`}>
                  {formatCurrency(remainingDebt)}
                </span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setAmount(val);
                  if (typeof val === 'number' && val > currentDebt) {
                    setError(`Số tiền chi trả vượt quá số nợ hiện tại (${formatCurrency(currentDebt)})`);
                  } else {
                    setError(null);
                  }
                }}
                placeholder="Nhập số tiền trả nợ (VNĐ)..."
                required
                className={`w-full bg-[#fbf8ff] border ${isOverDebt ? 'border-rose-400 ring-2 ring-rose-100' : 'border-pink-200 focus:border-[#fb6f92]'} rounded-xl p-2.5 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none transition`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>

            {/* Nút chọn nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Gợi ý nhanh:</span>
              {currentDebt >= 2000000 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(Math.round(currentDebt / 2))}
                  className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-[#a93054] rounded-lg text-[11px] font-semibold border border-pink-200 transition cursor-pointer"
                >
                  Trả 50% ({formatCurrency(Math.round(currentDebt / 2))})
                </button>
              )}
              {currentDebt >= 5000000 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount(5000000)}
                  className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-[#a93054] rounded-lg text-[11px] font-semibold border border-pink-200 transition cursor-pointer"
                >
                  5.000.000 ₫
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickAmount(currentDebt)}
                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-[#a93054] rounded-lg text-[11px] font-bold border border-rose-200 transition cursor-pointer"
              >
                Trả Toàn Bộ Nợ ({formatCurrency(currentDebt)})
              </button>
            </div>
          </div>

          {/* Ngày trả & Phương thức thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#fb6f92]" />
                <span>Ngày Trả Nợ *</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl p-2 font-mono text-slate-800 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-[#fb6f92]" />
                <span>Phương Thức Thanh Toán *</span>
              </label>
              <Dropdown
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'CASH' | 'BANK')}
                className="w-full bg-[#fbf8ff] border-pink-200 font-semibold text-slate-800"
              >
                <option value="CASH">💵 Tiền Mặt (TK Quỹ 1111)</option>
                <option value="BANK">🏦 Chuyển Khoản Ngân Hàng (TK 1121)</option>
              </Dropdown>
            </div>
          </div>

          {/* Nội dung chi trả nợ */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#fb6f92]" />
              <span>Nội Dung / Lý Do Chi Trả Nợ *</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="VD: Chi trả nợ lô vải may áo sơ mi đợt 1..."
              required
              className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#fb6f92] resize-none"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={loading || isOverDebt || numAmount <= 0}
              className="px-5 py-2 bg-[#a93054] hover:bg-[#89153d] disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Trả Nợ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
