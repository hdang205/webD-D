import React, { useState } from 'react';
import { X, Save, Building2, Upload, Download, RotateCcw } from 'lucide-react';
import { Dropdown } from '../Common/Dropdown';
import { CompanyInfo, AccountingStandard } from '../../types/accounting';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  onSaveCompanyInfo: (data: CompanyInfo) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onResetToDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  companyInfo,
  onSaveCompanyInfo,
  onExportBackup,
  onImportBackup,
  onResetToDefaults
}) => {
  const [formData, setFormData] = useState<CompanyInfo>(companyInfo);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompanyInfo(formData);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportBackup(content);
        if (success) {
          alert('Khôi phục dữ liệu sao lưu thành công!');
          window.location.reload();
        } else {
          alert('Tệp sao lưu không đúng định dạng dữ liệu kế toán!');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-rose-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-100/70 text-[#fb6f92]">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Thiết Lập Thông Tin Doanh Nghiệp</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-rose-50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tên Doanh Nghiệp *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:bg-white focus:border-[#fb6f92] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã Số Thuế (MST) *</label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Chế Độ Kế Toán Áp Dụng</label>
              <Dropdown
                value={formData.accountingStandard}
                onChange={e => setFormData({ ...formData, accountingStandard: e.target.value as AccountingStandard })}
                className="w-full bg-slate-50 border-slate-200"
              >
                <option value="TT133">Thông tư 133/2016/TT-BTC (Doanh nghiệp nhỏ và vừa)</option>
                <option value="TT200">Thông tư 200/2014/TT-BTC (Doanh nghiệp lớn / đầy đủ)</option>
              </Dropdown>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Địa Chỉ Trụ Sở Công Ty</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số Điện Thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Kế Toán</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số Tài Khoản Ngân Hàng</label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên Ngân Hàng Mở TK</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Giám Đốc (Đại diện pháp luật)</label>
              <input
                type="text"
                value={formData.directorName}
                onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kế Toán Trưởng</label>
              <input
                type="text"
                value={formData.chiefAccountant}
                onChange={e => setFormData({ ...formData, chiefAccountant: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Thủ Quỹ</label>
              <input
                type="text"
                value={formData.treasurerName}
                onChange={e => setFormData({ ...formData, treasurerName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-[#fb6f92] focus:outline-none"
              />
            </div>
          </div>

          {/* Backup & Data Management Box */}
          <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl space-y-3 pt-3">
            <h4 className="font-bold text-slate-800">Quản Lý & Sao Lưu Dữ Liệu</h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao lưu tệp JSON</span>
              </button>

              <label className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Phục hồi tệp JSON</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn khôi phục về dữ liệu mẫu ban đầu? Toàn bộ thay đổi sẽ bị làm mới.')) {
                    onResetToDefaults();
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs cursor-pointer ml-auto border border-rose-200 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset dữ liệu mẫu</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-rose-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-white bg-[#fb6f92] hover:bg-[#a93054] rounded-xl font-semibold transition cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
