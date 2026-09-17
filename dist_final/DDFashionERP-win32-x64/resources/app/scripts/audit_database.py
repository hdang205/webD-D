# -*- coding: utf-8 -*-
import sqlite3
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = 'data/fashion_erp.db'
if not os.path.exists(db_path):
    print("FATAL: Database does not exist at", db_path)
    exit(1)

print(f"Database exists: {db_path} (Size: {os.path.getsize(db_path):,} bytes)")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Tables list
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print(f"\n--- 1. DANH SÁCH BẢNG ({len(tables)} bảng) ---")
required_tables = [
    'company_info', 'users', 'employees', 'categories', 'products', 
    'partners', 'invoices', 'invoice_items', 'cash_transactions', 
    'inventory_logs', 'inventory_log_items'
]
for t in required_tables:
    exists = t in tables
    count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] if exists else 0
    print(f"  [{'PASS' if exists else 'FAIL'}] Bảng {t}: tồn tại = {exists}, bản ghi = {count}")

# 2. Constraints and Integrity
print("\n--- 2. KIỂM TRA RÀNG BUỘC & TÍNH TOÀN VẸN ---")
fk_violations = cur.execute("PRAGMA foreign_key_check").fetchall()
print(f"  PRAGMA foreign_key_check: {len(fk_violations)} vi phạm (Kỳ vọng: 0)")

# 3. Negative stock check
neg_stock = cur.execute("SELECT COUNT(*) FROM products WHERE current_stock < 0").fetchone()[0]
print(f"  Sản phẩm tồn kho âm (current_stock < 0): {neg_stock} (Kỳ vọng: 0)")

# 4. Duplicate products check
dup_code = cur.execute("SELECT code, COUNT(*) FROM products GROUP BY code HAVING COUNT(*) > 1").fetchall()
print(f"  Sản phẩm trùng mã SKU (products.code): {len(dup_code)} trùng (Kỳ vọng: 0)")

dup_barcode = cur.execute("SELECT barcode, COUNT(*) FROM products WHERE barcode IS NOT NULL GROUP BY barcode HAVING COUNT(*) > 1").fetchall()
print(f"  Sản phẩm trùng mã vạch (barcode): {len(dup_barcode)} trùng (Kỳ vọng: 0)")

# 5. Orphan records check
orphan_invoice_items = cur.execute("SELECT COUNT(*) FROM invoice_items WHERE invoice_id NOT IN (SELECT id FROM invoices)").fetchone()[0]
print(f"  Invoice items mồ côi (không có invoice cha): {orphan_invoice_items} (Kỳ vọng: 0)")

orphan_invoice_items_prod = cur.execute("SELECT COUNT(*) FROM invoice_items WHERE product_id NOT IN (SELECT id FROM products)").fetchone()[0]
print(f"  Invoice items trỏ sản phẩm không tồn tại: {orphan_invoice_items_prod} (Kỳ vọng: 0)")

orphan_inventory_items = cur.execute("SELECT COUNT(*) FROM inventory_log_items WHERE inventory_log_id NOT IN (SELECT id FROM inventory_logs)").fetchone()[0]
print(f"  Inventory log items mồ côi (không có log cha): {orphan_inventory_items} (Kỳ vọng: 0)")

orphan_cash = cur.execute("SELECT COUNT(*) FROM cash_transactions WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)").fetchone()[0]
print(f"  Cash transactions trỏ hóa đơn không tồn tại: {orphan_cash} (Kỳ vọng: 0)")

# 6. Indexes check
cur.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex_%'")
indexes = cur.fetchall()
print(f"\n--- 3. DANH SÁCH INDEXES ({len(indexes)} indexes) ---")
for idx_name, tbl in indexes:
    print(f"  Index: {idx_name} trên bảng {tbl}")

# 7. Triggers check
cur.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='trigger'")
triggers = cur.fetchall()
print(f"\n--- 4. DANH SÁCH TRIGGERS ({len(triggers)} triggers) ---")
for trg_name, tbl in triggers:
    print(f"  Trigger: {trg_name} trên bảng {tbl}")

# 8. Product count and stock stats
total_prods = cur.execute("SELECT COUNT(*) FROM products").fetchone()[0]
total_stock = cur.execute("SELECT SUM(current_stock) FROM products").fetchone()[0]
total_val = cur.execute("SELECT SUM(current_stock * cost_price) FROM products").fetchone()[0]
print(f"\n--- 5. THỐNG KÊ SẢN PHẨM & TỒN KHO ---")
print(f"  Tổng số sản phẩm (SKU): {total_prods}")
print(f"  Tổng số lượng tồn kho: {total_stock:,}")
print(f"  Tổng giá trị tồn kho (giá vốn): {total_val:,.0f} đ")

conn.close()
print("\n>>> KIỂM TRA DATABASE HOÀN TẤT THÀNH CÔNG!")
