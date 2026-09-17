import express from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/authRoutes.js';
import db from '../db/database.js';

interface TestItem {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export async function runChangePasswordTests(): Promise<{ passed: boolean; results: TestItem[] }> {
  const results: TestItem[] = [];

  function record(id: string, name: string, passed: boolean, message: string) {
    results.push({ id, name, passed, message });
    console.log(`${passed ? '  ✅' : '  ❌'} [${id}] ${name}: ${message}`);
  }

  console.log('\n================================================================');
  console.log('🧪 KIỂM TRA CHỨC NĂNG ĐỔI MẬT KHẨU (PHASE 8.1 - PARTS 1 & 11)');
  console.log('================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;

  let token = '';

  try {
    // BƯỚC 1: Đăng nhập director_dung / 123456
    const loginRes1 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '123456' })
    });
    const loginData1 = await loginRes1.json();
    token = loginData1.token;
    record('TEST 1', 'Đăng nhập ban đầu (director_dung / 123456)', loginRes1.status === 200 && !!token, `Status: ${loginRes1.status}, Token: ${!!token}`);

    // BƯỚC 2: Gọi đổi mật khẩu không có Token -> 401
    const noTokenRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '1234567' })
    });
    record('TEST 2', 'Chặn đổi mật khẩu khi không có token (401)', noTokenRes.status === 401, `Status: ${noTokenRes.status}`);

    // BƯỚC 3: Nhập sai mật khẩu cũ -> 400 REJECT
    const wrongOldRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword: 'sai_mat_khau_123', newPassword: '1234567' })
    });
    const wrongOldData = await wrongOldRes.json();
    record('TEST 3', 'Nhập sai mật khẩu cũ -> REJECT (400)', wrongOldRes.status === 400 && wrongOldData.success === false, `Status: ${wrongOldRes.status}, Message: "${wrongOldData.message}"`);

    // BƯỚC 4: Mật khẩu mới quá ngắn (< 6 ký tự) -> 400 REJECT
    const shortPassRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '123' })
    });
    const shortPassData = await shortPassRes.json();
    record('TEST 4', 'Mật khẩu mới quá ngắn (< 6 ký tự) -> REJECT (400)', shortPassRes.status === 400 && shortPassData.success === false, `Status: ${shortPassRes.status}, Message: "${shortPassData.message}"`);

    // BƯỚC 5: Mật khẩu mới trùng mật khẩu cũ -> 400 REJECT
    const samePassRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '123456' })
    });
    const samePassData = await samePassRes.json();
    record('TEST 5', 'Mật khẩu mới trùng mật khẩu cũ -> REJECT (400)', samePassRes.status === 400 && samePassData.success === false, `Status: ${samePassRes.status}, Message: "${samePassData.message}"`);

    // BƯỚC 6: Đổi mật khẩu thành công thành 1234567 -> 200 PASS
    const changePassRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword: '123456', newPassword: '1234567' })
    });
    const changePassData = await changePassRes.json();
    const pass6 = changePassRes.status === 200 && changePassData.success === true && changePassData.message === 'Đổi mật khẩu thành công.';
    record('TEST 6', 'Đổi mật khẩu sang 1234567 -> PASS (200)', pass6, `Status: ${changePassRes.status}, Message: "${changePassData.message}"`);

    // BƯỚC 7: Kiểm tra Database SQLite password_hash đã đổi
    const userRow = db.prepare('SELECT password_hash FROM users WHERE username = ? OR username = ?').get('quanly_duyen', 'director_dung') as any;
    const isNewHashValid = userRow && bcrypt.compareSync('1234567', userRow.password_hash);
    const isOldHashInvalid = userRow && !bcrypt.compareSync('123456', userRow.password_hash);
    const pass7 = !!isNewHashValid && !!isOldHashInvalid && !('password' in userRow);
    record('TEST 7', 'Database password_hash đã thay đổi và bảo mật', pass7, `Khớp pass mới (1234567): ${isNewHashValid}, Không khớp pass cũ: ${isOldHashInvalid}`);

    // BƯỚC 8: Đăng nhập bằng mật khẩu cũ 123456 -> 401 REJECT
    const loginOldRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '123456' })
    });
    record('TEST 8', 'Đăng nhập bằng mật khẩu cũ (123456) bị từ chối 401', loginOldRes.status === 401, `Status: ${loginOldRes.status}`);

    // BƯỚC 9: Đăng nhập bằng mật khẩu mới 1234567 -> 200 PASS
    const loginNewRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '1234567' })
    });
    const loginNewData = await loginNewRes.json();
    const pass9 = loginNewRes.status === 200 && loginNewData.success === true && !!loginNewData.token;
    record('TEST 9', 'Đăng nhập bằng mật khẩu mới (1234567) -> PASS (200)', pass9, `Status: ${loginNewRes.status}, User: ${loginNewData.user?.username}`);

    // BƯỚC 10: Khôi phục mật khẩu lại 123456 để hệ sinh thái test nhất quán
    const restoreRes = await fetch(`${baseUrl}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginNewData.token}`
      },
      body: JSON.stringify({ currentPassword: '1234567', newPassword: '123456' })
    });
    const restoreData = await restoreRes.json();
    record('TEST 10', 'Khôi phục mật khẩu về 123456 sau khi test hoàn tất', restoreRes.status === 200 && restoreData.success === true, `Status: ${restoreRes.status}`);

    // BƯỚC 11: Kiểm tra đăng nhập lại bằng 123456 thành công
    const verifyRestoreRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'director_dung', password: '123456' })
    });
    record('TEST 11', 'Xác nhận đăng nhập lại bằng 123456 bình thường', verifyRestoreRes.status === 200, `Status: ${verifyRestoreRes.status}`);

  } finally {
    server.close();
  }

  const allPassed = results.every(r => r.passed);
  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ TEST ĐỔI MẬT KHẨU: ${results.filter(r => r.passed).length}/${results.length} TESTS PASSED`);
  console.log('================================================================\n');

  return { passed: allPassed, results };
}

// Chạy trực tiếp nếu file được thực thi từ CLI
if (process.argv[1]?.includes('testChangePassword')) {
  runChangePasswordTests().then(({ passed }) => {
    if (!passed) process.exit(1);
  });
}
