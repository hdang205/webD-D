import { applyInitialStock } from '../services/initialStockService.js';

console.log('\n================================================================');
console.log('📦 BẮT ĐẦU BỔ SUNG TỒN KHO BAN ĐẦU CHO SẢN PHẨM (PHASE 4.1)');
console.log('================================================================\n');

try {
  const result = applyInitialStock('usr_emp_1');
  console.log(`✅ Kết quả: ${result.message}`);
  console.log(`📊 Số sản phẩm vừa cập nhật: ${result.totalUpdated}`);
  console.log(`📦 Tổng tồn kho toàn bộ hệ thống: ${result.totalStockQuantity.toLocaleString('vi-VN')} sản phẩm`);
  console.log(`💰 Tổng giá trị tồn kho (TK 156): ${result.totalInventoryValue.toLocaleString('vi-VN')} ₫`);
  if (result.inventoryLogCode) {
    console.log(`📄 Mã phiếu nhập kho ban đầu: ${result.inventoryLogCode}`);
  }
  console.log('\n================================================================\n');
} catch (error) {
  console.error('❌ Lỗi khi khởi tạo tồn kho ban đầu:', error);
  process.exit(1);
}
