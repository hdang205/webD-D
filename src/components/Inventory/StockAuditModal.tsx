import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Package, 
  Search,
  Sliders,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { InventoryProduct, InventoryService } from '../../services/inventoryService';
import { AuthUser } from '../../types/accounting';
import { formatNumber } from '../../utils/formatters';

interface StockAuditItemInput {
  productId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  category?: string;
  costPrice: number;
  systemStock: number;
  actualStock: number | string;
  note?: string;
}

interface StockAuditModalProps {
  isOpen: boolean;
  productList: InventoryProduct[];
  currentUser?: AuthUser | null;
  onClose: () => void;
  onSuccess: (auditResult: any) => void;
}

export const StockAuditModal: React.FC<StockAuditModalProps> = ({
  isOpen,
  productList,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditorName, setAuditorName] = useState('');
  const [reason, setReason] = useState('Kiểm kê định kỳ kho hàng D&D');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<StockAuditItemInput[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Khởi tạo state khi mở modal
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setAuditorName(currentUser?.name || 'Nhân viên kiểm kho');
      setReason('Kiểm kê định kỳ kho hàng D&D');
      setNote('');
      setErrorMessage(null);
      setShowConfirmDialog(false);
      setSelectedProductId('');
      setProductSearch('');

      // Nếu danh sách sản phẩm có sẵn, mặc định chọn 5 sản phẩm đầu tiên hoặc để trống
      if (productList.length > 0) {
        // Lấy 5 sản phẩm đầu tiên làm mẫu kiểm đếm tiện lợi
        const sampleItems: StockAuditItemInput[] = productList.slice(0, 5).map(p => {
          const sysStock = p.currentStock ?? p.openingQuantity ?? 0;
          return {
            productId: p.id,
            itemCode: p.code,
            itemName: p.name,
            unit: p.unit,
            category: p.category,
            costPrice: p.costPrice,
            systemStock: sysStock,
            actualStock: sysStock, // Mặc định khớp ban đầu
            note: ''
          };
        });
        setItems(sampleItems);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, productList, currentUser]);

  if (!isOpen) return null;

  // Lọc sản phẩm để thêm vào phiếu
  const availableToAdd = productList.filter(p => !items.some(it => it.productId === p.id));
  const filteredAvailable = availableToAdd.filter(p => {
    const matchesSearch = !productSearch || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(productList.map(p => p.category).filter(Boolean))) as string[];

  const handleAddItem = (product: InventoryProduct) => {
    const sysStock = product.currentStock ?? product.openingQuantity ?? 0;
    setItems(prev => [
      ...prev,
      {
        productId: product.id,
        itemCode: product.code,
        itemName: product.name,
        unit: product.unit,
        category: product.category,
        costPrice: product.costPrice,
        systemStock: sysStock,
        actualStock: sysStock,
        note: ''
      }
    ]);
    setSelectedProductId('');
    setProductSearch('');
    setErrorMessage(null);
  };

  const handleAddAllFromCategory = () => {
    if (selectedCategory === 'ALL') {
      // Thêm tối đa 20 sản phẩm đầu tiên chưa có
      const toAdd = availableToAdd.slice(0, 20).map(p => ({
        productId: p.id,
        itemCode: p.code,
        itemName: p.name,
        unit: p.unit,
        category: p.category,
        costPrice: p.costPrice,
        systemStock: p.currentStock ?? p.openingQuantity ?? 0,
        actualStock: p.currentStock ?? p.openingQuantity ?? 0,
        note: ''
      }));
      setItems(prev => [...prev, ...toAdd]);
    } else {
      const toAdd = availableToAdd.filter(p => p.category === selectedCategory).map(p => ({
        productId: p.id,
        itemCode: p.code,
        itemName: p.name,
        unit: p.unit,
        category: p.category,
        costPrice: p.costPrice,
        systemStock: p.currentStock ?? p.openingQuantity ?? 0,
        actualStock: p.currentStock ?? p.openingQuantity ?? 0,
        note: ''
      }));
      setItems(prev => [...prev, ...toAdd]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleActualStockChange = (index: number, val: string) => {
    setItems(prev => {
      const next = [...prev];
      if (val === '') {
        next[index].actualStock = '';
      } else {
        const parsed = parseInt(val, 10);
        next[index].actualStock = isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      return next;
    });
    setErrorMessage(null);
  };

  const handleItemNoteChange = (index: number, val: string) => {
    setItems(prev => {
      const next = [...prev];
      next[index].note = val;
      return next;
    });
  };

  // Tính toán KPI chênh lệch
  const itemDiffs = items.map(it => {
    const actStock = typeof it.actualStock === 'number' ? it.actualStock : (parseInt(String(it.actualStock), 10) || 0);
    const diff = actStock - it.systemStock;
    let status: 'MATCH' | 'SHORTAGE' | 'SURPLUS';
    if (diff === 0) status = 'MATCH';
    else if (diff < 0) status = 'SHORTAGE';
    else status = 'SURPLUS';
    return {
      ...it,
      parsedActual: actStock,
      diff,
      status
    };
  });

  const matchedCount = itemDiffs.filter(i => i.status === 'MATCH').length;
  const shortageCount = itemDiffs.filter(i => i.status === 'SHORTAGE').length;
  const surplusCount = itemDiffs.filter(i => i.status === 'SURPLUS').length;
  const totalDiffQty = itemDiffs.reduce((sum, i) => sum + i.diff, 0);

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Phiếu kiểm kho phải có ít nhất 1 sản phẩm kiểm đếm.');
      return false;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do kiểm kho.');
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.actualStock === '' || isNaN(Number(it.actualStock))) {
        setErrorMessage(`Vui lòng nhập số lượng thực tế kiểm đếm cho sản phẩm '${it.itemName}' (dòng ${i + 1}).`);
        return false;
      }
      const num = Number(it.actualStock);
      if (num < 0) {
        setErrorMessage(`Số lượng thực tế kiểm đếm không được là số âm (sản phẩm: ${it.itemName}).`);
        return false;
      }
    }

    return true;
  };

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        date,
        reason: reason.trim(),
        auditorName: auditorName.trim(),
        note: note.trim() || undefined,
        items: itemDiffs.map(it => ({
          productId: it.productId,
          actualStock: it.parsedActual,
          note: it.note ? it.note.trim() : undefined
        }))
      };

      const res = await InventoryService.createAudit(payload);

      if (res && res.success) {
        onSuccess(res);
        onClose();
      } else {
        setErrorMessage(res?.error || 'Không thể xác nhận phiếu kiểm kho.');
        setShowConfirmDialog(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gửi yêu cầu xác nhận kiểm kho.');
      setShowConfirmDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-pink-100 w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-linear-to-r from-[#fb6f92] to-[#ff8fab] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">TẠO PHIẾU KIỂM KHO (KIỂM KÊ TỒN KHO THỰC TẾ)</h2>
              <p className="text-xs text-pink-100">Đối soát số lượng tồn hệ thống với thực tế đếm tại kho và cân bằng tự động</p>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Header Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[#fbf8ff] rounded-2xl border border-pink-100">
            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Ngày Kiểm Kho <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#fb6f92]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Người Thực Hiện <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={auditorName}
                onChange={e => setAuditorName(e.target.value)}
                placeholder="Tên người kiểm kê..."
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#fb6f92]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4e4447] mb-1">
                Lý Do Kiểm Kho <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Lý do kiểm kho (vd: Định kỳ cuối tháng, đột xuất, bàn giao...)"
                className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-[#fb6f92]"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['Kiểm kê định kỳ tháng', 'Kiểm tra đột xuất', 'Bàn giao ca', 'Kiểm kho hàng mẫu'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setReason(tag)}
                    className="text-[10px] bg-white hover:bg-pink-100 border border-pink-200 text-[#a93054] px-2 py-0.5 rounded-md cursor-pointer transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Search & Quick Add Bar */}
          <div className="p-4 bg-white rounded-2xl border border-pink-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#181a2e] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#fb6f92]" />
                Chọn Sản Phẩm Cần Kiểm Đếm
              </span>
              <span className="text-[11px] text-[#6c595f]">
                Còn {availableToAdd.length} sản phẩm chưa thêm vào phiếu
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-[#fbf8ff] border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-[#4e4447] focus:outline-hidden"
              >
                <option value="ALL">Tất cả nhóm hàng</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Search product */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã SP để thêm..."
                  className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#fb6f92]"
                />
              </div>

              {/* Add All Button */}
              <button
                type="button"
                onClick={handleAddAllFromCategory}
                disabled={availableToAdd.length === 0}
                className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-[#a93054] text-xs font-semibold rounded-xl border border-pink-200 transition cursor-pointer disabled:opacity-50"
              >
                + Thêm Hàng Loạt Theo Nhóm
              </button>
            </div>

            {/* Quick Suggestions Chips if searching */}
            {productSearch && filteredAvailable.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-pink-100 rounded-xl p-2 bg-[#fbf8ff] space-y-1">
                {filteredAvailable.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddItem(p)}
                    className="flex items-center justify-between p-2 hover:bg-pink-50 rounded-lg cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#a93054]">{p.code}</span>
                      <span className="text-slate-800 font-medium">{p.name}</span>
                      <span className="text-[10px] text-slate-500">({p.unit})</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#6c595f]">Tồn hệ thống: <b>{p.currentStock ?? p.openingQuantity ?? 0}</b></span>
                      <span className="text-pink-600 font-bold hover:underline">+ Thêm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#181a2e] uppercase tracking-wide">
                Danh Sách Sản Phẩm Kiểm Đếm ({items.length})
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  Khớp: {matchedCount}
                </span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                  Thiếu: {shortageCount}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  Thừa: {surplusCount}
                </span>
              </div>
            </div>

            <div className="border border-pink-100 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fbf8ff] text-[#4e4447] text-[11px] font-bold border-b border-pink-100 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Mã & Tên Sản Phẩm</th>
                      <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 w-28 text-center bg-slate-50">Tồn Hệ Thống</th>
                      <th className="py-2.5 px-3 w-32 text-center bg-pink-50/50">Thực Tế Đếm</th>
                      <th className="py-2.5 px-3 w-28 text-center">Chênh Lệch</th>
                      <th className="py-2.5 px-3 w-28 text-center">Trạng Thái</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Ghi Chú Dòng</th>
                      <th className="py-2.5 px-2 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50 text-xs">
                    {itemDiffs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Chưa có sản phẩm nào trong phiếu kiểm kho. Vui lòng chọn sản phẩm ở trên để bắt đầu kiểm đếm.
                        </td>
                      </tr>
                    ) : (
                      itemDiffs.map((item, idx) => (
                        <tr key={item.productId} className="hover:bg-[#fbf8ff]/60 transition">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-mono font-bold text-[#a93054] text-[11px]">{item.itemCode}</div>
                            <div className="text-slate-800 font-medium text-xs leading-snug">{item.itemName}</div>
                            {item.category && (
                              <span className="text-[10px] text-slate-400">{item.category}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 text-center bg-slate-50/70 font-mono font-bold text-slate-700">
                            {formatNumber(item.systemStock)}
                          </td>
                          <td className="py-2 px-3 text-center bg-pink-50/30">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.actualStock}
                              onChange={e => handleActualStockChange(idx, e.target.value)}
                              className="w-20 text-center font-mono font-bold text-sm bg-white border border-pink-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#fb6f92]"
                            />
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-xs">
                            {item.diff === 0 ? (
                              <span className="text-emerald-600">0</span>
                            ) : item.diff > 0 ? (
                              <span className="text-blue-600">+{item.diff}</span>
                            ) : (
                              <span className="text-rose-600">{item.diff}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.status === 'MATCH' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Khớp
                              </span>
                            )}
                            {item.status === 'SHORTAGE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <TrendingDown className="w-3 h-3 text-rose-600" />
                                Thiếu hàng
                              </span>
                            )}
                            {item.status === 'SURPLUS' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <TrendingUp className="w-3 h-3 text-blue-600" />
                                Thừa hàng
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={e => handleItemNoteChange(idx, e.target.value)}
                              placeholder="Lý do chênh lệch nếu có..."
                              className="w-full bg-[#fbf8ff] border border-pink-100 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-hidden focus:bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                              title="Xóa khỏi phiếu kiểm kho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              {items.length > 0 && (
                <div className="bg-[#fbf8ff] px-4 py-3 border-t border-pink-100 flex flex-wrap items-center justify-between text-xs font-semibold text-[#4e4447] gap-3">
                  <div>
                    Tổng cộng: <b className="text-slate-800">{items.length}</b> sản phẩm kiểm đếm
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Khớp: <b className="text-emerald-700">{matchedCount}</b></span>
                    <span>Thiếu: <b className="text-rose-700">{shortageCount}</b></span>
                    <span>Thừa: <b className="text-blue-700">{surplusCount}</b></span>
                    <span>
                      Tổng chênh lệch: <b className={`font-mono ${totalDiffQty === 0 ? 'text-emerald-600' : totalDiffQty > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty}
                      </b> sp
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ghi chú toàn phiếu */}
          <div>
            <label className="block text-xs font-semibold text-[#4e4447] mb-1">
              Ghi Chú Chung Của Đợt Kiểm Kê
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú tổng kết, lưu ý của quản lý kho..."
              className="w-full bg-[#fbf8ff] border border-pink-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#fb6f92] focus:bg-white"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#fbf8ff] border-t border-pink-100 flex items-center justify-between gap-3">
          <div className="text-xs text-[#6c595f]">
            Khi xác nhận, tồn kho sẽ tự động cân bằng theo số lượng thực tế kiểm đếm.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-pink-200 text-[#4e4447] font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleStartSubmit}
              disabled={isLoading || items.length === 0}
              className="px-5 py-2 bg-linear-to-r from-[#fb6f92] to-[#e0557b] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Xác Nhận & Cân Bằng Kho</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-pink-100 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xác Nhận Cân Bằng Tồn Kho?</h3>
                <p className="text-xs text-slate-500">Phiếu kiểm kê {items.length} sản phẩm</p>
              </div>
            </div>

            <div className="p-3 bg-[#fbf8ff] rounded-xl text-xs space-y-1.5 text-[#4e4447]">
              <div className="flex justify-between">
                <span>Số lượng sản phẩm kiểm đếm:</span>
                <b>{items.length} mã</b>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Khớp hoàn toàn:</span>
                <b>{matchedCount} mã</b>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Thiếu hàng (sẽ xuất điều chỉnh giảm):</span>
                <b>{shortageCount} mã</b>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Thừa hàng (sẽ nhập điều chỉnh tăng):</span>
                <b>{surplusCount} mã</b>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống sẽ cập nhật số lượng tồn kho theo số lượng thực tế kiểm đếm và tự động tạo phiếu điều chỉnh tương ứng trong lịch sử kho. Bạn có chắc chắn muốn xác nhận?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isLoading}
                className="px-5 py-2 bg-[#fb6f92] hover:bg-[#e0557b] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {isLoading ? 'Đang xử lý...' : 'Đồng ý Cân Bằng'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
