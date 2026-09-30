import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Tag, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  Download, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  LayoutGrid, 
  List, 
  Barcode, 
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Copy,
  Check,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { InventoryItem, AuthUser, Category } from '../../types/accounting';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelExport';
import { canUserViewCostPrice, ROLE_CONFIGS } from '../../utils/rbac';
import { ProductService, CategoryService } from '../../services/masterDataService';

interface ProductsViewProps {
  inventory: InventoryItem[];
  currentUser?: AuthUser | null;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem?: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onNavigateToCategories?: () => void;
  onReloadProducts?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  inventory,
  currentUser,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onNavigateToCategories,
  onReloadProducts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportExcelDefault = async () => {
    try {
      setImportLoading(true);
      setImportError(null);
      setImportResult(null);

      const res = await ProductService.importExcel();
      if (res && res.success) {
        setImportResult(res.stats);
        if (onReloadProducts) {
          onReloadProducts();
        }
      } else {
        setImportError(res?.error || 'Import thất bại.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Lỗi khi import file Excel.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportError(null);
      setImportResult(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64String = (event.target?.result as string).split(',')[1];
          const res = await ProductService.importExcel(base64String);
          if (res && res.success) {
            setImportResult(res.stats);
            if (onReloadProducts) {
              onReloadProducts();
            }
          } else {
            setImportError(res?.error || 'Import thất bại.');
          }
        } catch (err: any) {
          setImportError(err.message || 'Lỗi xử lý file.');
        } finally {
          setImportLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setImportError(err.message || 'Lỗi đọc file.');
      setImportLoading(false);
    }
  };

  // Role permissions
  const canViewCost = canUserViewCostPrice(currentUser);
  const userRole = currentUser?.role || 'DIRECTOR';
  const roleConfig = ROLE_CONFIGS[userRole] || ROLE_CONFIGS.STAFF;
  const canEdit = roleConfig.canEditProducts;

  // 7 Danh mục chuẩn định hình toàn hệ thống D&D Fashion Store
  const CANONICAL_CATEGORIES: Category[] = [
    { id: 'cat_aokhoac', code: 'AOKHOAC', name: 'Áo khoác' },
    { id: 'cat_damvay', code: 'DAMVAY', name: 'Đầm/Váy' },
    { id: 'cat_jeans', code: 'JEANS', name: 'Quần jeans' },
    { id: 'cat_tuixach', code: 'TUIXACH', name: 'Túi xách' },
    { id: 'cat_giaydepnu', code: 'GIAYDEPNU', name: 'Giày dép nữ' },
    { id: 'cat_aothun', code: 'AOTHUN', name: 'Áo thun' },
    { id: 'cat_somi', code: 'SOMI', name: 'Áo sơ mi' },
  ];

  const [categoriesList, setCategoriesList] = useState<Category[]>(CANONICAL_CATEGORIES);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    CategoryService.getAll().then(cats => {
      if (cats && cats.length > 0) {
        setCategoriesList(cats);
      }
    }).catch(err => {
      console.warn('Lỗi khi tải danh sách danh mục:', err);
    });
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'Cái',
    categoryId: 'cat_damvay',
    category: 'Đầm/Váy',
    size: 'M',
    color: 'Hồng Pastel',
    barcode: '',
    costPrice: 200000,
    sellingPrice: 450000,
    openingQuantity: 20,
    minStockLevel: 5,
    description: '',
  });

  const availableCategories = categoriesList.length > 0 
    ? categoriesList.map(c => c.name) 
    : CANONICAL_CATEGORIES.map(c => c.name);

  const filteredItems = inventory.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.size && item.size.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.color && item.color.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCategory = categoryFilter === 'ALL' || 
      item.category === categoryFilter ||
      (item.category && item.category.toLowerCase() === categoryFilter.toLowerCase());
    
    let matchStock = true;
    if (stockStatusFilter === 'LOW') matchStock = item.openingQuantity <= item.minStockLevel && item.openingQuantity > 0;
    if (stockStatusFilter === 'OUT') matchStock = item.openingQuantity <= 0;
    if (stockStatusFilter === 'IN_STOCK') matchStock = item.openingQuantity > item.minStockLevel;

    return matchSearch && matchCategory && matchStock;
  });

  // KPIs
  const totalProductsCount = inventory.length;
  const totalStockQty = inventory.reduce((sum, i) => sum + i.openingQuantity, 0);
  const totalStockValue = inventory.reduce((sum, i) => sum + (i.openingQuantity * i.costPrice), 0);
  const lowStockCount = inventory.filter(i => i.openingQuantity <= i.minStockLevel).length;

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError(null);
    const activeCats = categoriesList.length > 0 ? categoriesList : CANONICAL_CATEGORIES;
    const defaultCat = activeCats[0];
    setFormData({
      code: `SP00${inventory.length + 1}`,
      name: '',
      unit: 'Cái',
      categoryId: defaultCat?.id || 'cat_damvay',
      category: defaultCat?.name || 'Đầm/Váy',
      size: 'M',
      color: 'Hồng Pastel',
      barcode: `893888200${inventory.length + 1}`,
      costPrice: 250000,
      sellingPrice: 550000,
      openingQuantity: 15,
      minStockLevel: 5,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormError(null);
    const activeCats = categoriesList.length > 0 ? categoriesList : CANONICAL_CATEGORIES;
    const matchedCat = activeCats.find(c => 
      c.id === item.categoryId || 
      (c.name && item.category && c.name.toLowerCase() === item.category.toLowerCase())
    );
    setFormData({
      code: item.code,
      name: item.name,
      unit: item.unit,
      categoryId: item.categoryId || matchedCat?.id || activeCats[0]?.id || '',
      category: item.category || matchedCat?.name || activeCats[0]?.name || '',
      size: item.size || 'M',
      color: item.color || '',
      barcode: item.barcode || '',
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      openingQuantity: item.openingQuantity,
      minStockLevel: item.minStockLevel,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Tên mẫu thời trang là bắt buộc và không được để trống.');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Vui lòng chọn danh mục cho sản phẩm.');
      return;
    }

    if (formData.sellingPrice < 0) {
      setFormError('Giá bán niêm yết không được là số âm.');
      return;
    }

    if (formData.costPrice < 0) {
      setFormError('Giá vốn không được là số âm.');
      return;
    }

    if (formData.openingQuantity < 0) {
      setFormError('Số lượng tồn kho ban đầu không được là số âm.');
      return;
    }

    if (formData.minStockLevel < 0) {
      setFormError('Định mức tồn tối thiểu không được là số âm.');
      return;
    }

    const openingVal = formData.openingQuantity * formData.costPrice;

    if (editingItem && onUpdateItem) {
      onUpdateItem({
        ...editingItem,
        ...formData,
        openingValue: openingVal,
      });
    } else {
      onAddItem({
        ...formData,
        openingValue: openingVal,
      });
    }
    setIsModalOpen(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleExportCSV = () => {
    const now = new Date();
    const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    
    const headers = ['STT', 'Mã SP', 'Tên Sản Phẩm Thời Trang', 'Danh Mục', 'ĐVT', 'Size', 'Màu Sắc', 'Giá Bán (VNĐ)', 'Tồn Kho Thực Tế', 'Định Mức Tối Thiểu'];
    const currencyCols: number[] = [7];
    if (canViewCost) {
      headers.push('Giá Vốn (VNĐ)', 'Tổng Giá Trị Tồn (VNĐ)');
      currencyCols.push(10, 11);
    }

    const rows = inventory.map((i, idx) => {
      const row: any[] = [
        idx + 1,
        i.code,
        i.name,
        i.category,
        i.unit,
        i.size || '',
        i.color || '',
        i.sellingPrice,
        i.openingQuantity,
        i.minStockLevel
      ];
      if (canViewCost) {
        row.push(i.costPrice, (i.openingQuantity || 0) * (i.costPrice || 0));
      }
      return row;
    });

    exportToExcel({
      title: 'BÁO CÁO DANH MỤC SẢN PHẨM THỜI TRANG D&D',
      subtitle: `Tổng số sản phẩm: ${inventory.length} mã hàng`,
      filename: `Bao_cao_san_pham_${dateSuffix}.xlsx`,
      sheetName: 'Sản Phẩm',
      headers,
      rows,
      currencyColumns: currencyCols,
      numberColumns: [0, 8, 9],
      includeTotalRow: true,
      totalLabel: 'TỔNG CỘNG',
      totalColumns: canViewCost ? [8, 11] : [8]
    });
  };

  return (
    <div id="products-view" className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="bg-white border border-rose-100/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <Tag className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Quản Lý Danh Mục Sản Phẩm & Bộ Sưu Tập Thời Trang
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {canViewCost
              ? 'Quản lý mã SP, size, màu sắc, giá vốn (TK 156), giá bán niêm yết & cảnh báo tồn an toàn'
              : 'Tra cứu mã SP, mẫu mã, size, màu sắc & giá bán niêm yết phục vụ bán hàng quầy'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'GRID' ? 'bg-white shadow-xs text-[#a93054]' : 'text-slate-500'}`}
              title="Xem dạng thẻ (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'TABLE' ? 'bg-white shadow-xs text-[#a93054]' : 'text-slate-500'}`}
              title="Xem dạng bảng (Table)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setIsImportModalOpen(true);
                setImportResult(null);
                setImportError(null);
              }}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs px-3 py-2 rounded-xl border border-emerald-200 transition shadow-xs cursor-pointer"
              title="Import danh mục sản phẩm từ file Excel DD_products_import.xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#a93054] text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sản Phẩm</span>
            </button>
          )}

          {onNavigateToCategories && (
            <button
              onClick={onNavigateToCategories}
              className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs px-3 py-2 rounded-xl border border-purple-200 transition cursor-pointer"
              title="Quản lý danh mục & nhóm hàng"
            >
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <span>Nhóm Hàng</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-rose-50/60 hover:bg-rose-100 text-slate-700 font-medium text-xs px-3 py-2 rounded-xl border border-rose-200/60 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Tổng Mẫu Sản Phẩm</span>
            <Tag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-800 font-mono">{totalProductsCount} SKUs</div>
          <div className="text-[10px] text-slate-400">Đang kinh doanh</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Tổng Số Lượng Tồn</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-700 font-mono">{totalStockQty} sản phẩm</div>
          <div className="text-[10px] text-slate-400">Tồn tại kho & quầy</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>{canViewCost ? 'Giá Trị Tồn Kho (156)' : 'Mẫu Đang Sẵn Sàng Bán'}</span>
            {canViewCost ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <Layers className="w-4 h-4 text-emerald-500" />}
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            {canViewCost ? formatCurrency(totalStockValue) : `${inventory.filter(i => i.openingQuantity > 0).length} Mẫu Có Sẵn`}
          </div>
          <div className="text-[10px] text-slate-400">{canViewCost ? 'Tính theo giá vốn nhập' : 'Phục vụ tư vấn khách'}</div>
        </div>

        <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Cảnh Báo Hàng Sắp Hết</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono">{lowStockCount} mặt hàng</div>
          <div className="text-[10px] text-slate-400">Cần lập đề xuất nhập thêm</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-rose-100/80 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã SP, tên đầm váy, size, màu sắc..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb6f92]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái tồn</option>
              <option value="IN_STOCK">Còn hàng (Dồi dào)</option>
              <option value="LOW">Sắp hết hàng (Dưới định mức)</option>
              <option value="OUT">Hết hàng (Tồn = 0)</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-[#fb6f92] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-rose-50 text-slate-600'
            }`}
          >
            Tất cả ({inventory.length})
          </button>
          {availableCategories.map(cat => {
            const count = inventory.filter(i => 
              i.category === cat || 
              (i.category && i.category.toLowerCase() === cat.toLowerCase())
            ).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#fb6f92] text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-rose-50 text-slate-600'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Display Mode: Grid or Table */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isLowStock = item.openingQuantity <= item.minStockLevel;
            const marginProfit = item.sellingPrice - item.costPrice;
            const marginPercent = Math.round((marginProfit / item.sellingPrice) * 100);

            return (
              <div
                key={item.id}
                className="bg-white border border-rose-100/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Product Image Thumbnail */}
                  <div className="w-full h-44 bg-slate-50 rounded-xl overflow-hidden relative border border-slate-100 flex items-center justify-center group mb-3">
                    <img 
                      src={item.imageUrl || `/images/products/${item.code}.png`} 
                      alt={item.name} 
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/products/SP01.png';
                      }}
                    />
                    {isLowStock && (
                      <span className="absolute top-2 right-2 bg-rose-500/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {item.openingQuantity === 0 ? 'Hết hàng' : 'Sắp hết'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleCopy(item.code)}
                      title="Nhấp để sao chép mã sản phẩm"
                      className="font-mono font-bold text-xs text-[#a93054] bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-md border border-pink-100 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.code}</span>
                      {copiedCode === item.code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-xs mt-2.5 line-clamp-2 leading-relaxed">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span className="bg-rose-50 px-2 py-0.5 rounded text-slate-700 font-medium">
                      ĐVT: {item.unit}
                    </span>
                    {item.size && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                        Size {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                        {item.color}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-rose-50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Giá bán niêm yết:</span>
                    <span className="font-mono font-bold text-[#a93054] text-sm">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                  </div>

                  {canViewCost && (
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Giá vốn (156):</span>
                      <span className="font-mono">{formatCurrency(item.costPrice)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Tồn thực tế:</span>
                    <span className={`font-mono font-bold ${isLowStock ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {item.openingQuantity} {item.unit} {isLowStock && '(Cảnh báo)'}
                    </span>
                  </div>

                  {/* Stock Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (item.openingQuantity / (item.minStockLevel * 3 || 15)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-rose-50">
                  <div className="text-[10px] text-slate-400">
                    {canViewCost ? (
                      <>Lợi nhuận: <strong className="text-emerald-600">+{marginPercent}%</strong></>
                    ) : (
                      <span>Định mức an toàn: {item.minStockLevel} {item.unit}</span>
                    )}
                  </div>
                  
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Sửa sản phẩm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa sản phẩm ${item.name}?`)) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCopy(item.code)}
                      className="text-[10px] font-bold text-[#a93054] hover:underline cursor-pointer"
                    >
                      Sao chép mã
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-rose-100/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-rose-50/50 text-slate-700 font-semibold border-b border-rose-100">
                <tr>
                  <th className="py-3 px-3 w-16 text-center">Ảnh</th>
                  <th className="py-3 px-4 w-24">Mã SP</th>
                  <th className="py-3 px-4">Tên Mẫu Thời Trang</th>
                  <th className="py-3 px-4">Danh Mục</th>
                  <th className="py-3 px-4">Size & Màu</th>
                  {canViewCost && <th className="py-3 px-4 text-right">Giá Vốn (156)</th>}
                  <th className="py-3 px-4 text-right">Giá Bán Niêm Yết</th>
                  <th className="py-3 px-4 text-right">Tồn Kho</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  {canViewCost && <th className="py-3 px-4 text-right">Giá Trị Tồn</th>}
                  <th className="py-3 px-4 text-center w-24">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-pink-50/30 transition">
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-10 h-10 mx-auto rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <img 
                          src={item.imageUrl || `/images/products/${item.code}.png`} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/products/SP01.png';
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#a93054]">{item.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.size ? `Size ${item.size}` : '-'} {item.color ? `• ${item.color}` : ''}
                    </td>
                    {canViewCost && (
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(item.costPrice)}</td>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#a93054]">{formatCurrency(item.sellingPrice)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={item.openingQuantity <= item.minStockLevel ? 'text-amber-600' : 'text-emerald-700'}>
                        {item.openingQuantity} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.openingQuantity <= 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                          Hết hàng
                        </span>
                      ) : item.openingQuantity <= item.minStockLevel ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                          Sắp hết
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          Còn hàng
                        </span>
                      )}
                    </td>
                    {canViewCost && (
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(item.openingQuantity * item.costPrice)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      {canEdit ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa sản phẩm ${item.name}?`)) {
                                onDeleteItem(item.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCopy(item.code)}
                          className="text-[10px] font-bold text-[#a93054] hover:underline cursor-pointer"
                        >
                          Sao chép
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#fb6f92]" />
                <span>{editingItem ? 'Chỉnh Sửa Mẫu Sản Phẩm' : 'Thêm Mẫu Sản Phẩm Mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Sản Phẩm *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#a93054] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã Vạch Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Mẫu Thời Trang *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Đầm Lụa Dáng Xòe Phối Nơ Cổ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Danh Mục *</label>
                  <select
                    id="select-product-category"
                    required
                    value={formData.categoryId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const activeCats = categoriesList.length > 0 ? categoriesList : CANONICAL_CATEGORIES;
                      const selectedCat = activeCats.find(c => c.id === selectedId);
                      setFormData({
                        ...formData,
                        categoryId: selectedId,
                        category: selectedCat ? selectedCat.name : ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {(categoriesList.length > 0 ? categoriesList : CANONICAL_CATEGORIES).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Size</label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <option value="XS">XS (40-45kg)</option>
                    <option value="S">S (46-50kg)</option>
                    <option value="M">M (51-56kg)</option>
                    <option value="L">L (57-62kg)</option>
                    <option value="XL">XL (63-70kg)</option>
                    <option value="FreeSize">FreeSize</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Màu Sắc</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="VD: Đen, Trắng..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá Vốn Nhập (TK 156) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá Bán Niêm Yết *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#a93054]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số Lượng Tồn Ban Đầu</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.openingQuantity}
                    onChange={(e) => setFormData({ ...formData, openingQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Định Mức Tồn Tối Thiểu</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#fb6f92] hover:bg-[#a93054] text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingItem ? 'Lưu Thay Đổi' : 'Thêm Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-rose-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Sản Phẩm Từ Excel</h3>
                  <p className="text-xs text-emerald-700 font-medium">Hỗ trợ file DD_products_import.xlsx (140 sản phẩm)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Option 1: 1-Click Default Import */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Tệp Nguồn Chuẩn Hệ Thống:</span>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                    data/import/DD_products_import.xlsx
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bao gồm 140 sản phẩm thuộc 7 danh mục thời trang kèm 140 ảnh tương ứng. Hệ thống tự động sinh giá niêm yết và giá nhập hợp lệ.
                </p>
                <button
                  type="button"
                  disabled={importLoading}
                  onClick={handleImportExcelDefault}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Xử Lý & Import Database SQLite...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Thực Hiện Import 140 Sản Phẩm Ngay</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: Custom File Upload */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-bold text-slate-700 mb-2">Hoặc Chọn File Excel Tùy Chỉnh (.xlsx):</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-4 text-center cursor-pointer transition">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={importLoading}
                    onChange={handleImportExcelFile}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lỗi Import: </span>
                    <span>{importError}</span>
                  </div>
                </div>
              )}

              {/* Success Result Summary */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Import Thành Công {importResult.success} Sản Phẩm Vào Database!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-emerald-200/60 text-slate-700 font-medium">
                    <div>Tổng sản phẩm trong DB: <strong>{importResult.totalProductsInDb}</strong></div>
                    <div>Tổng nhóm danh mục: <strong>{importResult.totalCategoriesInDb}</strong></div>
                    <div>Giá bán thấp nhất: <strong>{formatCurrency(importResult.pricing?.minSalePrice || 0)}</strong></div>
                    <div>Giá bán cao nhất: <strong>{formatCurrency(importResult.pricing?.maxSalePrice || 0)}</strong></div>
                    <div className="col-span-2">Giá bán trung bình: <strong>{formatCurrency(importResult.pricing?.avgSalePrice || 0)}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
