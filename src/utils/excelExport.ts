import * as XLSX from 'xlsx';

export interface ExcelExportConfig {
  title: string;
  subtitle?: string;
  filename: string; // Tên file ví dụ: Bao_cao_ton_kho_20260921.xlsx
  sheetName?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[];
  currencyColumns?: number[]; // Chỉ số các cột là tiền tệ (0-indexed)
  numberColumns?: number[];   // Chỉ số các cột là số lượng (0-indexed)
  includeTotalRow?: boolean;
  totalLabel?: string;
  totalColumns?: number[];    // Chỉ số các cột cần tính tổng (0-indexed)
}

/**
 * Xuất file Excel (.xlsx) chuẩn Microsoft Excel
 * - Tiêu đề rõ ràng, header có định dạng
 * - Cột được căn chỉnh độ rộng hợp lý tự động
 * - Định dạng tiền tệ VNĐ và số lượng rõ ràng
 * - UTF-8 không lỗi font tiếng Việt
 * - Tự động bật AutoFilter & Freeze Panes
 */
export function exportToExcel(config: ExcelExportConfig): void {
  const {
    title,
    subtitle,
    sheetName = 'Báo Cáo',
    headers,
    rows,
    columnWidths,
    currencyColumns = [],
    numberColumns = [],
    includeTotalRow = false,
    totalLabel = 'TỔNG CỘNG',
    totalColumns = []
  } = config;

  // 1. Đảm bảo phần mở rộng luôn là .xlsx
  let finalFilename = config.filename.trim();
  if (finalFilename.toLowerCase().endsWith('.csv')) {
    finalFilename = finalFilename.slice(0, -4) + '.xlsx';
  } else if (!finalFilename.toLowerCase().endsWith('.xlsx')) {
    finalFilename += '.xlsx';
  }

  // 2. Xây dựng ma trận dữ liệu (Array of Arrays - AOA)
  const aoa: any[][] = [];

  // Dòng 1: Tên đơn vị / Hệ thống
  aoa.push(['CỬA HÀNG THỜI TRANG D&D - HỆ THỐNG QUẢN TRỊ DOANH NGHIỆP D&D ERP']);

  // Dòng 2: Tiêu đề báo cáo
  aoa.push([title.toUpperCase()]);

  // Dòng 3: Metadata (Thời gian xuất, phụ đề)
  const now = new Date();
  const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const metaText = subtitle 
    ? `${subtitle} | Thời gian xuất: ${timeStr} | Đơn vị: VNĐ`
    : `Thời gian xuất báo cáo: ${timeStr} | Đơn vị tính: VNĐ`;
  aoa.push([metaText]);

  // Dòng 4: Dòng trống
  aoa.push([]);

  // Dòng 5: Tiêu đề các cột (Header)
  aoa.push(headers);
  const headerRowIndex = 4; // 0-indexed: dòng thứ 5 trong Excel (hàng 5)

  // Dòng 6+: Dữ liệu chi tiết
  rows.forEach(row => {
    const processedRow = row.map((val, colIdx) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') return val;
      // Nếu là chuỗi số thuần túy trong cột số/tiền thì parse sang number
      if (currencyColumns.includes(colIdx) || numberColumns.includes(colIdx)) {
        const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && String(val).trim() !== '') return num;
      }
      return String(val);
    });
    aoa.push(processedRow);
  });

  // Dòng Tổng cộng (nếu có yêu cầu)
  if (includeTotalRow && rows.length > 0) {
    const totalRow: any[] = new Array(headers.length).fill('');
    totalRow[0] = totalLabel;

    // Tính tổng cho các cột được chỉ định hoặc tự động phát hiện cột tiền tệ/số lượng
    const colsToSum = totalColumns.length > 0 ? totalColumns : [...currencyColumns, ...numberColumns];
    colsToSum.forEach(colIdx => {
      if (colIdx < headers.length) {
        let sum = 0;
        rows.forEach(r => {
          const val = r[colIdx];
          const num = typeof val === 'number' ? val : Number(String(val || '').replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num)) sum += num;
        });
        totalRow[colIdx] = sum;
      }
    });

    aoa.push(totalRow);
  }

  // 3. Tạo Sheet từ AOA
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 4. Tính toán độ rộng cột tự động (Auto Width) hợp lý, không bị cắt chữ
  const colWidthsCalculated: { wch: number }[] = headers.map((header, colIdx) => {
    if (columnWidths && columnWidths[colIdx]) {
      return { wch: columnWidths[colIdx] };
    }

    let maxLen = Math.max(10, String(header).length);
    rows.forEach(r => {
      const cellVal = r[colIdx];
      if (cellVal !== null && cellVal !== undefined) {
        const str = String(cellVal);
        // Với tiền tệ hiển thị định dạng có thể dài hơn
        const len = currencyColumns.includes(colIdx) ? str.length + 4 : str.length;
        if (len > maxLen) maxLen = len;
      }
    });

    return { wch: Math.min(60, maxLen + 4) };
  });

  ws['!cols'] = colWidthsCalculated;

  // 5. Bật AutoFilter trên hàng tiêu đề
  const lastColLetter = XLSX.utils.encode_col(headers.length - 1);
  const startRow = headerRowIndex + 1; // 1-indexed: hàng 5
  const endRow = aoa.length;
  ws['!autofilter'] = {
    ref: `A${startRow}:${lastColLetter}${endRow}`
  };

  // 6. Định dạng kiểu số & tiền tệ cho các ô số
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) continue;

      if (currencyColumns.includes(C)) {
        if (typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = '#,##0 "₫"';
        }
      } else if (numberColumns.includes(C)) {
        if (typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = '#,##0';
        }
      }
    }
  }

  // 7. Tạo Workbook và xuất file
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Sheet name tối đa 31 ký tự

  XLSX.writeFile(wb, finalFilename);
}
