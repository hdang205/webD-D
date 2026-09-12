import { AuthUser } from '../types/accounting.js';

const TOKEN_STORAGE_KEY = 'dnd_auth_jwt_token';

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
    } catch (e) {
      console.error('Không thể xóa token khỏi localStorage:', e);
    }
  },

  /**
   * Gọi API đăng nhập thật
   * POST /api/auth/login
   */
  async login(username: string, password: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    let data: LoginResponse | null = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Lỗi phân tích JSON từ server:', err, 'Body:', text);
        throw new Error('Server trả về dữ liệu không hợp lệ.');
      }
    } else {
      throw new Error(`Server không trả về dữ liệu (HTTP ${res.status}).`);
    }

    if (!res.ok || !data || !data.success || !data.user || !data.token) {
      const errorMsg = data?.message || data?.error || 'Thông tin đăng nhập không chính xác.';
      throw new Error(errorMsg);
    }

    // Lưu token vào storage
    this.setToken(data.token);
    return data.user;
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

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
  }
};

export default authService;
