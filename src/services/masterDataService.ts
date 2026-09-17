import { apiRequest } from './apiClient.js';
import { Category, InventoryItem, Partner, Employee } from '../types/accounting.js';
import { StorageService } from './storage.js';

export const CategoryService = {
  async getAll(search?: string): Promise<Category[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiRequest<Category[]>(`/api/categories${query}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {}

    // Fallback sang StorageService (có đủ 12 danh mục từ SQLite)
    let stored = StorageService.getCategories();
    if (search) {
      const s = search.toLowerCase();
      stored = stored.filter(c => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
    }
    return stored;
  },

  async getById(id: string): Promise<Category | null> {
    const res = await apiRequest<Category>(`/api/categories/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async create(data: Partial<Category>): Promise<Category> {
    const res = await apiRequest<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const res = await apiRequest<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

export const ProductService = {
  async getAll(params?: { search?: string; categoryId?: string; stockStatus?: string }): Promise<InventoryItem[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryId) searchParams.set('category_id', params.categoryId);
      if (params?.stockStatus) searchParams.set('stock_status', params.stockStatus);
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

      const res = await apiRequest<InventoryItem[]>(`/api/products${qs}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {}

    // Fallback sang StorageService (có đủ 160 sản phẩm từ SQLite)
    let items = StorageService.getInventory();
    if (params?.search) {
      const s = params.search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s));
    }
    if (params?.categoryId) {
      items = items.filter(i => i.categoryId === params.categoryId || i.category === params.categoryId);
    }
    return items;
  },

  async getById(id: string): Promise<InventoryItem | null> {
    const res = await apiRequest<InventoryItem>(`/api/products/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async create(data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const res = await apiRequest<InventoryItem>('/api/products', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.id && res.data.name) {
        const existing = StorageService.getInventory();
        if (!existing.some(i => i.id === res.data!.id)) {
          StorageService.saveInventory([res.data!, ...existing]);
        }
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400 || (err.message && (err.message.includes('tồn tại') || err.message.includes('bắt buộc')))) {
        throw err;
      }
      console.warn('API tạo sản phẩm thất bại, tự động lưu cục bộ:', err);
    }

    const existing = StorageService.getInventory();
    const newItem: InventoryItem = {
      id: data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: data.code || `SP00${existing.length + 1}`,
      name: data.name || '',
      unit: data.unit || 'Cái',
      category: data.category || 'Đầm/Váy',
      categoryId: data.categoryId || 'cat_damvay',
      size: data.size || 'M',
      color: data.color || '',
      barcode: data.barcode || '',
      costPrice: Number(data.costPrice || 0),
      sellingPrice: Number(data.sellingPrice || 0),
      openingQuantity: Number(data.openingQuantity || 0),
      openingValue: Number(data.costPrice || 0) * Number(data.openingQuantity || 0),
      minStockLevel: Number(data.minStockLevel || 5),
      description: data.description || '',
    };
    StorageService.saveInventory([newItem, ...existing]);
    return newItem;
  },

  async update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const res = await apiRequest<InventoryItem>(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        const existing = StorageService.getInventory();
        StorageService.saveInventory(existing.map(i => i.id === id ? { ...i, ...res.data! } : i));
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400) throw err;
    }

    const existing = StorageService.getInventory();
    const target = existing.find(i => i.id === id);
    const updated: InventoryItem = { ...target, ...data, id } as InventoryItem;
    StorageService.saveInventory(existing.map(i => i.id === id ? updated : i));
    return updated;
  },

  async delete(id: string): Promise<void> {
    try {
      await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {}
    const existing = StorageService.getInventory();
    StorageService.saveInventory(existing.filter(i => i.id !== id));
  },

  async importExcel(fileBase64?: string): Promise<any> {
    const res = await apiRequest<any>('/api/products/import', {
      method: 'POST',
      body: JSON.stringify({ fileBase64 })
    });
    return res;
  }
};

export const CustomerService = {
  async getAll(search?: string, tier?: string): Promise<Partner[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tier && tier !== 'ALL') params.set('tier', tier);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await apiRequest<Partner[]>(`/api/customers${qs}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const stored = StorageService.getPartners();
        const map = new Map<string, Partner>();
        stored.forEach(p => map.set(p.id, p));
        res.data.forEach(p => map.set(p.id, p));
        const merged = Array.from(map.values());
        StorageService.savePartners(merged);
        return res.data;
      }
    } catch {}

    let list = StorageService.getPartners().filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
    }
    if (tier && tier !== 'ALL') {
      list = list.filter(c => c.tier === tier);
    }
    return list;
  },

  async getById(id: string): Promise<Partner | null> {
    try {
      const res = await apiRequest<Partner>(`/api/customers/${encodeURIComponent(id)}`);
      if (res?.data && typeof res.data === 'object' && res.data.id) return res.data;
    } catch {}
    return StorageService.getPartners().find(p => p.id === id) || null;
  },

  async create(data: Partial<Partner>): Promise<Partner> {
    try {
      const res = await apiRequest<Partner>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.id && res.data.name) {
        const existing = StorageService.getPartners();
        if (!existing.some(p => p.id === res.data!.id)) {
          StorageService.savePartners([res.data!, ...existing]);
        }
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400 || (err.message && (err.message.includes('tồn tại') || err.message.includes('bắt buộc')))) {
        throw err;
      }
      console.warn('API tạo khách hàng thất bại, tự động lưu cục bộ:', err);
    }

    // Fallback: Tạo cục bộ và lưu vào StorageService (cho Vercel / static mode / offline)
    const existing = StorageService.getPartners();
    const newPartner: Partner = {
      id: data.id || `p_customer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: data.code || `KH00${existing.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH').length + 1}`,
      name: data.name || '',
      type: 'CUSTOMER',
      taxCode: data.taxCode || '',
      phone: data.phone || '',
      address: data.address || '',
      email: data.email || '',
      tier: data.tier || 'STANDARD',
      creditLimit: data.creditLimit || 20000000,
      bankAccount: data.bankAccount || '',
      bankName: data.bankName || '',
      openingDebtDebit: data.openingDebtDebit || 0,
      openingDebtCredit: 0,
      notes: data.notes || '',
    };
    StorageService.savePartners([newPartner, ...existing]);
    return newPartner;
  },

  async update(id: string, data: Partial<Partner>): Promise<Partner> {
    try {
      const res = await apiRequest<Partner>(`/api/customers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        const existing = StorageService.getPartners();
        StorageService.savePartners(existing.map(p => p.id === id ? { ...p, ...res.data! } : p));
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400) throw err;
    }

    const existing = StorageService.getPartners();
    const target = existing.find(p => p.id === id);
    const updated: Partner = { ...target, ...data, id } as Partner;
    StorageService.savePartners(existing.map(p => p.id === id ? updated : p));
    return updated;
  },

  async delete(id: string): Promise<void> {
    try {
      await apiRequest(`/api/customers/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {}
    const existing = StorageService.getPartners();
    StorageService.savePartners(existing.filter(p => p.id !== id));
  }
};

export const SupplierService = {
  async getAll(search?: string): Promise<Partner[]> {
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiRequest<Partner[]>(`/api/suppliers${qs}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const stored = StorageService.getPartners();
        const map = new Map<string, Partner>();
        stored.forEach(p => map.set(p.id, p));
        res.data.forEach(p => map.set(p.id, p));
        const merged = Array.from(map.values());
        StorageService.savePartners(merged);
        return res.data;
      }
    } catch {}

    let list = StorageService.getPartners().filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH');
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
    }
    return list;
  },

  async getById(id: string): Promise<Partner | null> {
    try {
      const res = await apiRequest<Partner>(`/api/suppliers/${encodeURIComponent(id)}`);
      if (res?.data && typeof res.data === 'object' && res.data.id) return res.data;
    } catch {}
    return StorageService.getPartners().find(p => p.id === id) || null;
  },

  async create(data: Partial<Partner>): Promise<Partner> {
    try {
      const res = await apiRequest<Partner>('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.id && res.data.name) {
        const existing = StorageService.getPartners();
        if (!existing.some(p => p.id === res.data!.id)) {
          StorageService.savePartners([res.data!, ...existing]);
        }
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400 || (err.message && (err.message.includes('tồn tại') || err.message.includes('bắt buộc')))) {
        throw err;
      }
      console.warn('API tạo nhà cung cấp thất bại, tự động lưu cục bộ:', err);
    }

    const existing = StorageService.getPartners();
    const newPartner: Partner = {
      id: data.id || `p_supplier_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: data.code || `NCC00${existing.filter(p => p.type === 'SUPPLIER' || p.type === 'BOTH').length + 1}`,
      name: data.name || '',
      type: 'SUPPLIER',
      taxCode: data.taxCode || '',
      phone: data.phone || '',
      address: data.address || '',
      email: data.email || '',
      creditLimit: data.creditLimit || 100000000,
      bankAccount: data.bankAccount || '',
      bankName: data.bankName || '',
      openingDebtDebit: 0,
      openingDebtCredit: data.openingDebtCredit || 0,
      notes: data.notes || '',
    };
    StorageService.savePartners([newPartner, ...existing]);
    return newPartner;
  },

  async update(id: string, data: Partial<Partner>): Promise<Partner> {
    try {
      const res = await apiRequest<Partner>(`/api/suppliers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res?.data && typeof res.data === 'object' && res.data.id) {
        const existing = StorageService.getPartners();
        StorageService.savePartners(existing.map(p => p.id === id ? { ...p, ...res.data! } : p));
        return res.data;
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.status === 400) throw err;
    }

    const existing = StorageService.getPartners();
    const target = existing.find(p => p.id === id);
    const updated: Partner = { ...target, ...data, id } as Partner;
    StorageService.savePartners(existing.map(p => p.id === id ? updated : p));
    return updated;
  },

  async delete(id: string): Promise<void> {
    try {
      await apiRequest(`/api/suppliers/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {}
    const existing = StorageService.getPartners();
    StorageService.savePartners(existing.filter(p => p.id !== id));
  }
};

export const EmployeeService = {
  async getAll(search?: string, department?: string, status?: string): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (department && department !== 'ALL') params.set('department', department);
    if (status && status !== 'ALL') params.set('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await apiRequest<Employee[]>(`/api/employees${qs}`);
    return res.data || [];
  },

  async getById(id: string): Promise<Employee | null> {
    const res = await apiRequest<Employee>(`/api/employees/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async create(data: Partial<Employee> & { username?: string; password?: string }): Promise<Employee> {
    const res = await apiRequest<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async update(id: string, data: Partial<Employee> & { password?: string }): Promise<Employee> {
    const res = await apiRequest<Employee>(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
