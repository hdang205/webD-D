import { Account } from '../types/accounting';

export const DEFAULT_CHART_OF_ACCOUNTS: Account[] = [
  // TÀI SẢN NGẮN HẠN
  { code: '111', name: 'Tiền mặt', type: 'ASSET', level: 1, isDetail: false, openingDebit: 0, openingCredit: 0 },
  { code: '1111', name: 'Tiền Việt Nam (Tiền mặt)', parentCode: '111', type: 'ASSET', level: 2, isDetail: true, openingDebit: 50000000, openingCredit: 0 },
  { code: '1112', name: 'Ngoại tệ (Tiền mặt)', parentCode: '111', type: 'ASSET', level: 2, isDetail: true, openingDebit: 0, openingCredit: 0 },
  
  { code: '112', name: 'Tiền gửi Ngân hàng', type: 'ASSET', level: 1, isDetail: false, openingDebit: 0, openingCredit: 0 },
  { code: '1121', name: 'Tiền gửi Ngân hàng (VND)', parentCode: '112', type: 'ASSET', level: 2, isDetail: true, openingDebit: 180000000, openingCredit: 0 },
  
  { code: '131', name: 'Phải thu của khách hàng', type: 'ASSET', level: 1, isDetail: true, openingDebit: 45000000, openingCredit: 0 },
  { code: '133', name: 'Thuế GTGT được khấu trừ', type: 'ASSET', level: 1, isDetail: false, openingDebit: 0, openingCredit: 0 },
  { code: '1331', name: 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', parentCode: '133', type: 'ASSET', level: 2, isDetail: true, openingDebit: 12000000, openingCredit: 0 },
  
  { code: '141', name: 'Tạm ứng', type: 'ASSET', level: 1, isDetail: true, openingDebit: 5000000, openingCredit: 0 },
  
  { code: '152', name: 'Nguyên liệu, vật liệu', type: 'ASSET', level: 1, isDetail: true, openingDebit: 35000000, openingCredit: 0 },
  { code: '153', name: 'Công cụ, dụng cụ', type: 'ASSET', level: 1, isDetail: true, openingDebit: 10000000, openingCredit: 0 },
  { code: '156', name: 'Hàng hóa', type: 'ASSET', level: 1, isDetail: true, openingDebit: 120000000, openingCredit: 0 },
  
  // TÀI SẢN DÀI HẠN
  { code: '211', name: 'Tài sản cố định hữu hình', type: 'ASSET', level: 1, isDetail: true, openingDebit: 250000000, openingCredit: 0 },
  { code: '214', name: 'Hao mòn tài sản cố định', type: 'ASSET', level: 1, isDetail: true, openingDebit: 0, openingCredit: 50000000 },
  
  // NỢ PHẢI TRẢ
  { code: '331', name: 'Phải trả cho người bán', type: 'LIABILITY', level: 1, isDetail: true, openingDebit: 0, openingCredit: 30000000 },
  { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', type: 'LIABILITY', level: 1, isDetail: false, openingDebit: 0, openingCredit: 0 },
  { code: '3331', name: 'Thuế GTGT phải nộp', parentCode: '333', type: 'LIABILITY', level: 2, isDetail: true, openingDebit: 0, openingCredit: 8500000 },
  { code: '3334', name: 'Thuế thu nhập doanh nghiệp', parentCode: '333', type: 'LIABILITY', level: 2, isDetail: true, openingDebit: 0, openingCredit: 4000000 },
  { code: '334', name: 'Phải trả người lao động', type: 'LIABILITY', level: 1, isDetail: true, openingDebit: 0, openingCredit: 25000000 },
  
  // VỐN CHỦ SỞ HỮU
  { code: '411', name: 'Vốn đầu tư của chủ sở hữu', type: 'EQUITY', level: 1, isDetail: true, openingDebit: 0, openingCredit: 500000000 },
  { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', type: 'EQUITY', level: 1, isDetail: true, openingDebit: 0, openingCredit: 69500000 },
  
  // DOANH THU & THU NHẬP
  { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', type: 'REVENUE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
  { code: '515', name: 'Doanh thu hoạt động tài chính', type: 'REVENUE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },

  // CHI PHÍ
  { code: '632', name: 'Giá vốn hàng bán', type: 'EXPENSE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
  { code: '641', name: 'Chi phí bán hàng (TT200) / 6421 (TT133)', type: 'EXPENSE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
  { code: '811', name: 'Chi phí khác', type: 'EXPENSE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
  
  // XÁC ĐỊNH KẾT QUẢ KINH DOANH
  { code: '911', name: 'Xác định kết quả kinh doanh', type: 'OFF_BALANCE', level: 1, isDetail: true, openingDebit: 0, openingCredit: 0 },
];
