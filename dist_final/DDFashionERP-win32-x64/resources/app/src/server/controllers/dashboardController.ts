import { Request, Response } from 'express';
import db from '../../db/database.js';

/**
 * GET /api/dashboard
 * Tổng hợp thống kê tổng quan từ SQLite – không hard-code bất kỳ số liệu nào
 */
export function getDashboardStats(_req: Request, res: Response): void {
  try {
    // 1. Tổng số sản phẩm
    const productRow = db.prepare(`SELECT COUNT(*) as count FROM products`).get() as any;
    const totalProducts = Number(productRow?.count) || 0;

    // 2. Tổng số khách hàng
    const customerRow = db.prepare(`SELECT COUNT(*) as count FROM partners WHERE type = 'CUSTOMER'`).get() as any;
    const totalCustomers = Number(customerRow?.count) || 0;

    // 3. Tổng số nhà cung cấp
    const supplierRow = db.prepare(`SELECT COUNT(*) as count FROM partners WHERE type = 'SUPPLIER'`).get() as any;
    const totalSuppliers = Number(supplierRow?.count) || 0;

    // 4. Tổng số nhân viên
    const employeeRow = db.prepare(`SELECT COUNT(*) as count FROM employees`).get() as any;
    const totalEmployees = Number(employeeRow?.count) || 0;

    // 5. Tồn kho
    const inventoryRow = db.prepare(`
      SELECT 
        COALESCE(SUM(current_stock), 0) as totalQuantity,
        COALESCE(SUM(current_stock * cost_price), 0) as totalValue,
        COUNT(CASE WHEN current_stock = 0 THEN 1 END) as outOfStockCount,
        COUNT(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 END) as lowStockCount,
        COUNT(CASE WHEN current_stock > min_stock_level THEN 1 END) as inStockCount
      FROM products
    `).get() as any;

    const totalStockQuantity = Number(inventoryRow?.totalQuantity) || 0;
    const totalInventoryValue = Number(inventoryRow?.totalValue) || 0;
    const outOfStockCount = Number(inventoryRow?.outOfStockCount) || 0;
    const lowStockCount = Number(inventoryRow?.lowStockCount) || 0;
    const inStockCount = Number(inventoryRow?.inStockCount) || 0;

    // 6. Hóa đơn bán hàng chưa thanh toán
    const unpaidSalesRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(grand_total - paid_amount), 0) as totalDebt
      FROM invoices WHERE type = 'SALES' AND status != 'PAID'
    `).get() as any;
    const unpaidSalesCount = Number(unpaidSalesRow?.count) || 0;
    const totalReceivables = Number(unpaidSalesRow?.totalDebt) || 0;

    // 7. Hóa đơn mua hàng chưa thanh toán
    const unpaidPurchasesRow = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(grand_total - paid_amount), 0) as totalDebt
      FROM invoices WHERE type = 'PURCHASE' AND status != 'PAID'
    `).get() as any;
    const unpaidPurchasesCount = Number(unpaidPurchasesRow?.count) || 0;
    const totalPayables = Number(unpaidPurchasesRow?.totalDebt) || 0;

    // 8. Doanh thu tháng hiện tại
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonthSalesRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total, COALESCE(SUM(paid_amount), 0) as paid
      FROM invoices WHERE type = 'SALES' AND strftime('%Y-%m', date) = ?
    `).get(currentMonth) as any;
    const thisMonthPurchasesRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total
      FROM invoices WHERE type = 'PURCHASE' AND strftime('%Y-%m', date) = ?
    `).get(currentMonth) as any;

    const revenueThisMonth = Number(thisMonthSalesRow?.total) || 0;
    const paidThisMonth = Number(thisMonthSalesRow?.paid) || 0;
    const purchasesThisMonth = Number(thisMonthPurchasesRow?.total) || 0;

    // 9. Tổng hóa đơn
    const totalInvoicesRow = db.prepare(`SELECT COUNT(*) as count FROM invoices`).get() as any;
    const totalInvoices = Number(totalInvoicesRow?.count) || 0;

    // 10. Dữ liệu 6 tháng gần nhất (cho biểu đồ)
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    const monthlyRevenue = months.map(month => {
      const salesRow = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM invoices WHERE type = 'SALES' AND strftime('%Y-%m', date) = ?
      `).get(month) as any;
      const purchRow = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM invoices WHERE type = 'PURCHASE' AND strftime('%Y-%m', date) = ?
      `).get(month) as any;
      return {
        month: formatMonthLabel(month),
        revenue: Number(salesRow?.total) || 0,
        purchases: Number(purchRow?.total) || 0,
      };
    });

    // 11. Danh sách hóa đơn chưa thanh toán (để Dashboard hiển thị cảnh báo)
    const unpaidInvoicesList = db.prepare(`
      SELECT 
        i.id, i.code, i.type, i.status, i.date,
        i.grand_total as grandTotal,
        i.paid_amount as paidAmount,
        p.name as partnerName
      FROM invoices i
      LEFT JOIN partners p ON p.id = i.partner_id
      WHERE i.status != 'PAID'
      ORDER BY i.date DESC
      LIMIT 10
    `).all() as any[];

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalEmployees,
        totalInvoices,
        totalStockQuantity,
        totalInventoryValue,
        outOfStockCount,
        lowStockCount,
        inStockCount,
        revenueThisMonth,
        paidThisMonth,
        purchasesThisMonth,
        totalReceivables,
        totalPayables,
        unpaidSalesCount,
        unpaidPurchasesCount,
        unpaidInvoicesList: unpaidInvoicesList.map(inv => ({
          ...inv,
          grandTotal: Number(inv.grandTotal) || 0,
          paidAmount: Number(inv.paidAmount) || 0,
          debtAmount: (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0)
        })),
        monthlyRevenue,
      }
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy thống kê dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê dashboard',
      error: error.message
    });
  }
}

function formatMonthLabel(yyyyMM: string): string {
  if (!yyyyMM) return '';
  const [year, month] = yyyyMM.split('-');
  return `T${parseInt(month)}/${year}`;
}
