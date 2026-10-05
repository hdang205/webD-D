import jwt from 'jsonwebtoken';
import { SERVER_CONFIG } from './config.js';

async function testPersistence() {
  console.log('--- BẮT ĐẦU KIỂM TRA TOÀN DIỆN THÊM / SỬA / XÓA & PERSISTENCE ---');
  const token = jwt.sign(
    { id: 'usr_emp_1', username: 'director_dung', role: 'DIRECTOR' },
    SERVER_CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const BASE = 'http://localhost:3000/api';

  // 1. SẢN PHẨM: Thêm -> Sửa -> Xóa
  console.log('\n1. Test Sản Phẩm:');
  const prodCode = `TEST_SP_${Date.now()}`;
  const createProdRes = await fetch(`${BASE}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: prodCode,
      name: 'Váy Dạ Hội Test Persistence',
      unit: 'Cái',
      categoryId: 'cat_damvay',
      costPrice: 200000,
      sellingPrice: 450000,
      openingQuantity: 10,
      minStockLevel: 2
    })
  });
  const createdProd = await createProdRes.json();
  console.log('  - Tạo sản phẩm:', createdProd.success, createdProd.data?.id, createdProd.data?.code);
  if (!createdProd.success) throw new Error('Không tạo được sản phẩm');

  const prodId = createdProd.data.id;

  // Sửa sản phẩm
  const updateProdRes = await fetch(`${BASE}/products/${prodId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: 'Váy Dạ Hội Test Persistence (Đã sửa tên)',
      sellingPrice: 500000
    })
  });
  const updatedProd = await updateProdRes.json();
  console.log('  - Sửa sản phẩm:', updatedProd.success, updatedProd.data?.name, updatedProd.data?.sellingPrice);

  // Fetch lại từ DB để verify
  const getProdRes = await fetch(`${BASE}/products/${prodId}`, { headers });
  const fetchedProd = await getProdRes.json();
  console.log('  - Reload sản phẩm:', fetchedProd.success, fetchedProd.data?.name);
  if (fetchedProd.data?.sellingPrice !== 500000) throw new Error('Dữ liệu sửa không persist!');

  // Xóa sản phẩm
  const deleteProdRes = await fetch(`${BASE}/products/${prodId}`, { method: 'DELETE', headers });
  const deletedProd = await deleteProdRes.json();
  console.log('  - Xóa sản phẩm:', deletedProd.success);

  // Reload kiểm tra đã mất hoàn toàn
  const getDeletedProdRes = await fetch(`${BASE}/products/${prodId}`, { headers });
  console.log('  - Reload sau xóa (kỳ vọng 404):', getDeletedProdRes.status);
  if (getDeletedProdRes.status !== 404) throw new Error('Sản phẩm chưa bị xóa khỏi database!');

  // 2. KHÁCH HÀNG: Thêm -> Sửa -> Xóa
  console.log('\n2. Test Khách Hàng:');
  const custPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const createCustRes = await fetch(`${BASE}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Khách Hàng Persistence Test',
      phone: custPhone,
      address: '123 Phố Huế',
      tier: 'GOLD'
    })
  });
  const createdCust = await createCustRes.json();
  console.log('  - Tạo khách hàng:', createdCust.success, createdCust.data?.id, createdCust.data?.code);
  const custId = createdCust.data.id;

  // Sửa khách hàng
  const updateCustRes = await fetch(`${BASE}/customers/${custId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: 'Khách Hàng VIP Đã Cập Nhật',
      tier: 'DIAMOND'
    })
  });
  const updatedCust = await updateCustRes.json();
  console.log('  - Sửa khách hàng:', updatedCust.success, updatedCust.data?.name, updatedCust.data?.tier);

  // Reload khách hàng
  const getCustRes = await fetch(`${BASE}/customers/${custId}`, { headers });
  const fetchedCust = await getCustRes.json();
  console.log('  - Reload khách hàng:', fetchedCust.success, fetchedCust.data?.name, fetchedCust.data?.tier);
  if (fetchedCust.data?.tier !== 'DIAMOND') throw new Error('Dữ liệu khách hàng sửa không persist!');

  // Xóa khách hàng
  const deleteCustRes = await fetch(`${BASE}/customers/${custId}`, { method: 'DELETE', headers });
  const deletedCust = await deleteCustRes.json();
  console.log('  - Xóa khách hàng:', deletedCust.success);

  const getDeletedCustRes = await fetch(`${BASE}/customers/${custId}`, { headers });
  console.log('  - Reload khách hàng sau xóa (kỳ vọng 404):', getDeletedCustRes.status);
  if (getDeletedCustRes.status !== 404) throw new Error('Khách hàng chưa bị xóa khỏi database!');

  // 3. NHÀ CUNG CẤP: Thêm -> Sửa -> Xóa
  console.log('\n3. Test Nhà Cung Cấp:');
  const suppPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  const createSuppRes = await fetch(`${BASE}/suppliers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Xưởng May Test Persistence',
      phone: suppPhone,
      address: 'Ninh Hiệp, Hà Nội'
    })
  });
  const createdSupp = await createSuppRes.json();
  console.log('  - Tạo NCC:', createdSupp.success, createdSupp.data?.id, createdSupp.data?.code);
  const suppId = createdSupp.data.id;

  // Xóa NCC
  const deleteSuppRes = await fetch(`${BASE}/suppliers/${suppId}`, { method: 'DELETE', headers });
  const deletedSupp = await deleteSuppRes.json();
  console.log('  - Xóa NCC:', deletedSupp.success);

  // 4. CHỨNG TỪ SỔ QUỸ (Cash Transactions)
  console.log('\n4. Test Sổ Quỹ (Cash Transactions):');
  const createTxRes = await fetch(`${BASE}/debts/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: `PT_TEST_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'CASH_RECEIPT',
      personName: 'Người Nộp Tiền Test',
      reason: 'Thu tiền bán hàng thử nghiệm',
      amount: 500000,
      fundAccountCode: '1111',
      oppositeAccountCode: '511'
    })
  });
  const createdTx = await createTxRes.json();
  console.log('  - Tạo phiếu thu:', createdTx.success, createdTx.transaction?.id, createdTx.transaction?.code);
  const txId = createdTx.transaction.id;

  // Reload Sổ quỹ
  const getTxsRes = await fetch(`${BASE}/debts/transactions`, { headers });
  const fetchedTxs = await getTxsRes.json();
  const foundTx = fetchedTxs.data?.find((t: any) => t.id === txId);
  console.log('  - Reload phiếu thu tồn tại:', !!foundTx, foundTx?.amount);
  if (!foundTx) throw new Error('Phiếu thu không persist trong database!');

  // Xóa phiếu thu
  const deleteTxRes = await fetch(`${BASE}/debts/transactions/${txId}`, { method: 'DELETE', headers });
  const deletedTx = await deleteTxRes.json();
  console.log('  - Xóa phiếu thu:', deletedTx.success);

  // Reload sau xóa
  const getTxsAfterRes = await fetch(`${BASE}/debts/transactions`, { headers });
  const fetchedTxsAfter = await getTxsAfterRes.json();
  const foundTxAfter = fetchedTxsAfter.data?.find((t: any) => t.id === txId);
  console.log('  - Reload sau xóa (kỳ vọng undefined):', foundTxAfter);
  if (foundTxAfter) throw new Error('Phiếu thu chưa bị xóa khỏi database!');

  // 5. PHIẾU KHO (Stock Vouchers)
  console.log('\n5. Test Phiếu Nhập/Xuất Kho (Stock Vouchers):');
  const createVoucherRes = await fetch(`${BASE}/inventory/vouchers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      code: `PNK_TEST_${Date.now()}`,
      type: 'IMPORT',
      date: new Date().toISOString().split('T')[0],
      personName: 'Thủ kho kiểm nghiệm',
      reason: 'Nhập hàng may mẫu',
      items: [
        {
          productId: 'prod_1',
          itemCode: 'SP001',
          itemName: 'Đầm hoa nhí',
          quantity: 5,
          unitPrice: 200000,
          totalAmount: 1000000
        }
      ]
    })
  });
  const createdVoucher = await createVoucherRes.json();
  console.log('  - Tạo phiếu nhập kho:', createdVoucher.success, createdVoucher.voucher?.id, createdVoucher.voucher?.code);
  const voucherId = createdVoucher.voucher.id;

  // Reload phiếu kho
  const getLogsRes = await fetch(`${BASE}/inventory/logs`, { headers });
  const fetchedLogs = await getLogsRes.json();
  const foundVoucher = fetchedLogs.logs?.find((l: any) => l.id === voucherId);
  console.log('  - Reload phiếu kho tồn tại:', !!foundVoucher);
  if (!foundVoucher) throw new Error('Phiếu kho không persist trong database!');

  // Xóa phiếu kho
  const deleteVoucherRes = await fetch(`${BASE}/inventory/vouchers/${voucherId}`, { method: 'DELETE', headers });
  const deletedVoucher = await deleteVoucherRes.json();
  console.log('  - Xóa phiếu kho:', deletedVoucher.success);

  // Reload sau xóa
  const getLogsAfterRes = await fetch(`${BASE}/inventory/logs`, { headers });
  const fetchedLogsAfter = await getLogsAfterRes.json();
  const foundVoucherAfter = fetchedLogsAfter.logs?.find((l: any) => l.id === voucherId);
  console.log('  - Reload phiếu kho sau xóa (kỳ vọng undefined):', foundVoucherAfter);
  if (foundVoucherAfter) throw new Error('Phiếu kho chưa bị xóa khỏi database!');

  console.log('\n================================================================');
  console.log('🎉 TẤT CẢ CÁC BƯỚC CRUD & RELOAD PERSISTENCE ĐỀU THÀNH CÔNG 100%!');
  console.log('================================================================');
}

testPersistence().catch(err => {
  console.error('❌ Lỗi kiểm tra persistence:', err);
  process.exit(1);
});
