import { AuthUser } from '../types/accounting.js';
import { StorageService } from './storage.js';

const TOKEN_STORAGE_KEY = 'dnd_auth_jwt_token';
const DEMO_USER_STORAGE_KEY = 'dnd_demo_user';

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface MeResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export const authService = {
  /**
   * Lấy JWT token đang lưu trữ
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Lưu JWT token
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.error('Không thể lưu token vào localStorage:', e);
    }
  },

  /**
   * Xóa token khi đăng xuất
   */
  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    } catch (e) {
      console.error('Không thể xóa token khỏi localStorage:', e);
    }
  },

  /**
   * Fallback đăng nhập cục bộ khi deploy trên môi trường hosting tĩnh (Vercel)
   */
  fallbackLocalLogin(username: string, password: string): AuthUser {
    const employees = StorageService.getEmployees();
    const cleanUser = username.trim().toLowerCase();
    const emp = employees.find(e => 
      e.username?.toLowerCase() === cleanUser || 
      (cleanUser === 'director_dung' && e.role === 'DIRECTOR') ||
      (cleanUser === 'quanly_duyen' && (e.role === 'DIRECTOR' || e.username === 'quanly_duyen')) ||
      (cleanUser === 'wh_hung' && (e.role === 'WAREHOUSE_MANAGER' || e.username === 'wh_hung')) ||
      (cleanUser === 'tuvan_dang' && (e.id === 'emp_5' || e.username === 'tuvan_dang')) ||
      (cleanUser === 'stylist_dang' && (e.id === 'emp_5' || e.username === 'tuvan_dang')) ||
      (cleanUser === 'thukho_long' && (e.id === 'emp_6' || e.username === 'thukho_long')) ||
      (cleanUser === 'kho_long' && (e.id === 'emp_6' || e.username === 'thukho_long'))
    );

    if (!emp || (password !== '123456' && password !== 'admin123')) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    const user: AuthUser = {
      id: emp.id,
      name: emp.name,
      username: emp.username,
      role: emp.role,
      roleTitle: emp.position,
      email: emp.email || '',
      phone: emp.phone || '',
      avatar: emp.avatar || '👤',
      branch: emp.branch || 'Chi nhánh D&D'
    };

    const token = `demo_jwt_${emp.username}_${Date.now()}`;
    this.setToken(token);
    try {
      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {}
    return user;
  },

  /**
   * Gọi API đăng nhập thật
   * POST /api/auth/login
   */
  async login(username: string, password: string): Promise<AuthUser> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      // Nếu máy chủ là môi trường hosting tĩnh (như Vercel trả về 404 hoặc 405 Method Not Allowed)
      if (res.status === 404 || res.status === 405) {
        return this.fallbackLocalLogin(username, password);
      }

      const text = await res.text();
      let data: LoginResponse | null = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Server trả về HTML thay vì JSON (máy chủ tĩnh)
          return this.fallbackLocalLogin(username, password);
        }
      } else {
        return this.fallbackLocalLogin(username, password);
      }

      if (!res.ok || !data || !data.success || !data.user || !data.token) {
        const errorMsg = data?.message || data?.error || 'Thông tin đăng nhập không chính xác.';
        throw new Error(errorMsg);
      }

      // Lưu token vào storage
      this.setToken(data.token);
      return data.user;
    } catch (err: any) {
      if (err.message && (err.message.includes('không chính xác') || err.message.includes('Mật khẩu'))) {
        throw err;
      }
      return this.fallbackLocalLogin(username, password);
    }
  },

  /**
   * Xác thực và khôi phục phiên đăng nhập từ Server
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    if (token.startsWith('demo_jwt_')) {
      try {
        const cached = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        return null;
      }
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 404 || res.status === 405) {
        try {
          const cached = localStorage.getItem(DEMO_USER_STORAGE_KEY);
          if (cached) return JSON.parse(cached);
        } catch {
          return null;
        }
      }

      if (!res.ok) {
        // Token không hợp lệ hoặc đã hết hạn -> xóa token
        this.clearToken();
        return null;
      }

      const text = await res.text();
      let data: MeResponse | null = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          this.clearToken();
          return null;
        }
      } else {
        this.clearToken();
        return null;
      }

      if (data && data.success && data.user) {
        return data.user;
      }

      this.clearToken();
      return null;
    } catch (error) {
      console.error('Lỗi khi kiểm tra phiên đăng nhập:', error);
      try {
        const cached = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
      return null;
    }
  },

  /**
   * Gọi API đăng xuất và hủy token
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.warn('Lỗi khi gọi API logout:', e);
    } finally {
      this.clearToken();
    }
  },

  /**
   * Đổi mật khẩu tài khoản người dùng
   * PUT /api/auth/password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    }

    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Lỗi parse JSON từ server khi đổi mật khẩu:', err);
        throw new Error('Server trả về phản hồi không hợp lệ.');
      }
    }

    if (!res.ok || !data || !data.success) {
      const errorMsg = data?.message || data?.error || `Đổi mật khẩu thất bại (HTTP ${res.status}).`;
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: data.message || 'Đổi mật khẩu thành công.'
    };
  }
};

export default authService;
