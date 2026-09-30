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
  `);

  try {
    db.exec(`ALTER TABLE cash_transactions ADD COLUMN category TEXT DEFAULT 'GENERAL';`);
  } catch {
    // Cột đã tồn tại
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
