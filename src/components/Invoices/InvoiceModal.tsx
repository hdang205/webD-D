import React, { useState } from 'react';
import { X, Save, Printer, Plus, Trash2, Receipt, Sparkles } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { TableContainer } from '../Common/TableContainer';
import { 
  Invoice, 
  InvoiceType, 
  InvoiceItem, 
  Partner, 
  InventoryItem 
} from '../../types/accounting';
import { getCurrentISODate, formatCurrency } from '../../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Omit<Invoice, 'id'>, andPrint?: boolean) => void;
  partners: Partner[];
  inventory: InventoryItem[];
  initialType?: InvoiceType;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  partners,
  inventory,
  initialType = 'SALES'
}) => {
  const [type, setType] = useState<InvoiceType>(initialType);
  const [code, setCode] = useState(() => `${type === 'SALES' ? 'HD' : 'HDM'}${Math.floor(100 + Math.random() * 900)}`);
  const [invoiceSymbol, setInvoiceSymbol] = useState(type === 'SALES' ? 'HD26T' : 'K26T');
  const [date, setDate] = useState(getCurrentISODate());
  const [dueDate, setDueDate] = useState(getCurrentISODate());
  const [partnerId, setPartnerId] = useState(type === 'SALES' ? 'p_retail' : '');
  const [note, setNote] = useState('');

  // Payment states for SALES
  const [paymentStatusOption, setPaymentStatusOption] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID');
  const [customPaidAmount, setCustomPaidAmount] = useState<number | ''>('');
  const [customerCash, setCustomerCash] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'DEBT'>('CASH');

  // Invoice Items
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    {
      itemId: '',
      itemCode: '',
      itemName: '',
      unit: 'Chiếc',
      quantity: 1,
      unitPrice: 0,
      discountRate: 0,
      discountAmount: 0,
      vatRate: 8,
      vatAmount: 0,
      totalAmount: 0,
    }
  ]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: InvoiceType) => {
    setType(newType);
    setCode(`${newType === 'SALES' ? 'HD' : 'HDM'}${Math.floor(100 + Math.random() * 900)}`);
    setInvoiceSymbol(newType === 'SALES' ? 'HD26T' : 'K26T');
    if (newType === 'SALES' && !partnerId) {
      setPartnerId('p_retail');
    }
  };

  const handlePartnerChange = (id: string) => {
    setPartnerId(id);
  };

  const handleItemSelect = (index: number, selectedItemId: string) => {
    const selectedProd = inventory.find(i => i.id === selectedItemId);
    if (!selectedProd) return;

    // Kiểm tra xem sản phẩm đã có ở dòng khác chưa
    const existingIndex = items.findIndex((it, idx) => idx !== index && it.itemId === selectedItemId);
    if (existingIndex >= 0) {
      // Đã có dòng khác chứa sản phẩm này: cộng dồn số lượng vào dòng đó
      const updated = [...items];
      const existing = updated[existingIndex];
      const newQty = existing.quantity + (updated[index].quantity || 1);
      
      const unitPrice = type === 'SALES' ? selectedProd.sellingPrice : selectedProd.costPrice;
      const discountAmount = (newQty * unitPrice * existing.discountRate) / 100;
      const amountBeforeVat = (newQty * unitPrice) - discountAmount;
      const vatAmount = (amountBeforeVat * existing.vatRate) / 100;

      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        discountAmount,
        vatAmount,
        totalAmount: amountBeforeVat + vatAmount
      };

      // Nếu đây là dòng mới thêm hoặc dòng duy nhất, xóa hoặc reset dòng hiện tại
      if (updated.length > 1) {
        setItems(updated.filter((_, idx) => idx !== index));
      } else {
        setItems(updated);
      }
      alert(`Sản phẩm [${selectedProd.name}] đã có trong đơn. Hệ thống tự động cộng dồn số lượng thành ${newQty}.`);
      return;
    }

    const updated = [...items];
    const unitPrice = type === 'SALES' ? selectedProd.sellingPrice : selectedProd.costPrice;
    const quantity = updated[index].quantity || 1;
    const discountAmount = (quantity * unitPrice * updated[index].discountRate) / 100;
    const amountBeforeVat = (quantity * unitPrice) - discountAmount;
    const vatAmount = (amountBeforeVat * updated[index].vatRate) / 100;

    updated[index] = {
      ...updated[index],
      itemId: selectedProd.id,
      itemCode: selectedProd.code,
      itemName: selectedProd.name,
      unit: selectedProd.unit,
      unitPrice,
      discountAmount,
      vatAmount,
      totalAmount: amountBeforeVat + vatAmount,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    const item = updated[index];
    const quantity = Math.max(1, qty);

    // Cảnh báo tồn kho ngay khi nhập số lượng nếu là bán hàng
    if (type === 'SALES' && item.itemId) {
      const prod = inventory.find(i => i.id === item.itemId);
      if (prod && quantity > prod.openingQuantity) {
        alert(`Sản phẩm [${prod.name}] (mã ${prod.code}) chỉ còn ${prod.openingQuantity} sản phẩm, không thể bán ${quantity} sản phẩm.`);
      }
    }

    const discountAmount = (quantity * item.unitPrice * item.discountRate) / 100;
    const amountBeforeVat = (quantity * item.unitPrice) - discountAmount;
    const vatAmount = (amountBeforeVat * item.vatRate) / 100;

    updated[index] = {
      ...item,
      quantity,
      discountAmount,
      vatAmount,
      totalAmount: amountBeforeVat + vatAmount,
    };
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    const item = updated[index];
    const unitPrice = Math.max(0, price);
    const discountAmount = (item.quantity * unitPrice * item.discountRate) / 100;
    const amountBeforeVat = (item.quantity * unitPrice) - discountAmount;
    const vatAmount = (amountBeforeVat * item.vatRate) / 100;

    updated[index] = {
      ...item,
      unitPrice,
      discountAmount,
      vatAmount,
      totalAmount: amountBeforeVat + vatAmount,
    };
    setItems(updated);
  };

  const handleDiscountChange = (index: number, rate: number) => {
    const updated = [...items];
    const item = updated[index];
    const discountRate = Math.min(100, Math.max(0, rate));
    const discountAmount = (item.quantity * item.unitPrice * discountRate) / 100;
    const amountBeforeVat = (item.quantity * item.unitPrice) - discountAmount;
    const vatAmount = (amountBeforeVat * item.vatRate) / 100;

    updated[index] = {
      ...item,
      discountRate,
      discountAmount,
      vatAmount,
      totalAmount: amountBeforeVat + vatAmount,
    };
    setItems(updated);
  };

  const handleVatChange = (index: number, rate: number) => {
    const updated = [...items];
    const item = updated[index];
    const vatRate = Math.max(0, rate);
    const amountBeforeVat = (item.quantity * item.unitPrice) - item.discountAmount;
    const vatAmount = (amountBeforeVat * vatRate) / 100;

    updated[index] = {
      ...item,
      vatRate,
      vatAmount,
      totalAmount: amountBeforeVat + vatAmount,
    };
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
        discountRate: 0,
        discountAmount: 0,
        vatRate: 8,
        vatAmount: 0,
        totalAmount: 0,
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Subtotals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const grandTotal = subtotal - discountTotal + vatTotal;

  const handleSubmit = (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    if (!partnerId) {
      alert('Vui lòng chọn đối tác (Khách hàng hoặc Nhà cung cấp).');
      return;
    }
    if (items.some(i => !i.itemId)) {
      alert('Vui lòng chọn đầy đủ sản phẩm thời trang cho các dòng hóa đơn.');
      return;
    }

    // Kiểm tra tồn kho bắt buộc nếu là BÁN HÀNG
    if (type === 'SALES') {
      for (const it of items) {
        const prod = inventory.find(p => p.id === it.itemId);
        if (prod && it.quantity > prod.openingQuantity) {
          alert(`Sản phẩm ${prod.name} (mã ${prod.code}) chỉ còn ${prod.openingQuantity} sản phẩm, không thể bán ${it.quantity} sản phẩm.`);
          return;
        }
      }
    }

    let calculatedPaidAmount = 0;
    if (type === 'SALES') {
      if (paymentStatusOption === 'PAID') {
        calculatedPaidAmount = grandTotal;
      } else if (paymentStatusOption === 'PARTIAL') {
        calculatedPaidAmount = Number(customPaidAmount) || 0;
        if (calculatedPaidAmount <= 0 || calculatedPaidAmount >= grandTotal) {
          alert(`Thanh toán một phần phải có số tiền lớn hơn 0 và nhỏ hơn ${formatCurrency(grandTotal)}.`);
          return;
        }
      } else {
        calculatedPaidAmount = 0;
      }

      // Kiểm tra tiền khách đưa
      if (customerCash !== '' && customerCash !== undefined) {
        const cashVal = Number(customerCash);
        if (paymentStatusOption === 'PAID' && cashVal < grandTotal) {
          alert('Khách đưa chưa đủ tiền.');
          return;
        }
      }
    }

    const selectedPartner = partners.find(p => p.id === partnerId);
    const partnerName = partnerId === 'p_retail' 
      ? 'Khách Lẻ Mua Tại Quầy' 
      : (selectedPartner?.name || 'Khách Hàng');

    const generatedItems: InvoiceItem[] = items.map((item, idx) => ({
      ...item,
      id: `item_${Date.now()}_${idx}`,
    }));

    const finalInvoiceData: any = {
      code,
      invoiceSymbol,
      type,
      date,
      dueDate,
      partnerId,
      partnerName,
      partnerAddress: selectedPartner?.address || (partnerId === 'p_retail' ? 'Showroom Phố Huế' : ''),
      partnerTaxCode: selectedPartner?.taxCode || '',
      items: generatedItems,
      subtotal,
      discountTotal,
      vatTotal,
      grandTotal,
      paidAmount: calculatedPaidAmount,
      status: calculatedPaidAmount >= grandTotal ? 'PAID' : calculatedPaidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      note,
      customerCash: customerCash !== '' ? Number(customerCash) : undefined,
      paymentMethod
    };

    onSave(finalInvoiceData, andPrint);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-rose-100 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-pink-100 text-[#a93054]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {type === 'SALES' ? 'Lập Hóa Đơn / Đơn Bán Hàng' : 'Lập Hóa Đơn / Đơn Nhập Hàng Xưởng May'}
              </h3>
              <p className="text-xs text-[#a93054] font-medium">Hỗ trợ in chứng từ kế toán chuẩn Mẫu 01-GTKT / Phiếu chuẩn TT133</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Invoice Type Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTypeChange('SALES')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'SALES' ? 'bg-[#a93054] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hóa Đơn Bán Hàng (Đầu ra - TK 511)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('PURCHASE')}
              className={`py-2 px-3 rounded-xl transition cursor-pointer ${type === 'PURCHASE' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Hóa Đơn Mua Hàng (Đầu vào - TK 156)
            </button>
          </div>

          {/* Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            
            {/* Symbol */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Ký hiệu mẫu</label>
              <input
                type="text"
                value={invoiceSymbol}
                onChange={e => setInvoiceSymbol(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Số hóa đơn *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Ngày lập *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Hạn thanh toán</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

          </div>

          {/* Partner Field */}
          <div className="text-xs">
            <label className="block text-slate-700 font-bold mb-1">
              {type === 'SALES' ? 'Khách hàng / Đơn vị mua hàng *' : 'Nhà cung cấp / Xưởng may thời trang *'}
            </label>
            <Dropdown
              value={partnerId}
              onChange={e => handlePartnerChange(e.target.value)}
              required
              className="w-full bg-white border-slate-200 font-semibold"
              searchPlaceholder="Tìm kiếm khách hàng / nhà cung cấp..."
            >
              <option value="">-- Chọn đối tác từ danh bạ --</option>
              {type === 'SALES' && (
                <option value="p_retail">KH_LE - Khách Lẻ Mua Tại Quầy (Không tích điểm)</option>
              )}
              {partners
                .filter(p => type === 'SALES' ? (p.type === 'CUSTOMER' || p.type === 'BOTH') : (p.type === 'SUPPLIER' || p.type === 'BOTH'))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
            </Dropdown>
          </div>

          {/* Invoice Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Chi tiết dòng sản phẩm thời trang ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-xs font-bold text-[#a93054] hover:text-[#fb6f92] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm dòng sản phẩm</span>
              </button>
            </div>

            <TableContainer maxHeight="max-h-[320px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Sản phẩm thời trang</th>
                    <th className="p-2.5 w-20 text-center">ĐVT</th>
                    <th className="p-2.5 w-20 text-center">SL</th>
                    <th className="p-2.5 w-32 text-right">Đơn giá</th>
                    <th className="p-2.5 w-20 text-center">% VAT</th>
                    <th className="p-2.5 w-32 text-right">Thành tiền</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5">
                        <Dropdown
                          size="sm"
                          value={row.itemId}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          required
                          className="w-full bg-slate-50 border-slate-200 font-medium"
                          searchPlaceholder="Tìm kiếm sản phẩm..."
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.code} - {inv.name} (Tồn: {inv.openingQuantity})
                            </option>
                          ))}
                        </Dropdown>
                      </td>
                      <td className="p-2.5 text-center text-slate-600">{row.unit}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={e => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#fb6f92]"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          value={row.unitPrice}
                          onChange={e => handlePriceChange(idx, Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#fb6f92]"
                        />
                      </td>
                      <td className="p-2.5">
                        <Dropdown
                          size="sm"
                          value={row.vatRate}
                          onChange={e => handleVatChange(idx, Number(e.target.value))}
                          className="w-full bg-slate-50 border-slate-200 font-bold"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="8">8%</option>
                          <option value="10">10%</option>
                        </Dropdown>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.totalAmount)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={items.length === 1}
                          className="text-slate-300 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
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

          {/* Totals Summary & Payment Configuration */}
          <div className="space-y-3">
            {type === 'SALES' && (
              <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-200/70 text-xs space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1.5 text-[#a93054]">
                    <Sparkles className="w-4 h-4" />
                    <span>Thanh Toán & Tiền Thừa / Công Nợ Bán Hàng</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-normal">Hình thức:</span>
                    <Dropdown
                      size="sm"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="bg-white border-pink-200 font-semibold"
                    >
                      <option value="CASH">Tiền mặt (TK 1111)</option>
                      <option value="BANK">Chuyển khoản (TK 1121)</option>
                    </Dropdown>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Trạng thái thanh toán */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Trạng thái thanh toán *</label>
                    <Dropdown
                      value={paymentStatusOption}
                      onChange={e => setPaymentStatusOption(e.target.value as any)}
                      className="w-full bg-white border-pink-200 font-semibold"
                    >
                      <option value="PAID">Đã thanh toán đủ (PAID)</option>
                      <option value="PARTIAL">Thanh toán một phần (PARTIAL)</option>
                      <option value="UNPAID">Chưa thanh toán / Ghi nợ 131 (UNPAID)</option>
                    </Dropdown>
                  </div>

                  {/* Số tiền thanh toán thực tế nếu partial */}
                  {paymentStatusOption === 'PARTIAL' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Số tiền khách trả trước *</label>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={customPaidAmount}
                        onChange={e => setCustomPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="VD: 500000"
                        className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Tiền khách đưa */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tiền khách đưa (VND)</label>
                    <input
                      type="number"
                      min="0"
                      value={customerCash}
                      onChange={e => setCustomerCash(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="VD: 1000000"
                      className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none"
                    />
                  </div>

                  {/* Tiền thừa / Công nợ hiển thị realtime */}
                  <div className="bg-white/80 p-2.5 rounded-xl border border-pink-200 flex flex-col justify-center space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Tiền thừa trả khách:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {customerCash !== '' && Number(customerCash) >= grandTotal
                          ? formatCurrency(Math.max(0, Number(customerCash) - grandTotal))
                          : '0 ₫'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Công nợ ghi sổ 131:</span>
                      <span className="font-mono font-bold text-rose-600">
                        {paymentStatusOption === 'PAID' 
                          ? '0 ₫' 
                          : paymentStatusOption === 'PARTIAL'
                            ? formatCurrency(Math.max(0, grandTotal - (Number(customPaidAmount) || 0)))
                            : formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                <label className="block text-slate-700 font-bold">Ghi chú & Điều khoản thanh toán</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="VD: Giao hàng tại showroom 120 Phố Huế, thanh toán chuyển khoản trong 15 ngày..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#fb6f92] h-16 resize-none"
                />
              </div>

              <div className="w-full sm:w-72 space-y-1.5 font-medium border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 text-slate-700">
                <div className="flex justify-between">
                  <span>Tiền hàng (chưa VAT):</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thuế GTGT ({items[0]?.vatRate || 8}%):</span>
                  <span className="font-mono font-bold text-[#a93054]">+{formatCurrency(vatTotal)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Tổng Cộng Thanh Toán:</span>
                  <span className="font-mono text-[#a93054]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
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
                <span>Lưu Hóa Đơn</span>
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
