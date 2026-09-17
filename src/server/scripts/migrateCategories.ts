import db from '../../db/database.js';

/**
 * Migration Script Phase 8.2: Chuẩn hóa 7 danh mục sản phẩm và dữ liệu liên quan
 */
export function migrateCategories(): { success: boolean; stats: any } {
  console.log('--- BẮT ĐẦU MIGRATION DANH MỤC PHASE 8.2 ---');

  const migration = db.transaction(() => {
    // 1. Đảm bảo 7 danh mục chuẩn tồn tại với tên và code chính xác
    const canonicalCategories = [
      { id: 'cat_aokhoac', code: 'CAT_AOKHOAC', name: 'Áo khoác', description: 'Áo khoác, măng tô, áo phao, blazer thời trang' },
      { id: 'cat_damvay', code: 'CAT_DAMVAY', name: 'Đầm/Váy', description: 'Đầm xòe, đầm dạ hội, chân váy, váy công sở' },
      { id: 'cat_jeans', code: 'CAT_JEANS', name: 'Quần jeans', description: 'Quần jeans skinny, ống rộng, cạp cao, boyfriend jeans' },
      { id: 'cat_tuixach', code: 'CAT_TUIXACH', name: 'Túi xách', description: 'Túi xách da thật, clutch tiệc, túi đeo chéo' },
      { id: 'cat_giaydepnu', code: 'CAT_GIAYDEPNU', name: 'Giày dép nữ', description: 'Giày cao gót, sandal, giày búp bê, sneaker nữ' },
      { id: 'cat_aothun', code: 'CAT_AOTHUN', name: 'Áo thun', description: 'Áo phông thun cotton, áo polo, áo thun in họa tiết' },
      { id: 'cat_somi', code: 'CAT_SOMI', name: 'Áo sơ mi', description: 'Sơ mi lụa tơ tằm, sơ mi công sở, sơ mi thiết kế cao cấp' }
    ];

    const upsertCatStmt = db.prepare(`
      INSERT INTO categories (id, code, name, description, created_at)
      VALUES (@id, @code, @name, @description, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        code = excluded.code,
        description = excluded.description
    `);

    for (const cat of canonicalCategories) {
      upsertCatStmt.run(cat);
    }
    console.log('✅ Đã cập nhật 7 danh mục chuẩn.');

    // 2. Remap các sản phẩm dùng danh mục cũ sang 7 danh mục chuẩn
    // SP004 (Blazer) -> cat_aokhoac
    const r1 = db.prepare(`UPDATE products SET category_id = 'cat_aokhoac' WHERE category_id = 'cat_blazer' OR id = 'inv4'`).run();
    // SP003, SP008 (Váy) -> cat_damvay
    const r2 = db.prepare(`UPDATE products SET category_id = 'cat_damvay' WHERE category_id = 'cat_vay' OR id IN ('inv3', 'inv8')`).run();
    // SP005 (T-Shirt) -> cat_aothun
    const r3 = db.prepare(`UPDATE products SET category_id = 'cat_aothun' WHERE category_id = 'cat_tshirt' OR id = 'inv5'`).run();
    // SP006 (Giày Sneaker) -> cat_giaydepnu
    const r4 = db.prepare(`UPDATE products SET category_id = 'cat_giaydepnu' WHERE category_id = 'cat_giay' OR id = 'inv6'`).run();
    // SP007 (Túi xách da) -> cat_tuixach
    const r5 = db.prepare(`UPDATE products SET category_id = 'cat_tuixach' WHERE category_id = 'cat_phukien' OR id = 'inv7'`).run();

    console.log(`✅ Đã ánh xạ sản phẩm cũ: Blazer (${r1.changes}), Váy (${r2.changes}), T-shirt (${r3.changes}), Giày (${r4.changes}), Túi xách (${r5.changes})`);

    // 3. Xóa các danh mục cũ không còn sản phẩm nào trỏ tới
    const delOldCatsStmt = db.prepare(`
      DELETE FROM categories 
      WHERE id IN ('cat_blazer', 'cat_vay', 'cat_tshirt', 'cat_giay', 'cat_phukien')
    `);
    const delResult = delOldCatsStmt.run();
    console.log(`✅ Đã loại bỏ ${delResult.changes} danh mục cũ dư thừa.`);

    // 4. Tạo Unique Index cho số điện thoại bảng partners
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_phone_unique ON partners(phone);`);
    console.log('✅ Đã đảm bảo UNIQUE INDEX cho partners(phone).');

    // 5. Thống kê kiểm tra
    const categoryStats = db.prepare(`
      SELECT c.id, c.code, c.name, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();

    const orphanCount = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE c.id IS NULL
    `).get() as any).count;

    const totalProducts = (db.prepare(`SELECT COUNT(*) as count FROM products`).get() as any).count;

    return {
      categoryStats,
      orphanCount,
      totalProducts
    };
  });

  const stats = migration();
  console.log('📊 Thống kê danh mục sau migration:', stats.categoryStats);
  console.log(`📦 Tổng sản phẩm: ${stats.totalProducts}, Sản phẩm mồ côi: ${stats.orphanCount}`);

  if (stats.orphanCount > 0) {
    throw new Error(`Migration thất bại: còn ${stats.orphanCount} sản phẩm chưa có danh mục hợp lệ!`);
  }

  return { success: true, stats };
}

if (process.argv[1] && process.argv[1].includes('migrateCategories')) {
  try {
    const res = migrateCategories();
    console.log('🎉 Migration hoàn thành thành công!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi trong quá trình migration:', err);
    process.exit(1);
  }
}
