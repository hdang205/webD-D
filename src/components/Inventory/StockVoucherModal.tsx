import React, { useState, useEffect } from 'react';
import { X, Save, Printer, Plus, Trash2, PackagePlus, PackageMinus } from 'lucide-react';
import { InventoryItem, InventoryLog, InventoryMovementType, Partner } from '../../types/accounting';
import { getCurrentISODate, formatCurrency } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToWords';

interface StockVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (voucher: Omit<InventoryLog, 'id'>, andPrint?: boolean) => void;
  inventory: InventoryItem[];
  partners: Partner[];
  initialType?: InventoryMovementType;
}

export const StockVoucherModal: React.FC<StockVoucherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  inventory,
  partners,
  initialType = 'IMPORT',
}) => {
  const [type, setType] = useState<InventoryMovementType>(initialType);
  const [code, setCode] = useState(() => `${initialType === 'IMPORT' ? 'PN' : 'PX'}${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(getCurrentISODate());
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [delivererOrReceiver, setDelivererOrReceiver] = useState('');
  const [warehouseName, setWarehouseName] = useState('Kho Thời Trang D&D (TK 156)');
  const [stockAccountCode, setStockAccountCode] = useState('156');
  const [oppositeAccountCode, setOppositeAccountCode] = useState(initialType === 'IMPORT' ? '331' : '632');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [note, setNote] = useState('');

  const [items, setItems] = useState([
    {
      itemId: '',
      itemCode: '',
      itemName: '',
      unit: 'Chiếc',
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCode(`${initialType === 'IMPORT' ? 'PN' : 'PX'}${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`);
      setOppositeAccountCode(initialType === 'IMPORT' ? '331' : '632');
      setNote(initialType === 'IMPORT' ? 'Nhập kho hàng thời trang mới từ nhà cung cấp / xưởng' : 'Xuất kho hàng thời trang phục vụ bán lẻ & showroom');
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const handleTypeSwitch = (newType: InventoryMovementType) => {
    setType(newType);
    setCode(`${newType === 'IMPORT' ? 'PN' : 'PX'}${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`);
    setOppositeAccountCode(newType === 'IMPORT' ? '331' : '632');
    setNote(newType === 'IMPORT' ? 'Nhập kho hàng thời trang mới từ nhà cung cấp / xưởng' : 'Xuất kho hàng thời trang');
  };

  const handlePartnerSelect = (id: string) => {
    setPartnerId(id);
    const p = partners.find(part => part.id === id);
    if (p) {
      setPartnerName(p.name);
      setDelivererOrReceiver(p.name);
    }
  };

  const handleItemSelect = (index: number, selectedItemId: string) => {
    const selectedProd = inventory.find(i => i.id === selectedItemId);
    const updated = [...items];
    if (selectedProd) {
      const price = type === 'IMPORT' ? selectedProd.costPrice : selectedProd.costPrice;
      const qty = updated[index].quantity || 1;
      updated[index] = {
        itemId: selectedProd.id,
        itemCode: selectedProd.code,
        itemName: selectedProd.name,
        unit: selectedProd.unit,
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
      };
    }
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    const val = Math.max(1, qty);
    updated[index].quantity = val;
    updated[index].totalAmount = val * (updated[index].unitPrice || 0);
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    const val = Math.max(0, price);
    updated[index].unitPrice = val;
    updated[index].totalAmount = (updated[index].quantity || 1) * val;
    setItems(updated);
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        itemId: '',
        itemCode: '',
        itemName: '',
        unit: 'Chiếc',
        quantity: 1,
        unitPrice: 0,
        totalAmount: 0,
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalValue = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  const handleSubmit = (andPrint: boolean = false) => {
    if (!code.trim()) {
      alert('Vui lòng nhập số phiếu kho');
      return;
    }
    if (items.some(i => !i.itemName.trim() || !i.quantity)) {
      alert('Vui lòng chọn hoặc nhập đầy đủ thông tin hàng hóa, số lượng cho các dòng');
      return;
    }

    const voucherData: Omit<InventoryLog, 'id'> = {
      code,
      date,
      type,
      partnerId: partnerId || undefined,
      partnerName: partnerName || (type === 'IMPORT' ? 'Nhà cung cấp / Xưởng may' : 'Khách hàng / Showroom'),
      delivererOrReceiver: delivererOrReceiver || partnerName,
      warehouseName,
      stockAccountCode,
      oppositeAccountCode,
      invoiceRef: invoiceRef || undefined,
      items: items.map(i => ({
        itemId: i.itemId || `inv_${Date.now()}_${Math.random()}`,
        itemCode: i.itemCode || 'SKU-NEW',
        itemName: i.itemName,
        unit: i.unit || 'Chiếc',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalAmount: i.totalAmount,
      })),
      totalValue,
      note: note || (type === 'IMPORT' ? 'Phiếu nhập kho thời trang' : 'Phiếu xuất kho thời trang'),
    };

    onSave(voucherData, andPrint);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white text-[#181a2e] w-full max-w-4xl rounded-2xl p-6 sm:p-7 shadow-2xl border border-pink-100 relative max-h-[92vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-pink-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${type === 'IMPORT' ? 'bg-[#ffe5ec] text-[#a93054]' : 'bg-[#e0e0fc] text-[#4e4447]'}`}>
              {type === 'IMPORT' ? <PackagePlus className="w-5 h-5" /> : <PackageMinus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#181a2e]">
                {type === 'IMPORT' ? 'Lập Phiếu Nhập Kho (Mẫu 01-VT)' : 'Lập Phiếu Xuất Kho (Mẫu 02-VT)'}
              </h3>
              <p className="text-xs text-[#6c595f]">
                {type === 'IMPORT' ? 'Theo dõi nhập hàng thời trang từ xưởng/NCC & ghi nhận kho TK 156' : 'Theo dõi xuất bán hàng, xuất mẫu, xuất kho & ghi nhận giá vốn TK 632'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Type Switch */}
            <div className="flex bg-[#f4f2ff] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleTypeSwitch('IMPORT')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${type === 'IMPORT' ? 'bg-[#fb6f92] text-white shadow-xs' : 'text-[#4e4447] hover:text-[#181a2e]'}`}
              >
                Nhập Kho
              </button>
              <button
                type="button"
                onClick={() => handleTypeSwitch('EXPORT')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${type === 'EXPORT' ? 'bg-[#a93054] text-white shadow-xs' : 'text-[#4e4447] hover:text-[#181a2e]'}`}
              >
                Xuất Kho
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-4 text-xs">
          
          {/* Header Metadata Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#fbf8ff] p-4 rounded-xl border border-pink-100">
            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">Số Phiếu Kho *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">Ngày Lập Phiếu *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">
                {type === 'IMPORT' ? 'Nhà Cung Cấp / Xưởng' : 'Khách Hàng / Showroom'}
              </label>
              <select
                value={partnerId}
                onChange={e => handlePartnerSelect(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              >
                <option value="">-- Chọn đối tác mẫu --</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">
                {type === 'IMPORT' ? 'Người Giao Hàng' : 'Người Nhận Hàng'}
              </label>
              <input
                type="text"
                value={delivererOrReceiver}
                onChange={e => setDelivererOrReceiver(e.target.value)}
                placeholder={type === 'IMPORT' ? 'Tên người giao hàng...' : 'Tên khách / người nhận...'}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">Kho Hàng</label>
              <input
                type="text"
                value={warehouseName}
                onChange={e => setWarehouseName(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">Tài Khoản Kho</label>
              <select
                value={stockAccountCode}
                onChange={e => setStockAccountCode(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              >
                <option value="156">TK 156 - Hàng hóa thời trang</option>
                <option value="152">TK 152 - Nguyên vật liệu may mặc</option>
              </select>
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">TK Đối Ứng</label>
              <select
                value={oppositeAccountCode}
                onChange={e => setOppositeAccountCode(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              >
                {type === 'IMPORT' ? (
                  <>
                    <option value="331">TK 331 - Phải trả người bán / xưởng</option>
                    <option value="1111">TK 1111 - Tiền mặt tại quỹ</option>
                    <option value="1121">TK 1121 - Tiền gửi ngân hàng</option>
                  </>
                ) : (
                  <>
                    <option value="632">TK 632 - Giá vốn hàng bán</option>
                    <option value="641">TK 641 - Chi phí bán hàng (mẫu, trưng bày)</option>
                    <option value="642">TK 642 - Chi phí quản lý doanh nghiệp</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[#4e4447] font-semibold mb-1">Hóa Đơn / Chứng Từ Gốc</label>
              <input
                type="text"
                placeholder="VD: HDB001, HĐ00234..."
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[#4e4447] font-semibold mb-1">Lý Do / Diễn Giải Xuất Nhập</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-white border border-pink-200 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-[#fb6f92]"
              />
            </div>
          </div>

          {/* Product Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#181a2e] text-sm">
                Danh Sách Sản Phẩm {type === 'IMPORT' ? 'Nhập Kho' : 'Xuất Kho'}
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-[#fb6f92] hover:text-[#a93054] font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Dòng Sản Phẩm</span>
              </button>
            </div>

            <div className="border border-pink-100 rounded-xl overflow-x-auto bg-white shadow-xs">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#f4f2ff] text-[#4e4447] font-semibold border-b border-pink-100">
                  <tr>
                    <th className="p-2.5 w-10 text-center">STT</th>
                    <th className="p-2.5 w-44">Chọn Mẫu Hàng</th>
                    <th className="p-2.5">Tên Sản Phẩm Thời Trang</th>
                    <th className="p-2.5 w-20 text-center">ĐVT</th>
                    <th className="p-2.5 w-24 text-right">Số Lượng</th>
                    <th className="p-2.5 w-32 text-right">Đơn Giá (VNĐ)</th>
                    <th className="p-2.5 w-36 text-right">Thành Tiền</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#fbf8ff]">
                      <td className="p-2 text-center text-[#6c595f] font-mono">{idx + 1}</td>
                      
                      <td className="p-2">
                        <select
                          value={item.itemId}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          className="w-full bg-white border border-pink-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-[#fb6f92]"
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.code} - {inv.name} (Tồn: {inv.openingQuantity})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={e => {
                            const updated = [...items];
                            updated[idx].itemName = e.target.value;
                            setItems(updated);
                          }}
                          placeholder="Tên sản phẩm..."
                          className="w-full bg-white border border-pink-200 rounded px-2 py-1 text-slate-900 font-medium focus:outline-none focus:border-[#fb6f92]"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => {
                            const updated = [...items];
                            updated[idx].unit = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full bg-white border border-pink-200 rounded px-1.5 py-1 text-center text-slate-700 focus:outline-none focus:border-[#fb6f92]"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-full bg-white border border-pink-200 rounded px-2 py-1 text-right font-mono font-bold text-slate-900 focus:outline-none focus:border-[#fb6f92]"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={e => handlePriceChange(idx, Number(e.target.value))}
                          className="w-full bg-white border border-pink-200 rounded px-2 py-1 text-right font-mono text-slate-900 focus:outline-none focus:border-[#fb6f92]"
                        />
                      </td>

                      <td className="p-2 text-right font-mono font-bold text-[#a93054]">
                        {formatCurrency(item.totalAmount)}
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Total & In-Words Display */}
          <div className="bg-[#ffe5ec]/40 border border-pink-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs text-[#4e4447]">
              <span className="font-semibold">Bằng chữ: </span>
              <span className="font-bold italic text-[#181a2e]">{numberToVietnameseWords(totalValue)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#6c595f]">Tổng giá trị phiếu: </span>
              <span className="text-lg font-black font-mono text-[#a93054] ml-2">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer - Exactly matching user requirements [Lưu] & [In] */}
        <div className="border-t border-pink-100 pt-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4e4447] hover:bg-slate-100 transition cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-1.5 bg-[#f4f2ff] hover:bg-[#edecff] text-[#a93054] font-semibold text-xs px-4 py-2.5 rounded-xl border border-pink-200 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Lưu & In Phiếu Ngay</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Phiếu Kho</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
