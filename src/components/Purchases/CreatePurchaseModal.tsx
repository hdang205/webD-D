import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Truck, 
  Building2, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  PackagePlus, 
  DollarSign, 
  Sparkles,
  Layers,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { 
  Invoice, 
  Partner, 
  InventoryItem, 
  Category, 
  AuthUser 
} from '../../types/accounting';
import { formatCurrency, formatNumber, getCurrentISODate } from '../../utils/formatters';
import { ProductService, SupplierService, CategoryService } from '../../services/masterDataService';
import { Dropdown } from '../Common/Dropdown';

interface PurchaseItemRow {
  productId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentStock: number;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: any, andPrint?: boolean) => void;
  partners: Partner[];
  inventory: InventoryItem[];
  currentUser?: AuthUser | null;
}

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  partners,
  inventory,
  currentUser
}) => {
  // 1. Header Information
  const [partnerId, setPartnerId] = useState('');
  const [code, setCode] = useState(() => `HDM${Math.floor(1000 + Math.random() * 9000)}`);
  const [invoiceSymbol, setInvoiceSymbol] = useState('K26T');
  const [date, setDate] = useState(getCurrentISODate());
  const [dueDate, setDueDate] = useState(getCurrentISODate());
  const [note, setNote] = useState('');

  // Payment states
  const [paymentOption, setPaymentOption] = useState<'UNPAID' | 'PAID' | 'PARTIAL'>('UNPAID');
  const [customPaidAmount, setCustomPaidAmount] = useState<number | ''>('');
  const [paymentFund, setPaymentFund] = useState<'1111' | '1121'>('1111');

  // Supplier's Products State
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [loadingSupplierProds, setLoadingSupplierProds] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState<Category[]>([]);

  // Purchase Items Table
  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sub-modal: Tạo sản phẩm mới
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProdData, setNewProdData] = useState({
    code: '',
    name: '',
    categoryId: '',
    category: '',
    unit: 'Cái',
    costPrice: 150000,
    sellingPrice: 350000,
    importQuantity: 50,
    size: 'M',
    color: '',
    barcode: '',
    imageUrl: '',
    description: ''
  });
  const [newProdError, setNewProdError] = useState<string | null>(null);
  const [isSavingNewProduct, setIsSavingNewProduct] = useState(false);

  // Filter suppliers only
  const suppliers = useMemo(() => {
    return partners.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH');
  }, [partners]);

  // Load categories on mount
  useEffect(() => {
    CategoryService.getAll().then(cats => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        if (!newProdData.categoryId) {
          setNewProdData(prev => ({
            ...prev,
            categoryId: cats[0].id,
            category: cats[0].name
          }));
        }
      }
    }).catch(err => {
      console.warn('Lỗi khi tải danh mục sản phẩm:', err);
    });
  }, []);

  // When supplier changes, fetch products provided by that supplier
  useEffect(() => {
    if (!partnerId) {
      setSupplierProducts([]);
      return;
    }

    setLoadingSupplierProds(true);
    SupplierService.getProducts(partnerId)
      .then(prods => {
        setSupplierProducts(prods || []);
      })
      .catch(err => {
        console.warn('Lỗi tải sản phẩm theo NCC:', err);
        setSupplierProducts([]);
      })
      .finally(() => {
        setLoadingSupplierProds(false);
      });
  }, [partnerId]);

  if (!isOpen) return null;

  // Selected supplier object
  const selectedSupplier = suppliers.find(s => s.id === partnerId);

  // Filter supplier products by search & category
  const filteredSupplierProducts = supplierProducts.filter(p => {
    const s = productSearch.toLowerCase();
    const matchSearch = 
      p.name.toLowerCase().includes(s) || 
      p.code.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.toLowerCase().includes(s));

    const matchCat = selectedCategory === 'ALL' || 
      p.categoryId === selectedCategory || 
      p.category === selectedCategory;

    return matchSearch && matchCat;
  });

  // Handle supplier change with confirmation if items exist
  const handleSupplierChange = (newSupId: string) => {
    if (items.length > 0 && newSupId !== partnerId) {
      const confirmSwitch = window.confirm(
        'Bạn đang có sản phẩm trong phiếu nhập. Đổi Nhà Cung Cấp sẽ đặt lại danh sách sản phẩm để đảm bảo tính nhất quán. Bạn có chắc muốn tiếp tục?'
      );
      if (!confirmSwitch) return;
      setItems([]);
    }
    setPartnerId(newSupId);
    setProductSearch('');
    setSelectedCategory('ALL');
  };

  // Add a product from supplier list to purchase items
  const handleSelectProduct = (product: any) => {
    setErrorMessage(null);
    const existingIndex = items.findIndex(i => i.productId === product.id);

    if (existingIndex >= 0) {
      // Tăng số lượng nếu sản phẩm đã có trong phiếu
      setItems(prev => {
        const next = [...prev];
        const row = next[existingIndex];
        const newQty = row.quantity + 1;
        const rawTotal = newQty * row.unitPrice;
        const discountAmount = (rawTotal * row.discountRate) / 100;
        const afterDiscount = rawTotal - discountAmount;
        const vatAmount = (afterDiscount * row.vatRate) / 100;
        next[existingIndex] = {
          ...row,
          quantity: newQty,
          discountAmount,
          vatAmount,
          totalAmount: afterDiscount + vatAmount
        };
        return next;
      });
      return;
    }

    // Thêm dòng mới
    const unitPrice = Number(product.lastPurchasePrice ?? product.costPrice ?? 0);
    const vatRate = 8;
    const rawTotal = 1 * unitPrice;
    const vatAmount = (rawTotal * vatRate) / 100;

    const newRow: PurchaseItemRow = {
      productId: product.id,
      itemCode: product.code,
      itemName: product.name,
      unit: product.unit || 'Cái',
      currentStock: Number(product.currentStock ?? product.openingQuantity ?? 0),
      quantity: 1,
      unitPrice,
      discountRate: 0,
      discountAmount: 0,
      vatRate,
      vatAmount,
      totalAmount: rawTotal + vatAmount
    };

    setItems(prev => [...prev, newRow]);
  };

  // Item table updates
  const handleUpdateItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems(prev => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };

      const qty = Math.max(1, Number(row.quantity) || 1);
      const price = Math.max(0, Number(row.unitPrice) || 0);
      const discRate = Math.min(100, Math.max(0, Number(row.discountRate) || 0));
      const vatRate = Math.max(0, Number(row.vatRate) || 0);

      const rawTotal = qty * price;
      const discountAmount = Math.round((rawTotal * discRate) / 100);
      const afterDiscount = rawTotal - discountAmount;
      const vatAmount = Math.round((afterDiscount * vatRate) / 100);
      const totalAmount = afterDiscount + vatAmount;

      row.quantity = qty;
      row.unitPrice = price;
      row.discountRate = discRate;
      row.discountAmount = discountAmount;
      row.vatRate = vatRate;
      row.vatAmount = vatAmount;
      row.totalAmount = totalAmount;

      next[index] = row;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const discountTotal = items.reduce((sum, i) => sum + i.discountAmount, 0);
  const vatTotal = items.reduce((sum, i) => sum + i.vatAmount, 0);
  const grandTotal = subtotal - discountTotal + vatTotal;

  // Open "Tạo sản phẩm mới" sub-modal
  const handleOpenNewProductModal = () => {
    if (!partnerId) {
      alert('Vui lòng chọn Nhà Cung Cấp trước khi tạo sản phẩm mới.');
      return;
    }
    const defaultCat = categories[0];
    const generatedCode = `SP${Date.now().toString().slice(-4)}`;
    setNewProdData({
      code: generatedCode,
      name: '',
      categoryId: defaultCat?.id || 'cat_damvay',
      category: defaultCat?.name || 'Đầm/Váy',
      unit: 'Cái',
      costPrice: 200000,
      sellingPrice: 450000,
      importQuantity: 50,
      size: 'M',
      color: '',
      barcode: `893${Date.now().toString().slice(-7)}`,
      imageUrl: '',
      description: `Nhập khẩu/gia công từ ${selectedSupplier?.name || 'nhà cung cấp'}`
    });
    setNewProdError(null);
    setIsNewProductModalOpen(true);
  };

  // Submit "Tạo sản phẩm mới"
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewProdError(null);

    if (!newProdData.code.trim()) {
      setNewProdError('Mã sản phẩm (SKU) không được để trống.');
      return;
    }
    if (!newProdData.name.trim()) {
      setNewProdError('Tên sản phẩm không được để trống.');
      return;
    }
    if (!newProdData.categoryId) {
      setNewProdError('Vui lòng chọn danh mục sản phẩm.');
      return;
    }
    if (newProdData.costPrice < 0) {
      setNewProdError('Giá nhập không được âm.');
      return;
    }
    if (newProdData.sellingPrice < 0) {
      setNewProdError('Giá bán không được âm.');
      return;
    }
    if (newProdData.importQuantity <= 0) {
      setNewProdError('Số lượng nhập dự kiến phải lớn hơn 0.');
      return;
    }

    try {
      setIsSavingNewProduct(true);

      // Phục vụ đúng Nghiệp vụ 7: Tồn kho ban đầu trước khi nhập là 0.
      // Khi phiếu nhập này hoàn tất, hệ thống sẽ tự động tăng tồn kho theo số lượng nhập!
      const createdProduct = await ProductService.create({
        code: newProdData.code.trim().toUpperCase(),
        name: newProdData.name.trim(),
        categoryId: newProdData.categoryId,
        category: newProdData.category,
        unit: newProdData.unit,
        size: newProdData.size,
        color: newProdData.color,
        barcode: newProdData.barcode,
        costPrice: Number(newProdData.costPrice),
        sellingPrice: Number(newProdData.sellingPrice),
        openingQuantity: 0, // Ban đầu là 0
        minStockLevel: 5,
        description: newProdData.description,
        supplierId: partnerId // Tự động liên kết vào bảng supplier_products
      });

      // 1. Thêm vào danh sách sản phẩm của nhà cung cấp ngay lập tức
      const productForSupplierList = {
        ...createdProduct,
        id: createdProduct.id,
        code: createdProduct.code,
        name: createdProduct.name,
        unit: createdProduct.unit,
        currentStock: 0,
        costPrice: Number(newProdData.costPrice),
        sellingPrice: Number(newProdData.sellingPrice),
        lastPurchasePrice: Number(newProdData.costPrice),
        categoryId: newProdData.categoryId,
        category: newProdData.category
      };

      setSupplierProducts(prev => [productForSupplierList, ...prev]);

      // 2. Tự động thêm sản phẩm mới vào danh sách mặt hàng của phiếu nhập hiện tại
      // KHÔNG LÀM MẤT các sản phẩm đã có trong phiếu nhập!
      const initialImportQty = Number(newProdData.importQuantity) || 1;
      const unitPrice = Number(newProdData.costPrice);
      const vatRate = 8;
      const rawTotal = initialImportQty * unitPrice;
      const vatAmount = Math.round((rawTotal * vatRate) / 100);

      const newRow: PurchaseItemRow = {
        productId: createdProduct.id,
        itemCode: createdProduct.code,
        itemName: createdProduct.name,
        unit: createdProduct.unit,
        currentStock: 0,
        quantity: initialImportQty,
        unitPrice,
        discountRate: 0,
        discountAmount: 0,
        vatRate,
        vatAmount,
        totalAmount: rawTotal + vatAmount
      };

      setItems(prev => {
        // Kiểm tra xem đã có chưa
        const exists = prev.some(it => it.productId === createdProduct.id);
        if (exists) return prev;
        return [...prev, newRow];
      });

      // Đóng sub-modal
      setIsNewProductModalOpen(false);
    } catch (err: any) {
      console.error('Lỗi khi tạo sản phẩm mới:', err);
      setNewProdError(err.message || 'Lỗi khi tạo sản phẩm mới.');
    } finally {
      setIsSavingNewProduct(false);
    }
  };

  // Submit main purchase order
  const handleSubmitPurchase = (e: React.FormEvent, andPrint: boolean = false) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!partnerId) {
      setErrorMessage('Vui lòng chọn Nhà Cung Cấp / Xưởng May.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 sản phẩm vào phiếu nhập hàng.');
      return;
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (it.quantity <= 0) {
        setErrorMessage(`Dòng ${idx + 1}: Số lượng nhập phải lớn hơn 0.`);
        return;
      }
      if (it.unitPrice < 0) {
        setErrorMessage(`Dòng ${idx + 1}: Đơn giá nhập không được là số âm.`);
        return;
      }
    }

    let calculatedPaid = 0;
    if (paymentOption === 'PAID') {
      calculatedPaid = grandTotal;
    } else if (paymentOption === 'PARTIAL') {
      calculatedPaid = Number(customPaidAmount) || 0;
      if (calculatedPaid <= 0 || calculatedPaid >= grandTotal) {
        setErrorMessage(`Số tiền thanh toán trước phải lớn hơn 0 và nhỏ hơn tổng tiền (${formatCurrency(grandTotal)}).`);
        return;
      }
    } else {
      calculatedPaid = 0;
    }

    const payload: any = {
      code,
      invoiceSymbol,
      type: 'PURCHASE',
      date,
      dueDate,
      partnerId,
      partnerName: selectedSupplier?.name || 'Nhà Cung Cấp',
      partnerAddress: selectedSupplier?.address || '',
      partnerTaxCode: selectedSupplier?.taxCode || '',
      subtotal,
      discountTotal,
      vatTotal,
      grandTotal,
      paidAmount: calculatedPaid,
      paymentFund,
      status: calculatedPaid >= grandTotal ? 'PAID' : calculatedPaid > 0 ? 'PARTIAL' : 'UNPAID',
      note: note || `Nhập hàng từ xưởng may: ${selectedSupplier?.name}`,
      items: items.map((it, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        itemId: it.productId,
        productId: it.productId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountRate: it.discountRate,
        discountAmount: it.discountAmount,
        vatRate: it.vatRate,
        vatAmount: it.vatAmount,
        totalAmount: it.totalAmount
      }))
    };

    onSave(payload, andPrint);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-rose-100 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-rose-500 via-[#fb6f92] to-pink-500 text-white shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide">
                LẬP PHIẾU NHẬP HÀNG XƯỞNG MAY / NHÀ CUNG CẤP
              </h3>
              <p className="text-xs text-rose-100 font-medium">
                Chọn nhà cung cấp trước, chọn sản phẩm cung cấp và nhập kho tự động
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={(e) => handleSubmitPurchase(e, false)} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Chọn Nhà Cung Cấp & Thông tin chung */}
          <div className="bg-rose-50/40 border border-rose-100/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-[#fb6f92]" />
              <span>Bước 1: Chọn Nhà Cung Cấp / Xưởng May</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Nhà cung cấp / Xưởng may *
                </label>
                <Dropdown
                  value={partnerId}
                  onChange={e => handleSupplierChange(e.target.value)}
                  required
                  className="w-full"
                  options={[
                    { value: '', label: '-- Chọn Nhà Cung Cấp / Xưởng May --' },
                    ...suppliers.map(s => ({
                      value: s.id,
                      label: `${s.code} - ${s.name} ${s.phone ? `(${s.phone})` : ''}`
                    }))
                  ]}
                />
                {selectedSupplier && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Địa chỉ: {selectedSupplier.address || 'Chưa cập nhật'} • MST: {selectedSupplier.taxCode || 'Chưa có'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Số phiếu nhập *</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ngày lập phiếu *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Chọn Sản Phẩm Của Nhà Cung Cấp */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-[#fb6f92]" />
                <span>Bước 2: Chọn Sản Phẩm Nhà Cung Cấp Có Thể Cung Cấp</span>
                {selectedSupplier && (
                  <span className="text-[10px] bg-rose-100 text-[#a93054] px-2 py-0.5 rounded-full font-bold">
                    {supplierProducts.length} sản phẩm
                  </span>
                )}
              </div>

              {/* NÚT TẠO SẢN PHẨM MỚI NGAY TẠI KHU VỰC CHỌN SẢN PHẨM */}
              <button
                type="button"
                onClick={handleOpenNewProductModal}
                disabled={!partnerId}
                className="flex items-center gap-1.5 bg-linear-to-r from-[#fb6f92] to-[#ff8fab] hover:from-[#f43f5e] hover:to-[#fb6f92] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                title="Tạo sản phẩm mới và tự động gán cho nhà cung cấp hiện tại"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tạo sản phẩm mới</span>
              </button>
            </div>

            {!partnerId ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                <Building2 className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                Vui lòng chọn <strong>Nhà Cung Cấp</strong> ở trên trước để hệ thống lọc các sản phẩm xưởng có thể cung cấp.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên SP, mã SKU hoặc barcode trong danh mục NCC..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#fb6f92]"
                    />
                  </div>

                  <div className="w-full sm:w-48">
                    <Dropdown
                      size="sm"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full"
                      options={[
                        { value: 'ALL', label: 'Tất cả danh mục' },
                        ...categories.map(c => ({ value: c.id, label: c.name }))
                      ]}
                    />
                  </div>
                </div>

                {/* Horizontal Product Quick List */}
                <div className="border border-slate-100 rounded-xl p-2 bg-slate-50/50 max-h-40 overflow-y-auto">
                  {loadingSupplierProds ? (
                    <div className="p-4 text-center text-xs text-slate-400">Đang tải danh mục sản phẩm của nhà cung cấp...</div>
                  ) : filteredSupplierProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Không tìm thấy sản phẩm nào của nhà cung cấp này phù hợp với bộ lọc.
                      <div className="mt-1">
                        Bấm <strong>"+ Tạo sản phẩm mới"</strong> ở góc phải để thêm mặt hàng mới ngay vào phiếu nhập.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredSupplierProducts.slice(0, 15).map(prod => {
                        const isAdded = items.some(it => it.productId === prod.id);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                              isAdded 
                                ? 'bg-pink-50/70 border-pink-300 text-[#a93054]' 
                                : 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-pink-200 text-slate-800'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="font-bold truncate flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-pink-600 bg-pink-100 px-1 rounded">{prod.code}</span>
                                <span className="truncate">{prod.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Giá nhập: {formatCurrency(prod.lastPurchasePrice || prod.costPrice || 0)} • Tồn: {prod.currentStock ?? prod.openingQuantity ?? 0} {prod.unit}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`p-1 rounded-lg shrink-0 ${
                                isAdded ? 'bg-pink-200 text-[#a93054]' : 'bg-slate-100 hover:bg-[#fb6f92] hover:text-white text-slate-600'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Bảng Các Mặt Hàng Trong Phiếu Nhập */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#fb6f92]" />
                <span>Chi tiết các mặt hàng nhập kho ({items.length})</span>
              </label>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Sản phẩm</th>
                    <th className="p-2.5 w-16 text-center">ĐVT</th>
                    <th className="p-2.5 w-16 text-center">Tồn kho</th>
                    <th className="p-2.5 w-24 text-center">Số lượng nhập</th>
                    <th className="p-2.5 w-32 text-right">Đơn giá nhập</th>
                    <th className="p-2.5 w-20 text-center">% VAT</th>
                    <th className="p-2.5 w-32 text-right">Thành tiền</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Chưa có sản phẩm nào trong phiếu nhập. Vui lòng chọn sản phẩm từ danh sách NCC ở trên hoặc bấm "+ Tạo sản phẩm mới".
                      </td>
                    </tr>
                  ) : (
                    items.map((row, idx) => (
                      <tr key={row.productId} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{row.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {row.itemCode}</div>
                        </td>
                        <td className="p-2.5 text-center text-slate-600">{row.unit}</td>
                        <td className="p-2.5 text-center font-mono text-slate-500">{row.currentStock}</td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#fb6f92]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={row.unitPrice}
                            onChange={e => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#fb6f92]"
                          />
                        </td>
                        <td className="p-2.5">
                          <Dropdown
                            size="sm"
                            value={row.vatRate}
                            onChange={e => handleUpdateItem(idx, 'vatRate', Number(e.target.value))}
                            className="w-24 mx-auto text-center"
                            options={[
                              { value: 0, label: '0%' },
                              { value: 5, label: '5%' },
                              { value: 8, label: '8%' },
                              { value: 10, label: '10%' }
                            ]}
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.totalAmount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-300 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Thanh toán & Ghi chú */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            
            {/* Cột trái: Thanh toán & Ghi chú */}
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2.5">
                <label className="block text-slate-800 font-bold">Hình thức thanh toán cho Nhà Cung Cấp</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('UNPAID')}
                    className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                      paymentOption === 'UNPAID'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Ghi Nợ (TK 331)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('PAID')}
                    className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                      paymentOption === 'PAID'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Trả Đủ 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption('PARTIAL')}
                    className={`p-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                      paymentOption === 'PARTIAL'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Trả 1 Phần
                  </button>
                </div>

                {paymentOption === 'PARTIAL' && (
                  <div className="pt-2">
                    <label className="block text-slate-700 font-bold mb-1">Số tiền thanh toán trước (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={customPaidAmount}
                      onChange={e => setCustomPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Nhập số tiền trả trước..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                    />
                  </div>
                )}

                {paymentOption !== 'UNPAID' && (
                  <div className="pt-1">
                    <label className="block text-slate-700 font-bold mb-1">Nguồn tiền chi trả</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentFund('1111')}
                        className={`p-1.5 rounded-lg text-center font-medium transition cursor-pointer ${
                          paymentFund === '1111' ? 'bg-[#a93054] text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Tiền mặt (TK 111)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentFund('1121')}
                        className={`p-1.5 rounded-lg text-center font-medium transition cursor-pointer ${
                          paymentFund === '1121' ? 'bg-[#a93054] text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Chuyển khoản (TK 112)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Ghi chú phiếu nhập hàng</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú về lô hàng, chất lượng vải, điều kiện thanh toán..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                />
              </div>
            </div>

            {/* Cột phải: Bảng Tổng Kết Số Liệu */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền hàng (chưa VAT):</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Chiết khấu mua hàng:</span>
                    <span className="font-mono font-bold">-{formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-600">
                  <span>Thuế GTGT khấu trừ (TK 133):</span>
                  <span className="font-mono font-bold">+{formatCurrency(vatTotal)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="font-mono text-[#a93054]">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span className="text-slate-500">Ghi nợ NCC (TK 331):</span>
                  <span className="font-mono text-rose-600">
                    {formatCurrency(
                      paymentOption === 'PAID' 
                        ? 0 
                        : paymentOption === 'PARTIAL' 
                          ? Math.max(0, grandTotal - (Number(customPaidAmount) || 0)) 
                          : grandTotal
                    )}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-white p-2 rounded-xl border border-slate-100">
                * Khi bấm xác nhận, hệ thống sẽ tự động tăng số lượng tồn kho của các sản phẩm nhập và hạch toán vào Sổ Nhật ký Chung / Công nợ NCC.
              </div>
            </div>

          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-rose-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-white text-xs font-bold transition cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => handleSubmitPurchase(e, false)}
              disabled={items.length === 0 || !partnerId}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-linear-to-r from-[#fb6f92] to-[#ff8fab] hover:from-[#f43f5e] hover:to-[#fb6f92] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Xác Nhận & Nhập Kho</span>
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================================== */}
      {/* SUB-MODAL: TẠO SẢN PHẨM MỚI NGAY TRONG NHẬP HÀNG                        */}
      {/* ======================================================================== */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-rose-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-[#fb6f92] to-[#ff8fab] text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PackagePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-wide">TẠO SẢN PHẨM MỚI CHO NHÀ CUNG CẤP</h4>
                  <p className="text-[11px] text-rose-100">
                    Sản phẩm mới sẽ tự động gán cho NCC và tự động thêm vào phiếu nhập hiện tại
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewProductModalOpen(false)} 
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="p-6 space-y-4 text-xs">
              
              {newProdError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{newProdError}</span>
                </div>
              )}

              {/* Nhà Cung Cấp hiển thị rõ ràng */}
              <div className="p-3 bg-pink-50/60 border border-pink-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Nhà cung cấp gán sản phẩm:</span>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">
                    {selectedSupplier?.code} - {selectedSupplier?.name}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-pink-200 text-[#a93054] text-[10px] font-bold rounded-full">
                  Tự động liên kết
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* SKU */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mã sản phẩm (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={newProdData.code}
                    onChange={e => setNewProdData({ ...newProdData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: AK009, SM012..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                {/* Tên SP */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tên sản phẩm thời trang *</label>
                  <input
                    type="text"
                    required
                    value={newProdData.name}
                    onChange={e => setNewProdData({ ...newProdData, name: e.target.value })}
                    placeholder="VD: Áo Sơ Mi Linen Nam Tay Dài..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                {/* Danh mục */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Danh mục *</label>
                  <Dropdown
                    required
                    value={newProdData.categoryId}
                    onChange={e => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setNewProdData({
                        ...newProdData,
                        categoryId: e.target.value,
                        category: cat?.name || ''
                      });
                    }}
                    className="w-full"
                    options={[
                      { value: '', label: '-- Chọn danh mục --' },
                      ...categories.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </div>

                {/* Đơn vị tính */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Đơn vị tính *</label>
                  <Dropdown
                    value={newProdData.unit}
                    onChange={e => setNewProdData({ ...newProdData, unit: e.target.value })}
                    className="w-full"
                    options={[
                      { value: 'Cái', label: 'Cái' },
                      { value: 'Chiếc', label: 'Chiếc' },
                      { value: 'Bộ', label: 'Bộ' },
                      { value: 'Đôi', label: 'Đôi' },
                      { value: 'Mét', label: 'Mét' }
                    ]}
                  />
                </div>

                {/* Giá nhập */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giá nhập xưởng (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={newProdData.costPrice}
                    onChange={e => setNewProdData({ ...newProdData, costPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                {/* Giá bán */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Giá bán niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newProdData.sellingPrice}
                    onChange={e => setNewProdData({ ...newProdData, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

                {/* Số lượng nhập ngay */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Số lượng nhập ngay vào phiếu *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProdData.importQuantity}
                    onChange={e => setNewProdData({ ...newProdData, importQuantity: Number(e.target.value) })}
                    className="w-full bg-pink-50 border border-pink-300 rounded-xl px-3 py-2 font-mono font-bold text-[#a93054] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Tồn kho ban đầu là 0. Tồn kho sau nhập = {newProdData.importQuantity || 0}</p>
                </div>

                {/* Barcode (tùy chọn) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mã vạch / Barcode</label>
                  <input
                    type="text"
                    value={newProdData.barcode}
                    onChange={e => setNewProdData({ ...newProdData, barcode: e.target.value })}
                    placeholder="VD: 893..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewProduct}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#fb6f92] hover:bg-[#a93054] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingNewProduct ? 'Đang lưu...' : 'Lưu & Thêm Vào Phiếu Nhập'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
