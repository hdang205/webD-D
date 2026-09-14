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
    const res = await apiRequest<InventoryItem>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async update(id: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await apiRequest<InventoryItem>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
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
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tier && tier !== 'ALL') params.set('tier', tier);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await apiRequest<Partner[]>(`/api/customers${qs}`);
    return res.data || [];
  },

  async getById(id: string): Promise<Partner | null> {
    const res = await apiRequest<Partner>(`/api/customers/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async create(data: Partial<Partner>): Promise<Partner> {
    const res = await apiRequest<Partner>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async update(id: string, data: Partial<Partner>): Promise<Partner> {
    const res = await apiRequest<Partner>(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

export const SupplierService = {
  async getAll(search?: string): Promise<Partner[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiRequest<Partner[]>(`/api/suppliers${qs}`);
    return res.data || [];
  },

  async getById(id: string): Promise<Partner | null> {
    const res = await apiRequest<Partner>(`/api/suppliers/${encodeURIComponent(id)}`);
    return res.data || null;
  },

  async create(data: Partial<Partner>): Promise<Partner> {
    const res = await apiRequest<Partner>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async update(id: string, data: Partial<Partner>): Promise<Partner> {
    const res = await apiRequest<Partner>(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
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
