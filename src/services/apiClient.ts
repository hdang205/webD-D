import authService from './authService.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = authService.getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method || 'GET').toUpperCase();

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...options,
      headers
    });
  } catch (err: any) {
    console.warn(`Lỗi kết nối mạng tới ${endpoint}:`, err);
    if (method === 'GET') {
      return { success: true, data: [] as any };
    }
    throw err;
  }

  // Nếu máy chủ là môi trường hosting tĩnh không có backend (HTTP 404 / 405)
  if (res.status === 404 || res.status === 405) {
    if (method === 'GET') {
      return { success: true, data: [] as any };
    }
    const err = new Error(`Máy chủ không hỗ trợ API: ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  const text = await res.text();
  let json: any = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Server trả về HTML thay vì JSON (máy chủ tĩnh)
      if (method === 'GET') {
        return { success: true, data: [] as any };
      }
      const err = new Error('Phản hồi từ máy chủ không phải JSON.');
      (err as any).status = res.status;
      throw err;
    }
  } else {
    if (method === 'GET') {
      return { success: true, data: [] as any };
    }
    const err = new Error('Phản hồi rỗng từ máy chủ.');
    (err as any).status = res.status;
    throw err;
  }

  if (res.status === 401) {
    authService.clearToken();
  }

  if (!res.ok || json?.success === false) {
    const message = json?.message || json?.error || `Yêu cầu thất bại (${res.status})`;
    const error = new Error(message);
    (error as any).status = res.status;
    (error as any).errors = json?.errors;
    throw error;
  }

  return json;
}

export const apiClient = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { 
    method: 'POST', 
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined 
  }),
  put: <T = any>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { 
    method: 'PUT', 
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined 
  }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
