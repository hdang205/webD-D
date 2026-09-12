import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Layers, 
  Package, 
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Category, AuthUser } from '../../types/accounting.js';
import { CategoryService } from '../../services/masterDataService.js';

interface CategoriesViewProps {
  currentUser?: AuthUser | null;
  onSelectCategoryFilter?: (categoryName: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  currentUser,
  onSelectCategoryFilter
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canEdit = currentUser?.role === 'DIRECTOR' || 
                  currentUser?.role === 'CHIEF_ACCOUNTANT' || 
                  currentUser?.role === 'WAREHOUSE_MANAGER';

  const loadCategories = async (search?: string) => {
    try {
      setLoading(true);
      const data = await CategoryService.getAll(search);
      setCategories(data);
    } catch (err: any) {
      console.error('Lỗi khi tải danh mục:', err);
      setActionMessage({ type: 'error', text: err.message || 'Không thể tải danh sách danh mục.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(searchTerm);
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({ code: '', name: '', description: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      code: cat.code,
      name: cat.name,
      description: cat.description || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Tên danh mục là bắt buộc và không được để trống.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (editingCategory) {
        await CategoryService.update(editingCategory.id, formData);
        setActionMessage({ type: 'success', text: `Cập nhật danh mục "${formData.name}" thành công.` });
      } else {
        await CategoryService.create(formData);
        setActionMessage({ type: 'success', text: `Thêm mới danh mục "${formData.name}" thành công.` });
      }

      handleCloseModal();
      await loadCategories(searchTerm);
    } catch (err: any) {
      setFormError(err.message || 'Có lỗi xảy ra khi lưu danh mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if ((cat.productCount || 0) > 0) {
      alert(`Không thể xóa danh mục "${cat.name}" vì hiện đang có ${cat.productCount} sản phẩm liên kết.`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}" (${cat.code})?`)) {
      return;
    }

    try {
      await CategoryService.delete(cat.id);
      setActionMessage({ type: 'success', text: `Đã xóa danh mục "${cat.name}" thành công.` });
      await loadCategories(searchTerm);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Không thể xóa danh mục này.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 shadow-inner">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Quản Lý Danh Mục Nhóm Hàng</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-rose-300 border border-slate-700">
                {categories.length} nhóm
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Phân loại danh mục thời trang chuẩn hóa theo cơ sở dữ liệu SQLite TT133/200
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCategories(searchTerm)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer border border-slate-700"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Danh Mục</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionMessage && (
        <div className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold animate-fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tìm kiếm */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm theo tên danh mục, mã nhóm hàng..."
          className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white text-xs px-2 py-1">
            Xóa
          </button>
        )}
      </div>

      {/* Bảng Danh mục */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Mã Danh Mục</th>
                <th className="px-5 py-3.5">Tên Nhóm Hàng</th>
                <th className="px-5 py-3.5">Mô Tả & Quy Cách</th>
                <th className="px-5 py-3.5 text-center">Số Lượng Sản Phẩm</th>
                <th className="px-5 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                      <span>Đang tải dữ liệu từ máy chủ SQLite...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Không tìm thấy danh mục nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-mono font-bold text-rose-400">
                      {cat.code}
                    </td>
                    <td className="px-5 py-4 font-bold text-white">
                      {cat.name}
                    </td>
                    <td className="px-5 py-4 text-slate-400 max-w-md">
                      {cat.description || <span className="italic text-slate-600">Chưa có mô tả</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        (cat.productCount || 0) > 0 
                          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Package className="w-3 h-3" />
                        {cat.productCount || 0} SP
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(cat)}
                              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                              title="Sửa danh mục"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="p-1.5 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-lg transition cursor-pointer"
                              title="Xóa danh mục"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Danh Mục */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Lưu trực tiếp vào CSDL SQLite hệ thống</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Mã Danh Mục:
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="VD: CAT_SOMI, CAT_VAY (để trống sẽ tự sinh)"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tên Danh Mục: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Áo Sơ Mi, Váy & Đầm, Blazer..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Mô Tả / Ghi Chú:
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả phong cách, chất liệu, tiêu chuẩn phân loại..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition cursor-pointer shadow-md shadow-rose-950/40"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu Danh Mục'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesView;
