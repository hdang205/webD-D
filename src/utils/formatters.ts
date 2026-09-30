import { exportToExcel } from './excelExport';
export { exportToExcel } from './excelExport';

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getCurrentISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Tương thích ngược: Khi người dùng hoặc component gọi chức năng xuất file,
 * hệ thống luôn xuất định dạng Excel .xlsx thật chuẩn Microsoft Excel thay vì CSV.
 */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const safeFilename = filename.replace(/\.csv$/i, '') + '.xlsx';
  const headers = rows.length > 0 ? rows[0].map(h => String(h)) : [];
  const dataRows = rows.slice(1);
  const title = filename.replace(/\.(csv|xlsx)$/i, '').replace(/[_]+/g, ' ').trim();

  exportToExcel({
    title: title || 'BÁO CÁO DỮ LIỆU D&D FASHION',
    filename: safeFilename,
    headers,
    rows: dataRows
  });
}

