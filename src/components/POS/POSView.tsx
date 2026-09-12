import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  QrCode, 
  Printer, 
  UserPlus, 
  Check, 
  Sparkles, 
  ShoppingBag,
  Percent,
  Receipt,
  RotateCcw,
  User,
  Phone,
  Barcode
} from 'lucide-react';
import { InventoryItem, Partner, Invoice, InvoiceItem } from '../../types/accounting';
import { formatCurrency } from '../../utils/accountingEngine';

interface POSViewProps {
  inventory: InventoryItem[];
  partners: Partner[];
  onCompletePOSSale: (saleData: {
    partnerId?: string;
    partnerName: string;
    customerPhone: string;
    items: InvoiceItem[];
    subTotal: number;
    discountAmount: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    paidAmount: number;
    paymentMethod: 'CASH' | 'BANK' | 'DEBT';
    note?: string;
  }) => void;
  onNavigateToERP: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  inventory,
  partners,
  onCompletePOSSale,
  onNavigateToERP
}) => {
  // Search & Filter
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Customer Selection
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('Khách Lẻ Mua Tại Quầy');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');

  // Cart in POS
  const [posCart, setPosCart] = useState<{
    item: InventoryItem;
    quantity: number;
    price: number;
    selectedSize: string;
  }[]>([]);

  // Mobile POS View Mode
  const [mobileTab, setMobileTab] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  // Discount & Tax settings
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [applyVAT, setApplyVAT] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'DEBT'>('CASH');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCompletedBill, setLastCompletedBill] = useState<any>(null);

  // Filter products
  const categories = ['ALL', 'Váy & Đầm', 'Áo Sơ Mi', 'Áo Khoác & Blazer', 'Quần Jeans', 'Phụ Kiện & Túi Xách', 'Áo T-Shirt', 'Giày Dép'];

  const filteredItems = inventory.filter(i => {
    const matchCat = selectedCategory === 'ALL' || i.category === selectedCategory;
    const matchQuery = i.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
                       i.code.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchQuery;
  });

  // Handle customer change
  const handleSelectPartner = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    if (!partnerId) {
      setCustomCustomerName('Khách Lẻ Mua Tại Quầy');
      setCustomCustomerPhone('');
      setDiscountPercent(0);
      return;
    }

    const p = partners.find(part => part.id === partnerId);
    if (p) {
      setCustomCustomerName(p.name);
      setCustomCustomerPhone(p.phone || '');
      // Auto discount if VIP
      if (p.partnerCategory === 'VIP') {
        setDiscountPercent(10);
      } else {
        setDiscountPercent(5);
      }
    }
  };

  // Add to POS Cart
  const handleAddToCart = (product: InventoryItem) => {
    if (product.openingQuantity <= 0) {
      alert(`Sản phẩm [${product.name}] đã hết tồn kho!`);
      return;
    }

    setPosCart(prev => {
      const existing = prev.find(p => p.item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.openingQuantity) {
          alert(`Đã đạt giới hạn tồn kho (${product.openingQuantity} chiếc) của mẫu này!`);
          return prev;
        }
        return prev.map(p => p.item.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item: product, quantity: 1, price: product.sellingPrice, selectedSize: 'M' }];
    });
  };

  const updateQuantity = (itemId: string, newQty: number, maxStock: number) => {
    if (newQty <= 0) {
      setPosCart(prev => prev.filter(p => p.item.id !== itemId));
    } else {
      if (newQty > maxStock) {
        alert(`Số lượng vượt quá tồn kho khả dụng (${maxStock} ${maxStock > 1 ? 'chiếc' : ''})!`);
        return;
      }
      setPosCart(prev => prev.map(p => p.item.id === itemId ? { ...p, quantity: newQty } : p));
    }
  };

  // Calculate totals
  const subTotal = posCart.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const discountAmount = Math.round((subTotal * discountPercent) / 100);
  const taxableTotal = Math.max(0, subTotal - discountAmount);
  const vatRate = applyVAT ? 10 : 0;
  const vatAmount = Math.round((taxableTotal * vatRate) / 100);
  const grandTotal = taxableTotal + vatAmount;

  const numCashGiven = parseFloat(cashGiven) || 0;
  const changeToReturn = Math.max(0, numCashGiven - grandTotal);

  // Complete Sale
  const handleFinishCheckout = () => {
    if (posCart.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm vào đơn bán!');
      return;
    }

    const invoiceItems: InvoiceItem[] = posCart.map((c, idx) => ({
      id: `pos_item_${Date.now()}_${idx}`,
      itemId: c.item.id,
      itemCode: c.item.code,
      itemName: `${c.item.name} (Size: ${c.selectedSize})`,
      unit: c.item.unit,
      quantity: c.quantity,
      unitPrice: c.price,
      discountRate: discountPercent,
      discountAmount: Math.round((c.price * c.quantity * discountPercent) / 100),
      vatRate: applyVAT ? 10 : 0,
      vatAmount: applyVAT ? Math.round((c.price * c.quantity * 0.1)) : 0,
      amount: c.price * c.quantity,
      totalAmount: c.price * c.quantity * (applyVAT ? 1.1 : 1),
    }));

    const billData = {
      partnerId: selectedPartnerId || undefined,
      partnerName: customCustomerName,
      customerPhone: customCustomerPhone,
      items: invoiceItems,
      subTotal,
      discountAmount,
      vatRate,
      vatAmount,
      grandTotal,
      paidAmount: paymentMethod === 'DEBT' ? 0 : grandTotal,
      paymentMethod,
      note: `Bán lẻ POS tại Showroom - ${paymentMethod === 'CASH' ? 'Tiền mặt' : paymentMethod === 'BANK' ? 'Chuyển khoản VietQR' : 'Ghi nợ 131'}`
    };

    onCompletePOSSale(billData);
    setLastCompletedBill({ ...billData, billCode: `HD-POS-${Date.now().toString().slice(-6)}`, date: new Date().toLocaleDateString('vi-VN') });
    setIsSuccessModalOpen(true);

    // Reset cart
    setPosCart([]);
    setCashGiven('');
    setSelectedPartnerId('');
    setCustomCustomerName('Khách Lẻ Mua Tại Quầy');
    setCustomCustomerPhone('');
  };

  return (
    <div className="w-full bg-[#fbf8ff] min-h-[calc(100vh-140px)]">
      
      {/* POS Top Control Banner */}
      <div className="bg-gradient-to-r from-[#181a2e] to-[#361726] text-white px-6 py-4 rounded-3xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-rose-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#fb6f92] to-[#a93054] rounded-2xl text-white font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Màn Hình Thu Ngân POS Showroom D&amp;D</h2>
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-xs text-rose-200">Quét mã, tạo đơn bán lẻ &amp; tự động định khoản kế toán VAS</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToERP}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#fb6f92] hover:bg-[#a93054] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <span>Hệ Thống Quản Trị Kế Toán ERP</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on mobile/tablet screens < lg) */}
      <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-2xl mb-4 shadow-inner">
        <button
          onClick={() => setMobileTab('PRODUCTS')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'PRODUCTS'
              ? 'bg-white text-[#a93054] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Danh Mục Mẫu ({filteredItems.length})</span>
        </button>

        <button
          onClick={() => setMobileTab('CART')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            mobileTab === 'CART'
              ? 'bg-white text-[#a93054] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Giỏ Hàng & Tính Tiền</span>
          {posCart.length > 0 && (
            <span className="bg-rose-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {posCart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* POS Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
        
        {/* LEFT: Product Catalog & Quick Picker (7 cols) */}
        <div className={`lg:col-span-7 bg-white border border-rose-100 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col min-h-[500px] lg:h-[750px] ${
          mobileTab === 'PRODUCTS' ? 'block' : 'hidden lg:flex'
        }`}>
          
          {/* Search bar & Category filter */}
          <div className="space-y-3 mb-4 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã vạch Barcode (SP001) hoặc tên sản phẩm..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full bg-slate-50 border border-rose-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-[11px] ${
                    selectedCategory === cat
                      ? 'bg-[#a93054] text-white'
                      : 'bg-rose-50/70 text-slate-700 hover:bg-rose-100'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả mẫu' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const inStock = item.openingQuantity > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!inStock}
                  onClick={() => handleAddToCart(item)}
                  className={`text-left p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    inStock
                      ? 'bg-slate-50/50 hover:bg-pink-50/40 border-rose-100 hover:border-pink-300 hover:shadow-sm'
                      : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold bg-white text-[#a93054] px-1.5 py-0.5 rounded-md border border-pink-100">
                        {item.code}
                      </span>
                      <span className={`text-[10px] font-bold ${item.openingQuantity <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        Kho: {item.openingQuantity}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 group-hover:text-[#a93054]">
                      {item.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-rose-100/60 flex items-center justify-between">
                    <span className="font-extrabold text-[#a93054] text-xs">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#a93054] flex items-center justify-center font-bold text-xs group-hover:bg-[#a93054] group-hover:text-white transition">
                      +
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Current Cart / Bill & Payment (5 cols) */}
        <div className={`lg:col-span-5 bg-white border border-rose-100 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col min-h-[500px] lg:h-[750px] ${
          mobileTab === 'CART' ? 'block' : 'hidden lg:flex'
        }`}>
          
          {/* Customer Selection Box */}
          <div className="bg-rose-50/60 rounded-2xl p-3 border border-pink-100 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#fb6f92]" />
                <span>Khách hàng / Thành viên VIP</span>
              </label>
              {selectedPartnerId && (
                <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  VIP - Giảm {discountPercent}%
                </span>
              )}
            </div>

            <select
              value={selectedPartnerId}
              onChange={(e) => handleSelectPartner(e.target.value)}
              className="w-full bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
            >
              <option value="">Khách Lẻ Mua Tại Quầy (Không tích điểm)</option>
              {partners.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').map(cust => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.code} - SĐT: {cust.phone || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <ShoppingBag className="w-10 h-10 text-rose-200 mb-2" />
                <p className="text-xs font-bold text-slate-600">Đơn hàng trống</p>
                <p className="text-[11px] text-slate-400">Chọn mẫu thời trang bên trái để thêm vào hóa đơn</p>
              </div>
            ) : (
              posCart.map((item, idx) => (
                <div key={item.item.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-rose-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-800 truncate">{item.item.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono text-[#a93054]">{item.item.code}</span>
                      <span>•</span>
                      <span>Đơn giá: {formatCurrency(item.price)}</span>
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-rose-200 rounded-lg overflow-hidden bg-white">
                      <button 
                        onClick={() => updateQuantity(item.item.id, item.quantity - 1, item.item.openingQuantity)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-rose-100"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.item.id, item.quantity + 1, item.item.openingQuantity)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-rose-100"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-[#a93054] min-w-[70px] text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.item.id, 0, item.item.openingQuantity)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing & Settlement Summary */}
          <div className="border-t border-rose-100 pt-3 space-y-2 shrink-0 text-xs">
            
            <div className="flex justify-between text-slate-500">
              <span>Tổng tiền hàng ({posCart.reduce((s, i) => s + i.quantity, 0)} sp):</span>
              <span className="font-bold text-slate-800">{formatCurrency(subTotal)}</span>
            </div>

            {/* Discount setting */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#fb6f92]" /> Chiết khấu:
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5% (Silver)</option>
                  <option value={10}>10% (Gold)</option>
                  <option value={15}>15% (VIP Diamond)</option>
                </select>
                <span className="text-rose-600 font-bold">-{formatCurrency(discountAmount)}</span>
              </div>
            </div>

            {/* VAT check */}
            <div className="flex items-center justify-between text-slate-500">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyVAT}
                  onChange={(e) => setApplyVAT(e.target.checked)}
                  className="rounded text-[#fb6f92] focus:ring-pink-400"
                />
                <span>Xuất hóa đơn GTGT (VAT 10%)</span>
              </label>
              <span className="font-semibold text-slate-800">+{formatCurrency(vatAmount)}</span>
            </div>

            {/* Grand total */}
            <div className="flex justify-between items-center bg-rose-50/70 p-3 rounded-2xl border border-pink-100">
              <span className="font-bold text-slate-800">Khách Cần Trả:</span>
              <span className="text-lg font-black text-[#a93054]">{formatCurrency(grandTotal)}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                  paymentMethod === 'CASH'
                    ? 'bg-[#a93054] text-white border-[#a93054]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK')}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                  paymentMethod === 'BANK'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> VietQR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('DEBT')}
                className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                  paymentMethod === 'DEBT'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Ghi nợ 131
              </button>
            </div>

            {/* Cash input calculation */}
            {paymentMethod === 'CASH' && (
              <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 whitespace-nowrap">Khách đưa:</span>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
                />
                {numCashGiven > grandTotal && (
                  <span className="text-emerald-700 font-bold whitespace-nowrap">
                    Thối: {formatCurrency(changeToReturn)}
                  </span>
                )}
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={handleFinishCheckout}
              disabled={posCart.length === 0}
              className="w-full py-3 bg-gradient-to-r from-[#fb6f92] to-[#a93054] text-white font-bold rounded-2xl shadow-lg hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>Thanh Toán &amp; In Bill Ngay</span>
            </button>

          </div>

        </div>
      </div>

      {/* Floating Mobile Cart Bar (When browsing products on mobile and cart has items) */}
      {mobileTab === 'PRODUCTS' && posCart.length > 0 && (
        <div className="lg:hidden fixed bottom-18 left-3 right-3 z-30 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setMobileTab('CART')}
            className="w-full bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-rose-500/40 flex items-center justify-between cursor-pointer active:scale-95 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#fb6f92] text-white flex items-center justify-center font-bold text-xs">
                {posCart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Xem giỏ hàng & tính tiền</div>
                <div className="text-[10px] text-pink-300">
                  {posCart.length} dòng sản phẩm
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#fb6f92]">
                {formatCurrency(grandTotal)}
              </span>
              <div className="p-1 rounded-lg bg-white/10 text-white">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {isSuccessModalOpen && lastCompletedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center animate-in zoom-in duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>

            <h3 className="font-extrabold text-slate-900 text-lg">Giao Dịch Thành Công!</h3>
            <p className="text-xs text-slate-500 mb-4">Hóa đơn bán lẻ đã được hạch toán vào hệ thống kế toán</p>

            {/* Bill Receipt Preview */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 text-left text-xs font-mono mb-4 space-y-1">
              <div className="text-center font-bold text-slate-800 text-sm mb-2">D&amp;D FASHION SHOWROOM</div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Số bill: {lastCompletedBill.billCode}</span>
                <span>{lastCompletedBill.date}</span>
              </div>
              <div className="text-[11px] text-slate-600 pb-2 border-b border-slate-200">
                Khách hàng: <strong>{lastCompletedBill.partnerName}</strong>
              </div>

              <div className="py-2 space-y-1 border-b border-slate-200">
                {lastCompletedBill.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">{it.quantity}x {it.itemName}</span>
                    <span className="font-bold">{formatCurrency(it.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-between text-xs font-bold text-slate-900">
                <span>TỔNG CỘNG:</span>
                <span className="text-[#a93054]">{formatCurrency(lastCompletedBill.grandTotal)}</span>
              </div>
              <div className="text-[10px] text-slate-500 text-center pt-2">Cảm ơn quý khách và hẹn gặp lại!</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Hóa Đơn</span>
              </button>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="flex-1 py-2.5 bg-[#a93054] hover:bg-[#8e2544] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đơn Bán Mới
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
