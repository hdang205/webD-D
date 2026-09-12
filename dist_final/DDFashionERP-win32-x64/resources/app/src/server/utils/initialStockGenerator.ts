/**
 * Bộ sinh số lượng tồn kho ban đầu chuẩn ngành thời trang theo danh mục (Phase 4.1)
 *
 * Định mức số lượng theo yêu cầu:
 * - Áo khoác: 5–20 sản phẩm/mã
 * - Đầm/Váy: 5–18 sản phẩm/mã
 * - Quần jeans: 8–25 sản phẩm/mã
 * - Túi xách: 5–15 sản phẩm/mã
 * - Giày dép nữ: 5–20 sản phẩm/mã
 * - Áo thun: 10–30 sản phẩm/mã
 * - Áo sơ mi: 8–25 sản phẩm/mã
 */

export interface StockRange {
  min: number;
  max: number;
}

export const CATEGORY_STOCK_RANGES: Record<string, StockRange> = {
  'Áo khoác': { min: 5, max: 20 },
  'Đầm/Váy': { min: 5, max: 18 },
  'Váy & Đầm': { min: 5, max: 18 },
  'Quần jeans': { min: 8, max: 25 },
  'Quần Jeans': { min: 8, max: 25 },
  'Quần': { min: 8, max: 25 },
  'Túi xách': { min: 5, max: 15 },
  'Giày dép nữ': { min: 5, max: 20 },
  'Giày dép': { min: 5, max: 20 },
  'Áo thun': { min: 10, max: 30 },
  'Áo sơ mi': { min: 8, max: 25 },
  'Áo Sơ Mi': { min: 8, max: 25 },
  'Áo': { min: 10, max: 25 },
  'Vest & Blazer': { min: 5, max: 15 },
  'Phụ kiện': { min: 10, max: 30 }
};

/**
 * Băm chuỗi đơn giản để sinh số giả ngẫu nhiên có tính tất định (Deterministic)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Sinh số lượng tồn kho ban đầu cho một sản phẩm dựa trên danh mục và mã sản phẩm
 * Đảm bảo:
 * 1. Nằm chính xác trong dải [min, max] của danh mục.
 * 2. Tất định: Cùng mã sản phẩm sẽ luôn cho ra cùng một số lượng khi chạy lại.
 * 3. Đa dạng: Các sản phẩm khác nhau sẽ có số lượng phân bổ tự nhiên, không bị trùng tất cả.
 */
export function generateInitialStock(categoryName: string, productCode: string): number {
  const normCategory = (categoryName || '').trim().toLowerCase();

  let range: StockRange = { min: 10, max: 20 }; // Mặc định an toàn

  for (const [catKey, catRange] of Object.entries(CATEGORY_STOCK_RANGES)) {
    if (normCategory.includes(catKey.toLowerCase()) || catKey.toLowerCase().includes(normCategory)) {
      range = catRange;
      break;
    }
  }

  // Nếu là mã sản phẩm bắt đầu bằng tiếp đầu ngữ đặc trưng
  const upperCode = productCode.toUpperCase();
  if (upperCode.startsWith('AK')) {
    range = CATEGORY_STOCK_RANGES['Áo khoác'];
  } else if (upperCode.startsWith('DV')) {
    range = CATEGORY_STOCK_RANGES['Đầm/Váy'];
  } else if (upperCode.startsWith('QJ')) {
    range = CATEGORY_STOCK_RANGES['Quần jeans'];
  } else if (upperCode.startsWith('TX')) {
    range = CATEGORY_STOCK_RANGES['Túi xách'];
  } else if (upperCode.startsWith('GD')) {
    range = CATEGORY_STOCK_RANGES['Giày dép nữ'];
  } else if (upperCode.startsWith('AT')) {
    range = CATEGORY_STOCK_RANGES['Áo thun'];
  } else if (upperCode.startsWith('SM') || upperCode.startsWith('SP')) {
    range = CATEGORY_STOCK_RANGES['Áo sơ mi'];
  }

  const hash = hashString(productCode);
  const spread = range.max - range.min + 1;
  return range.min + (hash % spread);
}
