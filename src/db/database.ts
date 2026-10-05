import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
const DB_PATH = path.resolve(DATA_DIR, 'fashion_erp.db');
const SCHEMA_PATH = path.resolve(PROJECT_ROOT, 'src/db/schema.sql');

let dbInstance: DatabaseType | null = null;

/**
 * Lấy hoặc khởi tạo kết nối database SQLite (Singleton)
 */
export function getDatabase(dbPath: string = DB_PATH): DatabaseType {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  // Đảm bảo thư mục lưu trữ data tồn tại
  const targetDir = path.dirname(dbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Khởi tạo better-sqlite3 database
  const db = new Database(dbPath);

  // Bật foreign key, recursive triggers và WAL mode tối ưu
  db.pragma('foreign_keys = ON');
  db.pragma('recursive_triggers = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  dbInstance = db;
  ensureExtensionTables(db);
  return dbInstance;
}

function ensureExtensionTables(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_audits (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        auditor_name TEXT NOT NULL,
        auditor_id TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'DRAFT', 'CANCELLED')),
        total_items INTEGER NOT NULL DEFAULT 0,
        total_diff INTEGER NOT NULL DEFAULT 0,
        matched_count INTEGER NOT NULL DEFAULT 0,
        shortage_count INTEGER NOT NULL DEFAULT 0,
        surplus_count INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_stock_audits_date ON stock_audits(date);
    CREATE INDEX IF NOT EXISTS idx_stock_audits_code ON stock_audits(code);

    CREATE TABLE IF NOT EXISTS stock_audit_items (
        id TEXT PRIMARY KEY,
        audit_id TEXT NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        item_code TEXT NOT NULL,
        item_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        system_stock INTEGER NOT NULL,
        actual_stock INTEGER NOT NULL,
        difference INTEGER NOT NULL,
        status TEXT NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        difference_value REAL NOT NULL DEFAULT 0,
        note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_stock_audit_items_audit ON stock_audit_items(audit_id);
    CREATE INDEX IF NOT EXISTS idx_stock_audit_items_prod ON stock_audit_items(product_id);

    CREATE TABLE IF NOT EXISTS defective_goods (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        product_id TEXT NOT NULL REFERENCES products(id),
        item_code TEXT NOT NULL,
        item_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        reason TEXT NOT NULL,
        action_type TEXT NOT NULL CHECK (action_type IN ('REORDER', 'RETURN_SUPPLIER', 'DISPOSE')),
        action_title TEXT NOT NULL,
        note TEXT,
        handler_name TEXT NOT NULL,
        handler_id TEXT,
        date TEXT NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        total_loss REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        inventory_log_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_defective_goods_date ON defective_goods(date);
    CREATE INDEX IF NOT EXISTS idx_defective_goods_prod ON defective_goods(product_id);

    CREATE TABLE IF NOT EXISTS supplier_products (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_product_code TEXT,
        last_purchase_price REAL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(supplier_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products(product_id);
  `);

  try {
    db.exec(`ALTER TABLE cash_transactions ADD COLUMN category TEXT DEFAULT 'GENERAL';`);
  } catch {
    // Cột đã tồn tại
  }

  seedSupplierProductsIfEmpty(db);
}

function seedSupplierProductsIfEmpty(db: DatabaseType): void {
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM supplier_products').get() as { cnt: number };
    if (row && row.cnt > 0) return;

    // 1. Link past purchase history
    db.exec(`
      INSERT OR IGNORE INTO supplier_products (id, supplier_id, product_id, last_purchase_price, created_at)
      SELECT 
        'sp_' || hex(randomblob(6)),
        i.partner_id,
        ii.product_id,
        ii.unit_price,
        i.created_at
      FROM invoices i
      JOIN invoice_items ii ON ii.invoice_id = i.id
      JOIN partners p ON p.id = i.partner_id AND p.type IN ('SUPPLIER', 'BOTH')
      JOIN products prod ON prod.id = ii.product_id
      WHERE i.type = 'PURCHASE' AND ii.product_id IS NOT NULL;
    `);

    // 2. Link categories based on business relationships:
    // p4: 'Nhà Cung Cấp Vải Lụa & Cotton Hà Đông' -> Áo sơ mi (cat_somi), Áo thun (cat_aothun), Đầm/Váy (cat_damvay)
    const p4 = db.prepare("SELECT id FROM partners WHERE code = 'NCC002' OR name LIKE '%Hà Đông%' LIMIT 1").get() as any;
    if (p4) {
      db.exec(`
        INSERT OR IGNORE INTO supplier_products (id, supplier_id, product_id, last_purchase_price, created_at)
        SELECT 
          'sp_' || hex(randomblob(6)),
          '${p4.id}',
          p.id,
          p.cost_price,
          datetime('now')
        FROM products p
        WHERE p.category_id IN ('cat_somi', 'cat_aothun', 'cat_damvay');
      `);
    }

    // p3: 'Xưởng May Thời Trang Garment Vina' -> Quần jeans (cat_jeans), Áo khoác (cat_aokhoac), Áo sơ mi (cat_somi)
    const p3 = db.prepare("SELECT id FROM partners WHERE code = 'NCC001' OR name LIKE '%Garment Vina%' LIMIT 1").get() as any;
    if (p3) {
      db.exec(`
        INSERT OR IGNORE INTO supplier_products (id, supplier_id, product_id, last_purchase_price, created_at)
        SELECT 
          'sp_' || hex(randomblob(6)),
          '${p3.id}',
          p.id,
          p.cost_price,
          datetime('now')
        FROM products p
        WHERE p.category_id IN ('cat_jeans', 'cat_aokhoac', 'cat_somi');
      `);
    }

    // p5: 'Tổng Kho Phụ Kiện & Giày Da VNXK Sài Gòn' -> Túi xách (cat_tuixach), Giày dép nữ (cat_giaydepnu)
    const p5 = db.prepare("SELECT id FROM partners WHERE code = 'NCC003' OR name LIKE '%Phụ Kiện%' LIMIT 1").get() as any;
    if (p5) {
      db.exec(`
        INSERT OR IGNORE INTO supplier_products (id, supplier_id, product_id, last_purchase_price, created_at)
        SELECT 
          'sp_' || hex(randomblob(6)),
          '${p5.id}',
          p.id,
          p.cost_price,
          datetime('now')
        FROM products p
        WHERE p.category_id IN ('cat_tuixach', 'cat_giaydepnu');
      `);
    }

    // Any products without a supplier, link to p3 as default supplier
    if (p3) {
      db.exec(`
        INSERT OR IGNORE INTO supplier_products (id, supplier_id, product_id, last_purchase_price, created_at)
        SELECT 
          'sp_' || hex(randomblob(6)),
          '${p3.id}',
          p.id,
          p.cost_price,
          datetime('now')
        FROM products p
        WHERE p.id NOT IN (SELECT product_id FROM supplier_products);
      `);
    }
  } catch (err) {
    console.warn('Lỗi khi seed quan hệ supplier_products:', err);
  }
}

/**
 * Khởi tạo toàn bộ schema database từ schema.sql
 */
export function initializeSchema(db?: DatabaseType): void {
  const targetDb = db || getDatabase();

  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Không tìm thấy file schema SQL tại: ${SCHEMA_PATH}`);
  }

  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  targetDb.exec(schemaSql);
}

/**
 * Đóng kết nối database an toàn
 */
export function closeDatabase(): void {
  if (dbInstance && dbInstance.open) {
    dbInstance.close();
    dbInstance = null;
  }
}

export const db = getDatabase();
export default db;
