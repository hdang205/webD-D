import express from 'express';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { SERVER_CONFIG } from './config.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string) {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name}: ${details}`);
}

async function runCrudTests() {
  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN BACKEND CRUD & VALIDATION (PHASE 3)');
  console.log('================================================================\n');

  // Khởi tạo test server Express
  const app = express();
  app.use(express.json());

  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/employees', employeeRoutes);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Tạo Token thật có chữ ký hợp lệ từ cấu hình
  const directorToken = jwt.sign(
    { id: 'usr_emp_1', username: 'director_dung', role: 'DIRECTOR' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const salesToken = jwt.sign(
    { id: 'usr_emp_8', username: 'sales_lan', role: 'SALES_STAFF' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    // --- 1. KIỂM TRA BẢO MẬT & PHÂN QUYỀN (AUTH & RBAC) ---
    console.log('--- 1. BẢO MẬT & PHÂN QUYỀN ---');

    // Chặn request không có token
    const resNoAuth = await fetch(`${baseUrl}/categories`);
    const passNoAuth = resNoAuth.status === 401;
    record('AUTH', 'Chặn truy cập khi thiếu JWT token (HTTP 401)', passNoAuth, `Status: ${resNoAuth.status}`);

    // Chặn nhân viên bán hàng tạo sản phẩm (403)
    const resSalesProduct = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`
      },
      body: JSON.stringify({ name: 'Sản phẩm thử nghiệm', code: 'TEST_SP' })
    });
    const passSalesProduct = resSalesProduct.status === 403;
    record('RBAC', 'Chặn nhân viên bán hàng tạo sản phẩm mới (HTTP 403)', passSalesProduct, `Status: ${resSalesProduct.status}`);

    // Chặn nhân viên bán hàng tạo nhân sự mới (403)
    const resSalesEmp = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`
      },
      body: JSON.stringify({ name: 'Nhân viên mới' })
    });
    const passSalesEmp = resSalesEmp.status === 403;
    record('RBAC', 'Chặn nhân viên bán hàng tạo hồ sơ nhân sự (HTTP 403)', passSalesEmp, `Status: ${resSalesEmp.status}`);

    // --- 2. KIỂM TRA CRUD DANH MỤC (CATEGORIES) ---
    console.log('\n--- 2. DANH MỤC SẢN PHẨM (CATEGORIES) ---');

    // GET categories
    const resCatList = await fetch(`${baseUrl}/categories`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataCatList = await resCatList.json();
    const passCatList = resCatList.status === 200 && Array.isArray(dataCatList.data) && dataCatList.data.length >= 7;
    record('CATEGORIES', 'GET /api/categories lấy danh sách thành công', passCatList, `Số lượng: ${dataCatList.data?.length}`);

    // POST create category
    const catCode = `CAT_TEST_${Date.now().toString().slice(-4)}`;
    const resCatCreate = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: catCode,
        name: `Đầm Dạ Hội Cao Cấp ${Date.now().toString().slice(-4)}`,
        description: 'Chất liệu satin và tơ tằm thượng hạng'
      })
    });
    const dataCatCreate = await resCatCreate.json();
    const createdCatId = dataCatCreate.data?.id;
    const passCatCreate = resCatCreate.status === 201 && !!createdCatId;
    record('CATEGORIES', 'POST /api/categories thêm danh mục thành công', passCatCreate, `ID: ${createdCatId}`);

    // Validation: Trùng mã danh mục
    const resCatDup = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: catCode,
        name: 'Tên khác nhưng trùng mã'
      })
    });
    const passCatDup = resCatDup.status === 409;
    record('CATEGORIES', 'Chặn trùng mã danh mục (HTTP 409)', passCatDup, `Status: ${resCatDup.status}`);

    // PUT update category
    const resCatUpdate = await fetch(`${baseUrl}/categories/${createdCatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: `Đầm Dạ Hội Cập Nhật ${Date.now().toString().slice(-4)}`,
        description: 'Mô tả cập nhật'
      })
    });
    const dataCatUpdate = await resCatUpdate.json();
    const passCatUpdate = resCatUpdate.status === 200 && dataCatUpdate.data?.name.includes('Cập Nhật');
    record('CATEGORIES', 'PUT /api/categories/:id cập nhật danh mục thành công', passCatUpdate, `Tên mới: ${dataCatUpdate.data?.name}`);

    // Chặn xóa danh mục đang có sản phẩm (ví dụ cat_somi)
    const resCatDelBlock = await fetch(`${baseUrl}/categories/cat_somi`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passCatDelBlock = resCatDelBlock.status === 409;
    record('CATEGORIES', 'Chặn xóa danh mục đang chứa sản phẩm liên kết (HTTP 409)', passCatDelBlock, `Status: ${resCatDelBlock.status}`);

    // DELETE category vừa tạo (chưa có sản phẩm)
    const resCatDelete = await fetch(`${baseUrl}/categories/${createdCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passCatDelete = resCatDelete.status === 200;
    record('CATEGORIES', 'DELETE /api/categories/:id xóa danh mục rỗng thành công', passCatDelete, `Status: ${resCatDelete.status}`);

    // --- 3. KIỂM TRA CRUD SẢN PHẨM (PRODUCTS) ---
    console.log('\n--- 3. SẢN PHẨM & TỒN KHO (PRODUCTS) ---');

    // GET products
    const resProdList = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataProdList = await resProdList.json();
    const passProdList = resProdList.status === 200 && Array.isArray(dataProdList.data) && dataProdList.data.length >= 8;
    record('PRODUCTS', 'GET /api/products lấy danh sách sản phẩm thành công', passProdList, `Số lượng: ${dataProdList.data?.length}`);

    // Tìm kiếm sản phẩm bằng query search
    const resProdSearch = await fetch(`${baseUrl}/products?search=Jeans`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataProdSearch = await resProdSearch.json();
    const passProdSearch = resProdSearch.status === 200 && dataProdSearch.data?.length > 0;
    record('PRODUCTS', 'GET /api/products?search=Jeans tìm kiếm theo từ khóa', passProdSearch, `Khớp: ${dataProdSearch.data?.length} sản phẩm`);

    // Validation: Chặn giá âm & danh mục không tồn tại
    const resProdBad = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: 'Áo Lỗi Giá Âm',
        code: 'SP_ERR',
        sellingPrice: -50000,
        categoryId: 'cat_khong_ton_tai'
      })
    });
    const passProdBad = resProdBad.status === 400;
    record('PRODUCTS', 'Validate chặn giá bán âm & danh mục không tồn tại (HTTP 400)', passProdBad, `Status: ${resProdBad.status}`);

    // POST create product
    const prodCode = `SP_TEST_${Date.now().toString().slice(-4)}`;
    const resProdCreate = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: prodCode,
        name: 'Đầm Maxi Họa Tiết Biển Mùa Hè',
        unit: 'Chiếc',
        categoryId: 'cat_damvay',
        size: 'L',
        color: 'Xanh Ngọc',
        costPrice: 250000,
        sellingPrice: 590000,
        openingQuantity: 15,
        minStockLevel: 3,
        description: 'Váy maxi dạo phố sang trọng'
      })
    });
    const dataProdCreate = await resProdCreate.json();
    const createdProdId = dataProdCreate.data?.id;
    const passProdCreate = resProdCreate.status === 201 && !!createdProdId && dataProdCreate.data?.currentStock === 15;
    record('PRODUCTS', 'POST /api/products tạo sản phẩm mới thành công', passProdCreate, `ID: ${createdProdId}, Tồn kho: ${dataProdCreate.data?.currentStock}`);

    // Validation: Chặn trùng mã SKU
    const resProdDup = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: prodCode,
        name: 'Đầm trùng mã',
        categoryId: 'cat_damvay'
      })
    });
    const passProdDup = resProdDup.status === 409;
    record('PRODUCTS', 'Chặn trùng mã SKU sản phẩm (HTTP 409)', passProdDup, `Status: ${resProdDup.status}`);

    // PUT update product
    const resProdUpdate = await fetch(`${baseUrl}/products/${createdProdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        sellingPrice: 650000,
        description: 'Giá bán mới sau khuyến mãi'
      })
    });
    const dataProdUpdate = await resProdUpdate.json();
    const passProdUpdate = resProdUpdate.status === 200 && dataProdUpdate.data?.sellingPrice === 650000;
    record('PRODUCTS', 'PUT /api/products/:id cập nhật giá bán thành công', passProdUpdate, `Giá mới: ${dataProdUpdate.data?.sellingPrice}`);

    // DELETE product
    const resProdDelete = await fetch(`${baseUrl}/products/${createdProdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passProdDelete = resProdDelete.status === 200;
    record('PRODUCTS', 'DELETE /api/products/:id xóa sản phẩm thành công', passProdDelete, `Status: ${resProdDelete.status}`);

    // --- 4. KIỂM TRA CRUD KHÁCH HÀNG (CUSTOMERS) ---
    console.log('\n--- 4. KHÁCH HÀNG (CUSTOMERS) ---');

    const resCustList = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataCustList = await resCustList.json();
    const passCustList = resCustList.status === 200 && Array.isArray(dataCustList.data);
    record('CUSTOMERS', 'GET /api/customers lấy danh sách khách hàng', passCustList, `Số lượng: ${dataCustList.data?.length}`);

    // Validation: Số điện thoại không hợp lệ
    const resCustBad = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: 'Khách hàng thử nghiệm',
        phone: '123' // Quá ngắn
      })
    });
    const passCustBad = resCustBad.status === 400;
    record('CUSTOMERS', 'Validate chặn số điện thoại không hợp lệ (HTTP 400)', passCustBad, `Status: ${resCustBad.status}`);

    // POST create customer
    const custCode = `KH_TEST_${Date.now().toString().slice(-4)}`;
    const resCustCreate = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: custCode,
        name: 'Chị Hoàng Thảo My',
        phone: `0987${Date.now().toString().slice(-6)}`,
        email: 'thaomy@gmail.com',
        address: 'Vinhome Riverside Long Biên, Hà Nội',
        tier: 'GOLD'
      })
    });
    const dataCustCreate = await resCustCreate.json();
    const createdCustId = dataCustCreate.data?.id;
    const passCustCreate = resCustCreate.status === 201 && !!createdCustId && dataCustCreate.data?.tier === 'GOLD';
    record('CUSTOMERS', 'POST /api/customers tạo khách hàng VIP Gold thành công', passCustCreate, `ID: ${createdCustId}`);

    // PUT update customer
    const resCustUpdate = await fetch(`${baseUrl}/customers/${createdCustId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        address: 'Penthouse Keangnam Landmark 72, Hà Nội',
        tier: 'DIAMOND'
      })
    });
    const dataCustUpdate = await resCustUpdate.json();
    const passCustUpdate = resCustUpdate.status === 200 && dataCustUpdate.data?.tier === 'DIAMOND';
    record('CUSTOMERS', 'PUT /api/customers/:id nâng hạng khách hàng lên DIAMOND', passCustUpdate, `Tier mới: ${dataCustUpdate.data?.tier}`);

    // DELETE customer
    const resCustDelete = await fetch(`${baseUrl}/customers/${createdCustId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passCustDelete = resCustDelete.status === 200;
    record('CUSTOMERS', 'DELETE /api/customers/:id xóa khách hàng thành công', passCustDelete, `Status: ${resCustDelete.status}`);

    // --- 5. KIỂM TRA CRUD NHÀ CUNG CẤP (SUPPLIERS) ---
    console.log('\n--- 5. NHÀ CUNG CẤP (SUPPLIERS) ---');

    const resSupList = await fetch(`${baseUrl}/suppliers`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataSupList = await resSupList.json();
    const passSupList = resSupList.status === 200 && Array.isArray(dataSupList.data);
    record('SUPPLIERS', 'GET /api/suppliers lấy danh sách nhà cung cấp', passSupList, `Số lượng: ${dataSupList.data?.length}`);

    // POST create supplier
    const supCode = `NCC_TEST_${Date.now().toString().slice(-4)}`;
    const resSupCreate = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        code: supCode,
        name: 'Xưởng Dệt Lụa Vạn Phúc Hà Đông',
        phone: '0988 777 666',
        taxCode: '0109988776',
        address: 'Làng Lụa Vạn Phúc, Hà Đông, Hà Nội',
        creditLimit: 150000000
      })
    });
    const dataSupCreate = await resSupCreate.json();
    const createdSupId = dataSupCreate.data?.id;
    const passSupCreate = resSupCreate.status === 201 && !!createdSupId;
    record('SUPPLIERS', 'POST /api/suppliers tạo mới nhà cung cấp thành công', passSupCreate, `ID: ${createdSupId}`);

    // DELETE supplier
    const resSupDelete = await fetch(`${baseUrl}/suppliers/${createdSupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passSupDelete = resSupDelete.status === 200;
    record('SUPPLIERS', 'DELETE /api/suppliers/:id xóa nhà cung cấp thành công', passSupDelete, `Status: ${resSupDelete.status}`);

    // --- 6. KIỂM TRA CRUD NHÂN SỰ & USERS (EMPLOYEES) ---
    console.log('\n--- 6. NHÂN SỰ & TÀI KHOẢN (EMPLOYEES / USERS) ---');

    const resEmpList = await fetch(`${baseUrl}/employees`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const dataEmpList = await resEmpList.json();
    const passEmpList = resEmpList.status === 200 && Array.isArray(dataEmpList.data) && dataEmpList.data.length >= 6;
    record('EMPLOYEES', 'GET /api/employees lấy danh sách nhân sự thành công', passEmpList, `Số lượng: ${dataEmpList.data?.length}`);

    // Bảo mật: Tuyệt đối không có password_hash trong response
    const hasHash = dataEmpList.data?.some((e: any) => 'password_hash' in e || 'passwordHash' in e);
    record('EMPLOYEES', 'Bảo mật: Không bao giờ trả về trường password_hash', !hasHash, `An toàn: ${!hasHash}`);

    // Validation: Tên đăng nhập rỗng
    const resEmpBad = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: 'Trần Văn Thiếu User',
        phone: '0977 111 222',
        email: 'tranvan@gmail.com',
        department: 'SALES_POS',
        role: 'SALES_STAFF'
      })
    });
    const passEmpBad = resEmpBad.status === 400;
    record('EMPLOYEES', 'Validate chặn thiếu username (HTTP 400)', passEmpBad, `Status: ${resEmpBad.status}`);

    // POST create employee & linked user
    const empUsername = `test_emp_${Date.now().toString().slice(-4)}`;
    const resEmpCreate = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: 'Vũ Minh Nhật',
        username: empUsername,
        gender: 'MALE',
        phone: '0977 654 321',
        email: 'minhnhat@dndfashion.vn',
        department: 'MARKETING_DESIGN',
        position: 'Chuyên Viên Thiết Kế BST',
        role: 'STAFF',
        branch: 'Showroom 120 Phố Huế, Hà Nội',
        baseSalary: 16000000,
        allowance: 1200000
      })
    });
    const dataEmpCreate = await resEmpCreate.json();
    const createdEmpId = dataEmpCreate.data?.id;
    const passEmpCreate = resEmpCreate.status === 201 && !!createdEmpId && dataEmpCreate.data?.username === empUsername;
    record('EMPLOYEES', 'POST /api/employees tạo đồng bộ nhân sự & tài khoản đăng nhập', passEmpCreate, `ID: ${createdEmpId}, User: ${empUsername}`);

    // Kiểm tra trong SQLite DB: Tài khoản users thật đã được tạo kèm mật khẩu hash
    const userRow = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(empUsername) as any;
    const isBcryptHashed = userRow?.password_hash?.startsWith('$2');
    record('EMPLOYEES', 'Database: Users record thật tồn tại trong SQLite kèm password băm bcrypt', !!userRow && isBcryptHashed, `User ID: ${userRow?.id}`);

    // Validation: Chặn trùng username
    const resEmpDup = await fetch(`${baseUrl}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directorToken}`
      },
      body: JSON.stringify({
        name: 'Người khác trùng user',
        username: empUsername,
        phone: '0988 333 444',
        email: 'other@gmail.com',
        department: 'SALES_POS',
        role: 'STAFF'
      })
    });
    const passEmpDup = resEmpDup.status === 409;
    record('EMPLOYEES', 'Chặn trùng tên đăng nhập username (HTTP 409)', passEmpDup, `Status: ${resEmpDup.status}`);

    // DELETE employee
    const resEmpDelete = await fetch(`${baseUrl}/employees/${createdEmpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${directorToken}` }
    });
    const passEmpDelete = resEmpDelete.status === 200;
    record('EMPLOYEES', 'DELETE /api/employees/:id xóa nhân sự & tài khoản thành công', passEmpDelete, `Status: ${resEmpDelete.status}`);

    // Kiểm tra user cũng đã được xóa sạch khỏi SQLite
    const userDeleted = !db.prepare('SELECT id FROM users WHERE username = ?').get(empUsername);
    record('EMPLOYEES', 'Database: Tài khoản user tương ứng đã được xóa khỏi bảng users', userDeleted, `Đã xóa: ${userDeleted}`);

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`🏁 KẾT QUẢ TEST CRUD: ${passedCount}/${results.length} TESTS ${allPassed ? 'PASSED (TẤT CẢ ĐẠT)' : 'FAILED'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runCrudTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
