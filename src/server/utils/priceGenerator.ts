/**
 * Thuật toán tự động sinh giá sản phẩm thời trang hợp lý theo danh mục
 * Tuân thủ quy định:
 * - Áo thun: 120,000 - 350,000
 * - Áo sơ mi: 180,000 - 450,000
 * - Quần jeans: 300,000 - 800,000
 * - Áo khoác: 350,000 - 950,000
 * - Đầm/Váy: 250,000 - 850,000
 * - Túi xách: 200,000 - 900,000
 * - Giày dép nữ: 180,000 - 950,000
 * - purchase_price: 55% - 75% sale_price
 * - Giá số tròn đẹp kết thúc bằng 000, 5000, 9000 (Ví dụ: 199000, 249000, 329000, 399000, 459000, 599000, 799000, 899000)
 * - Không vượt quá 999,000
 */

export interface PriceRange {
  min: number;
  max: number;
}

export const CATEGORY_PRICE_RANGES: Record<string, PriceRange> = {
  'Áo thun': { min: 120000, max: 350000 },
  'Áo T-Shirt': { min: 120000, max: 350000 },
  'Áo sơ mi': { min: 180000, max: 450000 },
  'Áo Sơ Mi': { min: 180000, max: 450000 },
  'Quần jeans': { min: 300000, max: 800000 },
  'Quần Jeans': { min: 300000, max: 800000 },
  'Áo khoác': { min: 350000, max: 950000 },
  'Áo Khoác & Blazer': { min: 350000, max: 950000 },
  'Đầm/Váy': { min: 250000, max: 850000 },
  'Váy & Đầm': { min: 250000, max: 850000 },
  'Túi xách': { min: 200000, max: 900000 },
  'Phụ Kiện & Túi Xách': { min: 200000, max: 900000 },
  'Giày dép nữ': { min: 180000, max: 950000 },
  'Giày Dép': { min: 180000, max: 950000 },
};

/**
 * Sinh giá bán và giá vốn hợp lý, tất định (deterministic) dựa trên mã sản phẩm và danh mục
 */
export function generateFashionPrice(productCode: string, categoryName: string): { salePrice: number; purchasePrice: number } {
  const range = CATEGORY_PRICE_RANGES[categoryName.trim()] || { min: 200000, max: 600000 };
  
  // Trích xuất số trong mã sản phẩm (ví dụ AK001 -> 1, SP15 -> 15)
  const numMatch = productCode.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 1;
  
  // Tỷ lệ phân bố đều từ 0 đến 1 trên 20 mẫu của nhóm
  const ratio = ((num - 1) % 20) / 19;
  const rawSale = range.min + ratio * (range.max - range.min);

  // Làm tròn thành mức giá kết thúc bằng 9,000 (chuẩn định giá bán lẻ thời trang)
  let salePrice = Math.round(rawSale / 10000) * 10000 - 1000;
  
  // Đảm bảo không vượt quá range và không vượt quá 999,000
  if (salePrice < range.min) {
    salePrice = Math.ceil(range.min / 10000) * 10000 - 1000;
  }
  const effectiveMax = Math.min(range.max, 999000);
  if (salePrice > effectiveMax) {
    salePrice = Math.floor(effectiveMax / 10000) * 10000 - 1000;
  }
  if (salePrice > 999000) {
    salePrice = 989000;
  }

  // Tỷ lệ giá vốn từ 55% đến 75% giá bán
  // Biến thiên nhẹ nhàng theo mẫu: 60%, 62.5%, 65%, 67.5%, 70%
  const costRatio = 0.60 + ((num % 5) * 0.025);
  // Làm tròn giá vốn theo bội số của 5,000 (kết thúc bằng 000 hoặc 5000)
  let purchasePrice = Math.round((salePrice * costRatio) / 5000) * 5000;

  // Đảm bảo luôn nằm trong dải 55% - 75%
  const minCost = Math.round((salePrice * 0.55) / 1000) * 1000;
  const maxCost = Math.round((salePrice * 0.75) / 1000) * 1000;
  if (purchasePrice < minCost) purchasePrice = minCost;
  if (purchasePrice > maxCost) purchasePrice = maxCost;

  return {
    salePrice,
    purchasePrice
  };
}
