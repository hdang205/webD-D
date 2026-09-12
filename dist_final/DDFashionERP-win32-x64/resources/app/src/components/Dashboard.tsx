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

  // Cash transactions (sổ quỹ – localStorage)
  const totalCashReceipts = cashTransactions
    .filter(t => t.type === 'CASH_RECEIPT' || t.type === 'BANK_DEPOSIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCashPayments = cashTransactions
    .filter(t => t.type === 'CASH_PAYMENT' || t.type === 'BANK_WITHDRAWAL')
    .reduce((sum, t) => sum + t.amount, 0);

  // Bar chart dùng dữ liệu thật từ /api/dashboard
  const barChartData = stats.monthlyRevenue.length > 0
    ? stats.monthlyRevenue
    : [{ month: 'Chưa có dữ liệu', revenue: 0, purchases: 0 }];

  return (
    <div id="dashboard-view" className="space-y-6 pb-8">
      
      {/* Top Banner & Quick Action Buttons */}
      <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#181a2e] flex items-center gap-2">
              <span>Tổng Quan Hoạt Động Kinh Doanh Thời Trang</span>
              <span className="text-xs font-semibold text-[#a93054] bg-[#ffe5ec] px-2.5 py-0.5 rounded-full border border-pink-200">
                Live từ SQLite
              </span>
            </h2>
            <p className="text-xs text-[#6c595f] mt-1">
              Số liệu thời gian thực từ database D&D Fashion — cập nhật mỗi lần tải trang.
              {!isLoading && (
                <span className="ml-2 text-emerald-600 font-medium">
                  ● Cập nhật lúc {lastRefreshed.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-refresh-dashboard"
              onClick={loadStats}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              id="btn-quick-receipt"
              onClick={() => onOpenNewCashModal('CASH_RECEIPT')}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lập Phiếu Thu</span>
            </button>

            <button
              id="btn-quick-payment"
              onClick={() => onOpenNewCashModal('CASH_PAYMENT')}
              className="flex items-center gap-1.5 bg-[#a93054] hover:bg-[#89153d] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lập Phiếu Chi</span>
            </button>

            <button
              id="btn-quick-sales-inv"
              onClick={() => onOpenNewInvoiceModal('SALES')}
              className="flex items-center gap-1.5 bg-[#fb6f92] hover:bg-[#e0557b] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              <Receipt className="w-4 h-4" />
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
          {/* KPI Cards Grid – dữ liệu thật từ /api/dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">

            {/* Card 1: Doanh thu tháng này */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Doanh Thu Tháng Này</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(stats.revenueThisMonth)}</div>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>Đã thu: {formatCurrency(stats.paidThisMonth)}</span>
                </p>
              </div>
            </div>

            {/* Card 2: Chi phí nhập hàng tháng này */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Chi Nhập Hàng Tháng Này</span>
                <div className="p-2 bg-[#ffe5ec] text-[#a93054] rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#a93054] font-mono">{formatCurrency(stats.purchasesThisMonth)}</div>
                <p className="text-[11px] text-[#a93054] flex items-center gap-1 mt-1 font-medium">
                  <TrendingDown className="w-3 h-3" />
                  <span>Chờ thanh toán: {stats.unpaidPurchasesCount}</span>
                </p>
              </div>
            </div>

            {/* Card 3: Công nợ phải thu */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Công Nợ Phải Thu</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-700 font-mono">{formatCurrency(stats.totalReceivables)}</div>
                <p className="text-[11px] text-[#6c595f] mt-1">
                  Phải trả NCC: <strong className="text-rose-600 font-mono">{formatCurrency(stats.totalPayables)}</strong>
                </p>
              </div>
            </div>

            {/* Card 4: Khách hàng */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Khách Hàng</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-700 font-mono">{stats.totalCustomers}</div>
                <p className="text-[11px] text-[#6c595f] mt-1">
                  NCC: <strong className="text-slate-800">{stats.totalSuppliers}</strong> · NV: <strong className="text-slate-800">{stats.totalEmployees}</strong>
                </p>
              </div>
            </div>

            {/* Card 5: Tổng Tồn Kho */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Tổng Tồn Kho Thực Tế</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-indigo-700 font-mono">
                  {stats.totalStockQuantity.toLocaleString('vi-VN')} <span className="text-xs font-sans text-slate-500 font-normal">sp</span>
                </div>
                <p className="text-[11px] text-[#6c595f] mt-1">
                  {stats.totalProducts} mẫu mã · Hết: <strong className="text-red-600">{stats.outOfStockCount}</strong>
                </p>
              </div>
            </div>

            {/* Card 6: Giá Trị Tồn Kho */}
            <div className="bg-white border border-pink-100 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6c595f]">Giá Trị Tồn Kho (TK156)</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-700 font-mono">
                  {formatCurrency(stats.totalInventoryValue)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Sắp hết: <strong>{stats.lowStockCount}</strong> mã hàng
                </p>
              </div>
            </div>

          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Bar Chart – doanh thu & nhập hàng 6 tháng (thật từ DB) */}
            <div className="lg:col-span-2 bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#181a2e]">Doanh Thu & Nhập Hàng 6 Tháng Gần Nhất</h3>
                <span className="text-[11px] text-[#6c595f]">Đơn vị: VNĐ</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <div className="flex items-center gap-4 text-xs text-[#6c595f]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Doanh thu bán hàng</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#fb6f92] inline-block"></span> Chi phí nhập hàng</span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-white border border-pink-100 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-[#181a2e]">Tổng Quan Hệ Thống</h3>
              <div className="space-y-3">
                {[
                  { label: 'Tổng sản phẩm', value: `${stats.totalProducts} mẫu mã`, color: 'text-indigo-700' },
                  { label: 'Khách hàng', value: `${stats.totalCustomers} khách`, color: 'text-blue-700' },
                  { label: 'Nhà cung cấp', value: `${stats.totalSuppliers} NCC`, color: 'text-slate-700' },
                  { label: 'Nhân viên', value: `${stats.totalEmployees} NV`, color: 'text-emerald-700' },
                  { label: 'Tổng hóa đơn', value: `${stats.totalInvoices} hóa đơn`, color: 'text-purple-700' },
                  { label: 'Hàng còn tồn', value: `${stats.inStockCount} mã`, color: 'text-emerald-700' },
                  { label: 'Sắp hết hàng', value: `${stats.lowStockCount} mã`, color: 'text-amber-600' },
                  { label: 'Hết hàng', value: `${stats.outOfStockCount} mã`, color: 'text-red-600' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-[#6c595f]">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
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
                      {stats.unpaidInvoicesList.filter(i => i.type === 'SALES').slice(0, 4).map(inv => (
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
                {cashTransactions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#6c595f]">
                    Chưa có giao dịch thu chi nào. <br />
                    <button onClick={() => onOpenNewCashModal('CASH_RECEIPT')} className="text-[#a93054] font-semibold hover:underline cursor-pointer mt-1">
                      Tạo phiếu thu đầu tiên →
                    </button>
                  </div>
                ) : (
                  cashTransactions.slice(0, 5).map(t => (
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
                {cashTransactions.length > 0 && (
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
