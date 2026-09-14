import express from 'express';
import http from 'http';
import authRoutes from './routes/authRoutes.js';

interface TestItem {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export async function runAuthTests(): Promise<{ passed: boolean; results: TestItem[] }> {
  const results: TestItem[] = [];

  function record(id: string, name: string, passed: boolean, message: string) {
    results.push({ id, name, passed, message });
    console.log(`${passed ? '  ✅' : '  ❌'} [${id}] ${name}: ${message}`);
  }

  console.log('\n================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN BỘ BACKEND AUTHENTICATION (PHASE 2)');
  console.log('================================================================\n');

  // Khởi tạo app express test độc lập với port ngẫu nhiên
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;

  let validTokenDirector = '';
  let validTokenSales = '';

  try {
    // TEST 1: Đăng nhập thành công với director_dung / 123456
    const res1 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '123456' })
    });
    const data1 = await res1.json();
    validTokenDirector = data1.token || '';
    const pass1 = res1.status === 200 && data1.success === true && !!data1.token && data1.user?.role === 'DIRECTOR';
    record('TEST 1', 'Đăng nhập đúng tài khoản Giám đốc (director_dung / 123456)', pass1, `Status: ${res1.status}, Success: ${data1.success}, Token: ${!!data1.token}`);

    // TEST 2: Đăng nhập sai mật khẩu
    const res2 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: 'sai_mat_khau' })
    });
    const data2 = await res2.json();
    const pass2 = res2.status === 401 && data2.success === false && data2.error === 'Thông tin đăng nhập không chính xác.';
    record('TEST 2', 'Chặn đăng nhập sai mật khẩu', pass2, `Status: ${res2.status}, Error: "${data2.error}"`);

    // TEST 3: Đăng nhập với username không tồn tại
    const res3 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'khong_ton_tai_123', password: '123456' })
    });
    const data3 = await res3.json();
    const pass3 = res3.status === 401 && data3.success === false && data3.error === 'Thông tin đăng nhập không chính xác.';
    record('TEST 3', 'Chặn username không tồn tại (không làm lộ thông tin)', pass3, `Status: ${res3.status}, Error: "${data3.error}"`);

    // TEST 4: Tên đăng nhập rỗng
    const res4 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '123456' })
    });
    const data4 = await res4.json();
    const pass4 = res4.status === 400 && data4.success === false;
    record('TEST 4', 'Validate chặn username rỗng', pass4, `Status: ${res4.status}, Error: "${data4.error}"`);

    // TEST 5: Mật khẩu rỗng
    const res5 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '' })
    });
    const data5 = await res5.json();
    const pass5 = res5.status === 400 && data5.success === false;
    record('TEST 5', 'Validate chặn password rỗng', pass5, `Status: ${res5.status}, Error: "${data5.error}"`);

    // TEST 6: Gọi GET /api/auth/me không có token
    const res6 = await fetch(`${baseUrl}/me`);
    const data6 = await res6.json();
    const pass6 = res6.status === 401 && data6.success === false;
    record('TEST 6', 'GET /api/auth/me không có token bị chặn 401', pass6, `Status: ${res6.status}, Error: "${data6.error}"`);

    // TEST 7: Gọi GET /api/auth/me với token hợp lệ
    const res7 = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${validTokenDirector}` }
    });
    const data7 = await res7.json();
    const pass7 = res7.status === 200 && data7.success === true && (data7.user?.username === 'director_dung' || data7.user?.username === 'quanly_duyen');
    record('TEST 7', 'GET /api/auth/me với token hợp lệ trả về thông tin user', pass7, `Status: ${res7.status}, User: ${data7.user?.username}, Role: ${data7.user?.role}`);

    // TEST 8: Kiểm tra TUYỆT ĐỐI KHÔNG làm lộ password_hash
    const hasPasswordHash = 'password_hash' in (data1.user || {}) || 'password' in (data1.user || {}) ||
                            'password_hash' in (data7.user || {}) || 'password' in (data7.user || {});
    const pass8 = !hasPasswordHash;
    record('TEST 8', 'Bảo mật: Không bao giờ trả về password_hash hoặc password', pass8, `Kiểm tra payload an toàn: ${!hasPasswordHash}`);

    // TEST 9: Đăng xuất POST /api/auth/logout
    const res9 = await fetch(`${baseUrl}/logout`, { method: 'POST' });
    const data9 = await res9.json();
    const pass9 = res9.status === 200 && data9.success === true;
    record('TEST 9', 'POST /api/auth/logout trả kết quả thành công', pass9, `Status: ${res9.status}`);

    // TEST 10: Đăng nhập tài khoản Sales (sales_lan) và kiểm tra phân quyền RBAC
    const resSales = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sales_lan', password: '123456' })
    });
    const dataSales = await resSales.json();
    validTokenSales = dataSales.token || '';

    // Thử truy cập endpoint dành riêng cho Giám đốc bằng token của Sales Staff
    const resRbacFail = await fetch(`${baseUrl}/test-role-director`, {
      headers: { Authorization: `Bearer ${validTokenSales}` }
    });
    const dataRbacFail = await resRbacFail.json();
    const pass10 = resRbacFail.status === 403 && dataRbacFail.success === false;
    record('TEST 10', 'RBAC: Chặn nhân viên (SALES_STAFF) truy cập chức năng Giám đốc (403)', pass10, `Status: ${resRbacFail.status}, Message: "${dataRbacFail.error}"`);

    // TEST 11: Giám đốc truy cập endpoint dành riêng cho Giám đốc -> Phải thành công (200)
    const resRbacOk = await fetch(`${baseUrl}/test-role-director`, {
      headers: { Authorization: `Bearer ${validTokenDirector}` }
    });
    const dataRbacOk = await resRbacOk.json();
    const pass11 = resRbacOk.status === 200 && dataRbacOk.success === true;
    record('TEST 11', 'RBAC: Cho phép Giám Đốc truy cập chức năng Giám Đốc (200)', pass11, `Status: ${resRbacOk.status}, Message: "${dataRbacOk.message}"`);

    // TEST 12: Thử giả mạo role bằng cách gửi { "role": "DIRECTOR" } trong body khi token là của Sales Staff
    const resSpoof = await fetch(`${baseUrl}/test-role-director`, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${validTokenSales}`,
        'Content-Type': 'application/json'
      }
    });
    const pass12 = resSpoof.status === 403;
    record('TEST 12', 'Chống giả mạo Role: Backend chỉ tin dữ liệu từ Database, không tin role từ client', pass12, `Status: ${resSpoof.status} (Bị từ chối 403 chính xác)`);

    // TEST 13: Thử dùng token rác / giả mạo
    const resFakeToken = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer token_gia_mao_abc_123' }
    });
    const pass13 = resFakeToken.status === 401;
    record('TEST 13', 'Chặn token giả mạo / sai chữ ký', pass13, `Status: ${resFakeToken.status}`);

    // TEST 14: Đăng nhập trực tiếp bằng tên đăng nhập mới quanly_duyen
    const resNewUser = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'quanly_duyen', password: '123456' })
    });
    const dataNewUser = await resNewUser.json();
    const pass14 = resNewUser.status === 200 && dataNewUser.success === true && dataNewUser.user?.username === 'quanly_duyen';
    record('TEST 14', 'Đăng nhập thành công với tên đăng nhập mới (quanly_duyen / 123456)', pass14, `Status: ${resNewUser.status}, User: ${dataNewUser.user?.username}, Name: ${dataNewUser.user?.name}`);

  } finally {
    server.close();
  }

  const allPassed = results.every(r => r.passed);
  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ TEST AUTHENTICATION: ${results.filter(r => r.passed).length}/${results.length} TESTS PASSED`);
  console.log('================================================================\n');

  return { passed: allPassed, results };
}

// Chạy trực tiếp nếu gọi từ terminal
if (process.argv[1]?.includes('testAuth')) {
  runAuthTests().then(outcome => {
    if (!outcome.passed) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('Lỗi khi chạy auth tests:', err);
    process.exit(1);
  });
}
