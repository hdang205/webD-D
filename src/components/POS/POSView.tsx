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
  Barcode,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Mail
} from 'lucide-react';
import { InventoryItem, Partner, Invoice, InvoiceItem, CustomerTier } from '../../types/accounting';
import { formatCurrency } from '../../utils/accountingEngine';
import { CustomerService } from '../../services/masterDataService';

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
  onAddCustomer?: (customerData: Partial<Partner>) => Promise<Partner>;
}

export const POSView: React.FC<POSViewProps> = ({
  inventory,
  partners,
  onCompletePOSSale,
  onNavigateToERP,
  onAddCustomer
}) => {
  // Search & Filter
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Customer Selection
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('Khách Lẻ Mua Tại Quầy');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');

  // Quick Customer Creation State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    tier: 'STANDARD' as CustomerTier
  });
  const [customerFormErrors, setCustomerFormErrors] = useState<Record<string, string>>({});
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [posToast, setPosToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Filter products theo 7 nhóm danh mục chuẩn
  const dynamicCategories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean)));
  const categories = ['ALL', ...(dynamicCategories.length > 0 ? dynamicCategories : [
    'Áo khoác', 'Đầm/Váy', 'Quần jeans', 'Túi xách', 'Giày dép nữ', 'Áo thun', 'Áo sơ mi'
  ])];

  const filteredItems = inventory.filter(i => {
    const matchCat = selectedCategory === 'ALL' || i.category === selectedCategory;
    const matchQuery = i.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
                       i.code.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchQuery;
  });

  // Helper lấy URL ảnh minh họa sản phẩm (ưu tiên item.imageUrl, hỗ trợ chuẩn hóa SP001-SP020 -> SP01-SP20.png và fallback an toàn)
  const getProductImage = (item: { code: string; imageUrl?: string | null }): string => {
    if (item.imageUrl) return item.imageUrl;
    const spMatch = item.code.match(/^SP0*([1-9]\d*)$/);
    if (spMatch) {
      const num = parseInt(spMatch[1], 10);
      const padded = num < 10 ? `0${num}` : `${num}`;
      return `/images/products/SP${padded}.png`;
    }
    return `/images/products/${item.code}.png`;
  };

  // Validation form tạo nhanh khách hàng tại POS
  const validateCustomerForm = (): boolean => {
    const errs: Record<string, string> = {};
    const name = newCustomerForm.name.trim();
    const phone = newCustomerForm.phone.trim();
    const email = newCustomerForm.email.trim();

    if (!name) {
      errs.name = 'Họ tên khách hàng không được để trống';
    }

    const PHONE_REGEX = /^[0-9+.\s-]{9,15}$/;
    if (!phone) {
      errs.phone = 'Số điện thoại không được để trống';
    } else if (!PHONE_REGEX.test(phone)) {
      errs.phone = 'Số điện thoại không đúng định dạng (từ 9 đến 15 chữ số)';
    } else {
      // Chống trùng số điện thoại ngay tại POS
      const duplicate = partners.find(p => p.phone && p.phone.trim() === phone);
      if (duplicate) {
        errs.phone = `Số điện thoại này đã được đăng ký cho "${duplicate.name}" (${duplicate.code})`;
      }
    }

    if (email) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(email)) {
        errs.email = 'Địa chỉ email không đúng định dạng';
      }
    }

    setCustomerFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Xử lý lưu khách hàng mới tại POS & Tự động chọn cho hóa đơn (Bảo toàn giỏ hàng)
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm()) return;

    try {
      setIsCreatingCustomer(true);
      setCustomerFormErrors({});

      const payload: Partial<Partner> = {
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        address: newCustomerForm.address.trim() || 'Showroom mua tại quầy',
        email: newCustomerForm.email.trim() || undefined,
        tier: newCustomerForm.tier,
        type: 'CUSTOMER'
      };

      let createdCustomer: Partner;
      if (onAddCustomer) {
        createdCustomer = await onAddCustomer(payload);
      } else {
        createdCustomer = await CustomerService.create(payload);
      }

      // Tự động chọn khách hàng vừa tạo cho hóa đơn POS hiện tại (Giỏ hàng posCart giữ nguyên 100%)
      setSelectedPartnerId(createdCustomer.id);
      setCustomCustomerName(createdCustomer.name);
      setCustomCustomerPhone(createdCustomer.phone || '');
      if (createdCustomer.tier === 'DIAMOND' || createdCustomer.tier === 'GOLD') {
        setDiscountPercent(10);
      } else if (createdCustomer.tier === 'SILVER') {
        setDiscountPercent(5);
      } else {
        setDiscountPercent(0);
      }

      setPosToast({
        type: 'success',
        message: `Đã thêm khách hàng "${createdCustomer.name}" (${createdCustomer.phone}) và áp dụng ngay vào đơn bán!`
      });
      setTimeout(() => setPosToast(null), 4000);

      // Đóng modal và reset form nhập
      setIsAddCustomerModalOpen(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        address: '',
        email: '',
        tier: 'STANDARD'
      });
    } catch (err: any) {
      console.error('Lỗi khi tạo khách hàng tại POS:', err);
      const msg = err.message || 'Lỗi khi tạo mới khách hàng';
      if (err.errors?.phone) {
        setCustomerFormErrors(prev => ({ ...prev, phone: err.errors.phone }));
      } else if (msg.includes('Số điện thoại') || msg.includes('phone')) {
        setCustomerFormErrors(prev => ({ ...prev, phone: msg }));
      } else {
        setCustomerFormErrors(prev => ({ ...prev, general: msg }));
      }
    } finally {
      setIsCreatingCustomer(false);
    }
  };

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

      {/* POS Notification Toast */}
      {posToast && (
        <div className={`p-3 rounded-2xl mb-4 border flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
          posToast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {posToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{posToast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setPosToast(null)} 
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                  className={`text-left p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    inStock
                      ? 'bg-white hover:bg-rose-50/40 border-rose-100/90 hover:border-[#fb6f92] hover:shadow-md'
                      : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div>
                    {/* Product Image Thumbnail */}
                    <div className="w-full h-28 sm:h-32 bg-slate-100/90 rounded-xl overflow-hidden relative mb-2 flex items-center justify-center border border-rose-100/60 shadow-inner">
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/products/SP01.png';
                        }}
                      />
                      
                      {/* Code Badge */}
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-white/95 backdrop-blur-xs text-[#a93054] px-1.5 py-0.5 rounded-md shadow-xs border border-pink-100">
                        {item.code}
                      </span>

                      {/* Stock Badge */}
                      <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs ${
                        item.openingQuantity <= 5
                          ? 'bg-amber-500/95 text-white'
                          : 'bg-white/95 text-emerald-700 border border-emerald-100'
                      }`}>
                        Kho: {item.openingQuantity}
                      </span>

                      {/* Out of Stock Overlay */}
                      {!inStock && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            Hết hàng
                          </span>
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 group-hover:text-[#a93054] min-h-[2rem]">
                      {item.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-rose-100/60 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-[#a93054] text-xs">
                        {formatCurrency(item.sellingPrice)}
                      </span>
                      {item.size && (
                        <span className="ml-1 text-[10px] text-slate-400 font-medium">({item.size})</span>
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#a93054] flex items-center justify-center font-bold text-xs group-hover:bg-[#a93054] group-hover:text-white transition shadow-xs">
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
          <div className="bg-rose-50/60 rounded-2xl p-3 border border-pink-100 mb-3 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#fb6f92]" />
                <span>Khách hàng / Thành viên VIP</span>
              </label>
              <div className="flex items-center gap-1.5">
                {selectedPartnerId && (
                  <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    VIP - Giảm {discountPercent}%
                  </span>
                )}
                <button
                  type="button"
                  id="btn-pos-add-customer"
                  onClick={() => {
                    setCustomerFormErrors({});
                    setIsAddCustomerModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#fb6f92] hover:bg-[#a93054] text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer active:scale-95"
                  title="Tạo nhanh khách hàng mới ngay tại quầy POS"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Thêm khách hàng</span>
                </button>
              </div>
            </div>

            <select
              id="select-pos-customer"
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

            {selectedPartnerId && (
              <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-pink-100 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                  <Phone className="w-3 h-3 text-[#fb6f92]" />
                  <span className="font-semibold text-slate-800 truncate">{customCustomerName}</span>
                  <span className="font-mono text-slate-500">({customCustomerPhone || 'Không có SĐT'})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectPartner('')}
                  className="text-slate-400 hover:text-rose-600 text-[10px] font-semibold cursor-pointer underline ml-2 shrink-0"
                >
                  Đổi khách
                </button>
              </div>
            )}
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
                <div key={item.item.id} className="p-2 bg-slate-50/80 rounded-xl border border-rose-100 flex items-center justify-between gap-2.5 text-xs hover:bg-rose-50/30 transition">
                  {/* Cart Item Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-rose-200/80 bg-white shadow-xs">
                    <img
                      src={getProductImage(item.item)}
                      alt={item.item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/products/SP01.png';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-800 truncate">{item.item.name}</h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono text-[#a93054] font-bold">{item.item.code}</span>
                      <span>•</span>
                      <span>{formatCurrency(item.price)}</span>
                      {item.selectedSize && (
                        <>
                          <span>•</span>
                          <span className="bg-pink-100 text-[#a93054] px-1 rounded font-bold">{item.selectedSize}</span>
                        </>
                      )}
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

                    <span className="font-bold text-[#a93054] min-w-[65px] text-right">
                      {formatCurrency(item.price * item.quantity)}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.item.id, 0, item.item.openingQuantity)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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

      {/* QUICK CREATE CUSTOMER MODAL */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 text-[#a93054] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Thêm Khách Hàng Mới Tại Quầy</h3>
                  <p className="text-[11px] text-slate-500">Tạo nhanh để áp dụng tích điểm &amp; lưu đơn bán</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customerFormErrors.general && (
              <div className="p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{customerFormErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5 text-xs text-left">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-pos-cust-name"
                  placeholder="VD: Nguyễn Mai Trang"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92] ${
                    customerFormErrors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                  }`}
                  autoFocus
                />
                {customerFormErrors.name && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{customerFormErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  id="input-pos-cust-phone"
                  placeholder="VD: 0988123456 (9 - 15 số)"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92] ${
                    customerFormErrors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                  }`}
                />
                {customerFormErrors.phone && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{customerFormErrors.phone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Địa chỉ liên hệ <span className="text-slate-400 font-normal">(không bắt buộc)</span>
                </label>
                <input
                  type="text"
                  id="input-pos-cust-address"
                  placeholder="VD: 124 Phố Huế, Hai Bà Trưng, Hà Nội"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Địa chỉ Email <span className="text-slate-400 font-normal">(không bắt buộc)</span>
                </label>
                <input
                  type="email"
                  id="input-pos-cust-email"
                  placeholder="VD: khachhang@gmail.com"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92] ${
                    customerFormErrors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                  }`}
                />
                {customerFormErrors.email && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{customerFormErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hạng thành viên ban đầu</label>
                <select
                  value={newCustomerForm.tier}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, tier: e.target.value as CustomerTier })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92] cursor-pointer"
                >
                  <option value="STANDARD">STANDARD - Khách tiêu chuẩn</option>
                  <option value="SILVER">SILVER - Giảm 5% hóa đơn</option>
                  <option value="GOLD">GOLD - Giảm 10% hóa đơn (VIP)</option>
                  <option value="DIAMOND">DIAMOND - Giảm 10% hóa đơn (VIP Kim Cương)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  disabled={isCreatingCustomer}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btn-pos-submit-customer"
                  disabled={isCreatingCustomer}
                  className="flex-1 py-2.5 bg-[#a93054] hover:bg-[#8e2544] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCreatingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Lưu &amp; Chọn Vào Đơn</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
