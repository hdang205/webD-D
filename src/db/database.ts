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
  return dbInstance;
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
