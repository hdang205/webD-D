import React, { useState } from 'react';
import { X, Save, Package } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { InventoryItem } from '../../types/accounting';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'>) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [code, setCode] = useState(() => `SP${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Cái');
  const [category, setCategory] = useState('Áo Sơ Mi');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [openingQuantity, setOpeningQuantity] = useState<number | ''>('');
  const [minStockLevel, setMinStockLevel] = useState<number | ''>(5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên sản phẩm thời trang');

    const qty = Number(openingQuantity || 0);
    const cost = Number(costPrice || 0);

    onSave({
      code,
      name,
      unit,
      category,
      costPrice: cost,
      sellingPrice: Number(sellingPrice || 0),
      openingQuantity: qty,
      openingValue: qty * cost,
      minStockLevel: Number(minStockLevel || 0),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Khai Báo Sản Phẩm Thời Trang Mới</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Mã sản phẩm (SKU) *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Đơn vị tính</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="VD: Chiếc, Bộ, Kg, Chai..."
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tên sản phẩm thời trang *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Áo Sơ Mi Lụa Silk Premium - Size M (Màu Kem)"
              required
              className="w-full bg-[#16191E] border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nhóm ngành thời trang</label>
            <Dropdown
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#16191E] border-white/20 text-slate-200"
            >
              <option value="Áo Sơ Mi">Áo Sơ Mi</option>
              <option value="Áo T-Shirt">Áo T-Shirt</option>
              <option value="Quần Jeans">Quần Jeans & Kaki</option>
              <option value="Váy & Đầm">Váy & Đầm</option>
              <option value="Áo Khoác & Blazer">Áo Khoác & Blazer</option>
              <option value="Phụ Kiện & Túi Xách">Phụ Kiện & Túi Xách</option>
              <option value="Giày Dép">Giày Dép</option>
              <option value="Khác">Khác</option>
            </Dropdown>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Giá vốn nhập (VND)</label>
              <input
                type="number"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="VD: 2500000"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Giá bán niêm yết (VND)</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="VD: 3200000"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Số lượng tồn đầu kỳ</label>
              <input
                type="number"
                value={openingQuantity}
                onChange={e => setOpeningQuantity(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Cảnh báo tồn tối thiểu</label>
              <input
                type="number"
                value={minStockLevel}
                onChange={e => setMinStockLevel(e.target.value ? Number(e.target.value) : '')}
                placeholder="5"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Vật Tư</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
