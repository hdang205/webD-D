import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  PlusCircle, 
  Receipt, 
  Users,
  Package,
  Loader2,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  CashTransaction, 
  PeriodFilter 
} from '../types/accounting';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DashboardService, DashboardStats } from '../services/inventoryService';

interface DashboardProps {
  cashTransactions: CashTransaction[];
  periodFilter: PeriodFilter;
  onOpenNewCashModal: (type: 'CASH_RECEIPT' | 'CASH_PAYMENT') => void;
  onOpenNewInvoiceModal: (type: 'SALES' | 'PURCHASE') => void;
  onNavigateTab: (tab: any) => void;
  // Legacy props kept for backward compatibility (not used anymore)
  invoices?: any[];
  inventory?: any[];
  partners?: any[];
}

const EMPTY_STATS: DashboardStats = {
  totalProducts: 0, totalCustomers: 0, totalSuppliers: 0, totalEmployees: 0,
  totalInvoices: 0, totalStockQuantity: 0, totalInventoryValue: 0,
  outOfStockCount: 0, lowStockCount: 0, inStockCount: 0,
  revenueThisMonth: 0, paidThisMonth: 0, purchasesThisMonth: 0,
  totalReceivables: 0, totalPayables: 0,
  unpaidSalesCount: 0, unpaidPurchasesCount: 0,
  unpaidInvoicesList: [], monthlyRevenue: []
};

export const Dashboard: React.FC<DashboardProps> = ({
  cashTransactions,
  onOpenNewCashModal,
  onOpenNewInvoiceModal,
  onNavigateTab
}) => {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Lỗi tải thống kê dashboard:', err);
      setError(err.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Cash transactions (sổ quỹ – an toàn trước undefined)
  const txList = Array.isArray(cashTransactions) ? cashTransactions : [];

  const totalCashReceipts = txList
    .filter(t => t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCashPayments = txList
    .filter(t => t.type === 'CASH_PAYMENT' || t.type === 'BANK_WITHDRAWAL')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Bar chart an toàn trước undefined
  const monthlyRevenueList = Array.isArray(stats?.monthlyRevenue) ? stats.monthlyRevenue : [];
  const barChartData = monthlyRevenueList.length > 0
    ? monthlyRevenueList
    : [{ month: 'Chưa có dữ liệu', revenue: 0, purchases: 0 }];
  
  const unpaidInvoices = Array.isArray(stats?.unpaidInvoicesList) ? stats.unpaidInvoicesList : [];

  return (
    <div id="dashboard-view" className="space-y-6 pb-8">
      
      {/* Top Banner & Quick Action Buttons */}
      <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
          <div className="shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-[#181a2e] whitespace-nowrap">
              Tổng Quan Hoạt Động Kinh Doanh Thời Trang
            </h2>
            <p className="text-[11px] text-[#6c595f] mt-0.5">
              {!isLoading && (
                <span className="text-emerald-600 font-medium">
                  ● Cập nhật lúc {lastRefreshed.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-start gap-2 sm:gap-2.5 shrink-0">
            <button
              id="btn-refresh-dashboard"
              onClick={loadStats}
              disabled={isLoading}
              className="h-9 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 rounded-xl transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              id="btn-quick-receipt"
              onClick={() => onOpenNewCashModal('CASH_RECEIPT')}
              className="h-9 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lập Phiếu Thu</span>
            </button>

            <button
              id="btn-quick-payment"
              onClick={() => onOpenNewCashModal('CASH_PAYMENT')}
              className="h-9 inline-flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white text-xs font-bold px-3.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lập Phiếu Chi</span>
            </button>

            <button
              id="btn-quick-sales-inv"
              onClick={() => onOpenNewInvoiceModal('SALES')}
              className="h-9 inline-flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white text-xs font-bold px-3.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Tạo Hóa Đơn Bán</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadStats} className="ml-auto text-xs font-bold underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#a93054] animate-spin" />
            <p className="text-sm text-[#6c595f] font-medium">Đang tải số liệu từ database...</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* 6 Chỉ Số Trọng Yếu Của Cửa Hàng Thời Trang D&D (Phase 8.1) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">

            {/* 1. Doanh thu */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Doanh Thu Tháng Này
                </span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-emerald-700 whitespace-nowrap">
                  <span className="text-lg xl:text-[15px] 2xl:text-xl font-bold tracking-tight tabular-nums">
                    {stats.revenueThisMonth.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 shrink-0 ml-0.5">₫</span>
                </div>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium whitespace-nowrap overflow-hidden" title={`Đã thu: ${stats.paidThisMonth.toLocaleString('vi-VN')} ₫`}>
                  <TrendingUp className="w-3 h-3 shrink-0" />
                  <span className="truncate">Đã thu: {stats.paidThisMonth.toLocaleString('vi-VN')} ₫</span>
                </p>
              </div>
            </div>

            {/* 2. Số hóa đơn */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Số Lượng Hóa Đơn
                </span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-indigo-700 whitespace-nowrap">
                  <span className="text-lg xl:text-[15px] 2xl:text-xl font-bold tracking-tight tabular-nums">
                    {stats.totalInvoices.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 shrink-0 ml-0.5">đơn</span>
                </div>
                <p className="text-[11px] text-indigo-600 mt-1 whitespace-nowrap overflow-hidden">
                  Chờ thu: <strong className="text-amber-600">{stats.unpaidSalesCount}</strong> · Chờ trả: <strong className="text-rose-600">{stats.unpaidPurchasesCount}</strong>
                </p>
              </div>
            </div>

            {/* 3. Tổng sản phẩm */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Tổng Mẫu Mã Sản Phẩm
                </span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-blue-700 whitespace-nowrap">
                  <span className="text-lg xl:text-[15px] 2xl:text-xl font-bold tracking-tight tabular-nums">
                    {stats.totalProducts.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 shrink-0 ml-0.5">mẫu</span>
                </div>
                <p className="text-[11px] text-blue-600 mt-1 whitespace-nowrap overflow-hidden">
                  Sẵn hàng: <strong className="text-emerald-700">{stats.inStockCount}</strong> mẫu
                </p>
              </div>
            </div>

            {/* 4. Tồn kho thực tế */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Tổng Tồn Kho Thực Tế
                </span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Package className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-amber-700 whitespace-nowrap">
                  <span className="text-lg xl:text-[15px] 2xl:text-xl font-bold tracking-tight tabular-nums">
                    {stats.totalStockQuantity.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-medium text-slate-500 shrink-0 ml-0.5">cái</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1 whitespace-nowrap overflow-hidden">
                  Sắp hết: <strong className="text-amber-600">{stats.lowStockCount}</strong> · Hết: <strong className={stats.outOfStockCount > 0 ? "text-rose-600 font-bold" : "text-slate-600"}>{stats.outOfStockCount}</strong>
                </p>
              </div>
            </div>

            {/* 5. Giá trị tồn kho */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Giá Trị Tồn Kho (TK156)
                </span>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-purple-700 whitespace-nowrap">
                  <span className="text-lg xl:text-[15px] 2xl:text-xl font-bold tracking-tight tabular-nums">
                    {stats.totalInventoryValue.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-purple-600 shrink-0 ml-0.5">₫</span>
                </div>
                <p className="text-[11px] text-purple-600 mt-1 whitespace-nowrap overflow-hidden">
                  Giá trị theo giá vốn xưởng
                </p>
              </div>
            </div>

            {/* 6. Công nợ */}
            <div className="bg-white border border-pink-100/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold text-[#6c595f] leading-snug line-clamp-2 min-h-[32px] flex items-center">
                  Công Nợ Phải Thu / Trả
                </span>
                <div className="p-1.5 bg-rose-50 text-[#a93054] rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline gap-0.5 text-amber-700 whitespace-nowrap">
                  <span className="text-sm font-semibold text-[#6c595f]">Thu: </span>
                  <span className="text-base xl:text-sm 2xl:text-base font-bold tracking-tight tabular-nums text-amber-700 ml-1">
                    {stats.totalReceivables.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[11px] font-bold text-amber-600">₫</span>
                </div>
                <p className="text-[11px] text-[#6c595f] mt-1 whitespace-nowrap overflow-hidden">
                  <span>Nợ NCC: </span>
                  <strong className="text-rose-600 font-mono font-bold tabular-nums">{stats.totalPayables.toLocaleString('vi-VN')} ₫</strong>
                </p>
              </div>
            </div>

          </div>

          {/* Charts Section: Biểu đồ cột Doanh thu & Nhập hàng 6 tháng */}
          <div className="bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#181a2e]">Doanh Thu Bán Hàng & Chi Phí Nhập Xưởng 6 Tháng Gần Nhất</h3>
                <p className="text-[11px] text-[#6c595f]">Dữ liệu hạch toán thực tế từ cơ sở dữ liệu SQLite</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6c595f]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Doanh thu</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#fb6f92] inline-block"></span> Chi nhập hàng</span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f2ff" />
                  <XAxis dataKey="month" stroke="#6c595f" fontSize={11} />
                  <YAxis stroke="#6c595f" fontSize={11} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#ffe5ec', borderRadius: '12px', color: '#181a2e', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Doanh thu" />
                  <Bar dataKey="purchases" fill="#fb6f92" radius={[6, 6, 0, 0]} name="Nhập hàng" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: Cảnh báo */}
            <div className="bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#181a2e] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Cảnh Báo & Theo Dõi</span>
              </h3>

              <div className="space-y-3">
                {/* Low Stock Warning */}
                {stats.lowStockCount > 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-amber-800">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Tồn kho sắp hết ({stats.lowStockCount} mã)</span>
                      </span>
                      <button 
                        onClick={() => onNavigateTab('inventory')}
                        className="text-[11px] font-bold text-[#a93054] hover:underline cursor-pointer"
                      >
                        Xem kho →
                      </button>
                    </div>
                    {stats.outOfStockCount > 0 && (
                      <p className="text-amber-700">Đã hết hàng: <strong>{stats.outOfStockCount} mã</strong>. Cần nhập thêm ngay.</p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    ✅ Kho hàng D&D đang đảm bảo mức tồn an toàn.
                  </div>
                )}

                {/* Unpaid Invoices Warning */}
                {stats.unpaidSalesCount > 0 ? (
                  <div className="p-3.5 bg-[#f4f2ff] border border-pink-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-[#181a2e]">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-[#a93054]" />
                        <span>Hóa đơn chờ thanh toán ({stats.unpaidSalesCount})</span>
                      </span>
                      <button 
                        onClick={() => onNavigateTab('sales')}
                        className="text-[11px] font-bold text-[#a93054] hover:underline cursor-pointer"
                      >
                        Xem hóa đơn →
                      </button>
                    </div>
                    <div className="space-y-1.5 text-[#4e4447]">
                      {unpaidInvoices.filter(i => i.type === 'SALES').slice(0, 4).map(inv => (
                        <div 
                          key={inv.id}
                          className="flex justify-between items-center p-2 rounded-lg bg-white hover:bg-pink-50/60 border border-pink-100 transition cursor-pointer text-[11px]"
                        >
                          <span className="font-medium text-slate-800">
                            <strong className="text-[#a93054] font-mono mr-1.5">{inv.code}</strong> 
                            {inv.partnerName}
                          </span>
                          <span className="font-semibold text-[#a93054] font-mono">{formatCurrency(inv.debtAmount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 rounded-xl text-xs text-[#6c595f]">
                    ✅ Không có hóa đơn bán chưa thu.
                  </div>
                )}

                {/* Unpaid Purchases */}
                {stats.unpaidPurchasesCount > 0 && (
                  <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-xs">
                    <div className="flex items-center justify-between font-semibold text-orange-800">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span>Còn nợ nhà cung cấp ({stats.unpaidPurchasesCount} đơn)</span>
                      </span>
                      <button onClick={() => onNavigateTab('purchases')} className="text-[11px] font-bold text-orange-700 hover:underline cursor-pointer">
                        Xem →
                      </button>
                    </div>
                    <p className="text-orange-700 mt-1">
                      Tổng nợ NCC: <strong className="font-mono">{formatCurrency(stats.totalPayables)}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Recent Cash Transactions (localStorage) */}
            <div className="bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#181a2e]">Giao Dịch Thu Chi Quỹ Gần Nhất</h3>
                <button 
                  onClick={() => onNavigateTab('cashbook')}
                  className="text-xs text-[#a93054] hover:underline cursor-pointer font-semibold"
                >
                  Xem sổ quỹ →
                </button>
              </div>

              <div className="space-y-2.5">
                {txList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#6c595f]">
                    Chưa có giao dịch thu chi nào. <br />
                    <button onClick={() => onOpenNewCashModal('CASH_RECEIPT')} className="text-[#a93054] font-semibold hover:underline cursor-pointer mt-1">
                      Tạo phiếu thu đầu tiên →
                    </button>
                  </div>
                ) : (
                  txList.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-[#fbf8ff] hover:bg-[#f4f2ff] border border-pink-50 transition">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#ffe5ec] text-[#a93054]'}`}>
                          {t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#181a2e]">{t.code}</span>
                            <span className="text-[10px] text-[#6c595f]">{formatDate(t.date)}</span>
                          </div>
                          <p className="text-xs text-[#4e4447] line-clamp-1 mt-0.5">{t.reason}</p>
                        </div>
                      </div>
                      <div className={`text-xs font-bold font-mono ${t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT' ? 'text-emerald-700' : 'text-[#a93054]'}`}>
                        {t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                    </div>
                  ))
                )}
                {txList.length > 0 && (
                  <div className="pt-1 text-[11px] text-[#6c595f] text-right">
                    Tổng thu: <strong className="text-emerald-700 font-mono">{formatCurrency(totalCashReceipts)}</strong>
                    {' · '}
                    Tổng chi: <strong className="text-[#a93054] font-mono">{formatCurrency(totalCashPayments)}</strong>
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
