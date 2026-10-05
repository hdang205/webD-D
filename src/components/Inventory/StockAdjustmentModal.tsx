import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertCircle, ArrowUpRight, ArrowDownLeft, CheckCircle2, Package } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { InventoryProduct, InventoryService } from '../../services/inventoryService';
import { formatNumber } from '../../utils/formatters';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  product?: InventoryProduct | null;
  productList: InventoryProduct[];
  onClose: () => void;
  onSuccess: (updatedProd: any) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  product: initialProduct,
  productList,
  onClose,
  onSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
      } else if (productList.length > 0) {
        setSelectedProductId(productList[0].id);
      }
      setAdjustmentType('INCREASE');
      setQuantity('1');
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen, initialProduct, productList]);

  if (!isOpen) return null;

  const currentProduct = productList.find(p => p.id === selectedProductId) || initialProduct;
  const currentStock = currentProduct ? (currentProduct.currentStock ?? currentProduct.openingQuantity ?? 0) : 0;
  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);

  const delta = adjustmentType === 'INCREASE' ? parsedQty : -parsedQty;
  const expectedStock = currentStock + delta;
  const isNegativeStock = expectedStock < 0;

  const handleQuickReason = (tag: string) => {
    setReason(tag);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId) {
      setErrorMessage('Vui lòng chọn sản phẩm cần điều chỉnh.');
      return;
    }

    if (parsedQty <= 0) {
      setErrorMessage('Số lượng điều chỉnh phải lớn hơn 0.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do điều chỉnh tồn kho.');
      return;
    }

    if (adjustmentType === 'DECREASE' && parsedQty > currentStock) {
      setErrorMessage(`Không thể xuất ${parsedQty} sản phẩm. Tồn kho hiện tại chỉ còn ${currentStock}.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await InventoryService.adjust({
        productId: selectedProductId,
        quantity: delta,
        reason: reason.trim()
      });

      if (res && res.success) {
        onSuccess(res.product);
        onClose();
      } else {
        setErrorMessage(res?.error || 'Không thể điều chỉnh tồn kho.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối khi gửi yêu cầu điều chỉnh kho.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg border border-pink-100 shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-pink-100 bg-[#fbf8ff]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ffe5ec] text-[#a93054] rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#181a2e]">
                Điều Chỉnh Số Lượng Tồn Kho
              </h3>
              <p className="text-xs text-[#6c595f]">
                Ghi nhận bù trừ kiểm kê, hàng lỗi hỏng hoặc xuất mẫu nội bộ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#181a2e] block">
              Sản phẩm thời trang <span className="text-rose-500">*</span>
            </label>
            <Dropdown
              id="select-adjust-product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-[#fbf8ff] border-pink-200"
              searchPlaceholder="Tìm kiếm sản phẩm theo tên, mã..."
            >
              {productList.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name} - (Tồn hiện tại: {formatNumber(p.currentStock ?? p.openingQuantity ?? 0)} {p.unit})
                </option>
              ))}
            </Dropdown>
          </div>

          {/* Current Stock Preview Card */}
          {currentProduct && (
            <div className="p-3 bg-[#f4f2ff] border border-pink-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white rounded-lg text-[#a93054]">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#181a2e]">{currentProduct.name}</div>
                  <div className="text-[11px] text-[#6c595f]">
                    Mã SKU: <strong className="font-mono text-[#a93054]">{currentProduct.code}</strong> | Nhóm: {currentProduct.category}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6c595f]">Tồn kho hiện tại:</div>
                <div className="text-sm font-bold font-mono text-[#181a2e]">
                  {formatNumber(currentStock)} <span className="text-xs font-normal">{currentProduct.unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Adjustment Type Tabs */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#181a2e] block">Hình thức điều chỉnh</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-adjust-increase"
                onClick={() => setAdjustmentType('INCREASE')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  adjustmentType === 'INCREASE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Nhập Thêm Tồn (+)</span>
              </button>

              <button
                type="button"
                id="btn-adjust-decrease"
                onClick={() => setAdjustmentType('DECREASE')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  adjustmentType === 'DECREASE'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Xuất / Giảm Tồn (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity & Expected Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#181a2e] block">
                Số lượng điều chỉnh <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="input-adjust-quantity"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
                placeholder="Ví dụ: 2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#181a2e] block">
                Tồn kho dự kiến sau sửa
              </label>
              <div className={`px-3 py-2 rounded-xl border font-mono font-bold text-xs flex items-center justify-between ${
                isNegativeStock
                  ? 'bg-rose-100 border-rose-300 text-rose-800'
                  : 'bg-slate-50 border-slate-200 text-[#181a2e]'
              }`}>
                <span>{formatNumber(expectedStock)}</span>
                <span className="text-[10px] font-normal text-[#6c595f]">{currentProduct?.unit}</span>
              </div>
            </div>
          </div>

          {/* Negative Stock Warning */}
          {isNegativeStock && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Cảnh báo: Hệ thống không cho phép tồn kho âm! Vui lòng giảm số lượng.</span>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[#181a2e]">
                Lý do điều chỉnh <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              type="text"
              id="input-adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do: Ví dụ 'Hàng lỗi đường may', 'Kiểm kê bù trừ'..."
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-[#181a2e] focus:outline-none focus:border-[#fb6f92]"
            />
            {/* Quick Reason Suggestion Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Hàng lỗi / rách chỉ',
                'Kiểm kê thừa',
                'Kiểm kê thiếu',
                'Hàng mẫu showroom',
                'Khách trả đổi hàng'
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickReason(tag)}
                  className="px-2 py-0.5 rounded-lg bg-[#fbf8ff] hover:bg-pink-50 border border-pink-200 text-[10px] text-[#6c595f] hover:text-[#a93054] transition cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[#4e4447] font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              id="btn-confirm-adjust"
              disabled={isLoading || isNegativeStock || parsedQty <= 0 || !reason.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#a93054] hover:bg-[#89153d] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold transition cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Điều Chỉnh</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
