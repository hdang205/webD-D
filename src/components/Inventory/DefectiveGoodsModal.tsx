import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  RefreshCw, 
  CornerUpLeft, 
  Flame, 
  Search 
} from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { InventoryProduct, InventoryService } from '../../services/inventoryService';
import { AuthUser } from '../../types/accounting';
import { formatNumber, formatCurrency } from '../../utils/formatters';

interface DefectiveGoodsModalProps {
  isOpen: boolean;
  productList: InventoryProduct[];
  currentUser?: AuthUser | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const DefectiveGoodsModal: React.FC<DefectiveGoodsModalProps> = ({
  isOpen,
  productList,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Lỗi đường may / Bung chỉ');
  const [actionType, setActionType] = useState<'REORDER' | 'RETURN_SUPPLIER' | 'DISPOSE'>('RETURN_SUPPLIER');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [handlerName, setHandlerName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setHandlerName(currentUser?.name || 'Nhân viên quản lý kho');
      setQuantity('1');
      setReason('Lỗi đường may / Bung chỉ');
      setActionType('RETURN_SUPPLIER');
      setNote('');
      setErrorMessage(null);
      setProductSearch('');

      if (productList.length > 0) {
        setSelectedProductId(productList[0].id);
      } else {
        setSelectedProductId('');
      }
    }
  }, [isOpen, productList, currentUser]);

  if (!isOpen) return null;

  const selectedProduct = productList.find(p => p.id === selectedProductId);
  const currentStock = selectedProduct ? (selectedProduct.currentStock ?? selectedProduct.openingQuantity ?? 0) : 0;
  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);
  const totalLoss = selectedProduct ? parsedQty * selectedProduct.costPrice : 0;

  // Lọc tìm kiếm sản phẩm
  const filteredProducts = productList.filter(p => 
    !productSearch || 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const quickReasons = [
    'Lỗi đường may / Bung chỉ',
    'Rách vải / Sờn vải',
    'Ố màu / Loang màu',
    'Hỏng khóa kéo / Cúc áo',
    'Lỗi đóng gói từ xưởng',
    'Hàng ẩm mốc khi lưu kho'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId || !selectedProduct) {
      setErrorMessage('Vui lòng chọn sản phẩm bị lỗi/hỏng.');
      return;
    }

    if (parsedQty <= 0) {
      setErrorMessage('Số lượng hàng lỗi phải lớn hơn 0.');
      return;
    }

    if (parsedQty > currentStock) {
      setErrorMessage(`Số lượng hàng lỗi (${parsedQty}) vượt quá tồn kho hiện tại (${currentStock} ${selectedProduct.unit}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do hàng bị lỗi/hỏng.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        productId: selectedProductId,
        quantity: parsedQty,
        reason: reason.trim(),
        actionType,
        note: note.trim() || undefined,
        date,
        handlerName: handlerName.trim() || undefined
      };

      const res = await InventoryService.recordDefect(payload);

      if (res && res.success) {
        onSuccess(res);
        onClose();
      } else {
        setErrorMessage(res?.error || 'Không thể xử lý hàng lỗi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gửi yêu cầu xử lý hàng lỗi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-pink-100 w-full max-w-2xl my-6 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-amber-600 to-rose-600 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">KHAI BÁO & XỬ LÝ SẢN PHẨM LỖI / HỎNG</h2>
              <p className="text-xs text-amber-100">Kiểm tra tồn kho, trừ kho khả dụng và phân loại hướng xử lý chính xác</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Chọn sản phẩm */}
          <div>
            <label className="block text-xs font-semibold text-[#4e4447] mb-1.5">
              Chọn Sản Phẩm Bị Lỗi / Hỏng <span className="text-rose-500">*</span>
            </label>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Lọc nhanh theo tên hoặc mã SP..."
                  className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <Dropdown
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full bg-white border-pink-200 font-medium text-slate-800"
                searchPlaceholder="Tìm kiếm sản phẩm lỗi..."
              >
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} - Tồn hiện tại: {p.currentStock ?? p.openingQuantity ?? 0} {p.unit}
                  </option>
                ))}
              </Dropdown>
            </div>
          </div>

          {/* Thông tin tồn kho & số lượng lỗi */}
          {selectedProduct && (
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#6c595f]">Tồn kho khả dụng:</span>
                <div className="text-base font-bold font-mono text-amber-900 mt-0.5">
                  {formatNumber(currentStock)} <span className="text-xs font-normal text-slate-600">{selectedProduct.unit}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#6c595f]">Giá vốn nhập (TK 156):</span>
                <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                  {formatCurrency(selectedProduct.costPrice)}
                </div>
              </div>
            </div>
          )}

          {/* Nhập số lượng lỗi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Số Lượng Hàng Lỗi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={currentStock}
                  value={quantity}
                  onChange={e => {
                    setQuantity(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                  {selectedProduct?.unit || 'sp'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Tối đa: {currentStock} {selectedProduct?.unit}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Tổng Giá Trị Thiệt Hại (Tạm Tính)
              </label>
              <div className="bg-[#fbf8ff] border border-pink-100 rounded-xl px-3 py-2 text-sm font-bold font-mono text-rose-700">
                {formatCurrency(totalLoss)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">= Số lượng x Giá vốn</p>
            </div>
          </div>

          {/* Phân loại xử lý */}
          <div>
            <label className="block text-xs font-semibold text-[#4e4447] mb-1.5">
              Phân Loại Xử Lý Hàng Lỗi <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Option 1: Trả NCC */}
              <div 
                onClick={() => setActionType('RETURN_SUPPLIER')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  actionType === 'RETURN_SUPPLIER'
                    ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                    : 'border-pink-100 hover:border-pink-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <CornerUpLeft className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Trả Nhà Cung Cấp</span>
                </div>
                <p className="text-[10px] text-[#6c595f] mt-2">
                  Xuất trả xưởng may / NCC để đổi hoặc trừ vào công nợ 331.
                </p>
              </div>

              {/* Option 2: Báo nhập lại */}
              <div 
                onClick={() => setActionType('REORDER')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  actionType === 'REORDER'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-pink-100 hover:border-pink-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Báo Nhập Lại</span>
                </div>
                <p className="text-[10px] text-[#6c595f] mt-2">
                  Tách khỏi kho bán và đề xuất phòng thu mua đặt may bù sản phẩm.
                </p>
              </div>

              {/* Option 3: Hủy hàng lỗi */}
              <div 
                onClick={() => setActionType('DISPOSE')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  actionType === 'DISPOSE'
                    ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                    : 'border-pink-100 hover:border-pink-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Hủy Hàng Lỗi</span>
                </div>
                <p className="text-[10px] text-[#6c595f] mt-2">
                  Xuất tiêu hủy vào chi phí tổn thất hàng hỏng (TK 632).
                </p>
              </div>

            </div>
          </div>

          {/* Lý do lỗi */}
          <div>
            <label className="block text-xs font-semibold text-[#4e4447] mb-1">
              Lý Do Lỗi / Hỏng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {quickReasons.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-[10px] bg-[#fbf8ff] hover:bg-pink-100 border border-pink-200 text-[#a93054] px-2 py-0.5 rounded-md cursor-pointer transition"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Thông tin phụ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Ngày Ghi Nhận
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Người Thực Hiện
              </label>
              <input
                type="text"
                value={handlerName}
                onChange={e => setHandlerName(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-[#4e4447] mb-1">
              Ghi Chú Chi Tiết
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Chi tiết về vị trí lỗi, tình trạng đóng gói, yêu cầu xưởng may..."
              className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-pink-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || parsedQty <= 0 || parsedQty > currentStock}
              className="px-5 py-2 bg-linear-to-r from-amber-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isLoading ? 'Đang xử lý...' : 'Xác Nhận Xử Lý Hàng Lỗi'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
