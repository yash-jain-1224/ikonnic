/**
 * Ikonnic API Client
 * Centralized axios instance with JWT auth interceptors, token refresh, and error handling.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

// ─── Constants ─────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const ACCESS_TOKEN_KEY = "ikonnic_access_token";
const REFRESH_TOKEN_KEY = "ikonnic_refresh_token";

// ─── Axios Instance ────────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Token Helpers ─────────────────────────────────────────
export const tokenStorage = {
  getAccessToken: () => Cookies.get(ACCESS_TOKEN_KEY) || null,
  getRefreshToken: () => Cookies.get(REFRESH_TOKEN_KEY) || null,
  setTokens: (accessToken: string, refreshToken: string) => {
    // sameSite=lax (not strict): cookies must survive top-level redirects back
    // from external sites (PhonePe payment page, Microsoft login) or the
    // middleware bounces returning users to /login mid-flow.
    const secure = typeof window !== "undefined" && window.location.protocol === "https:";
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 / 96, sameSite: "lax", secure }); // ~15 min
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7, sameSite: "lax", secure });
  },
  clearTokens: () => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },
};

// ─── Request Interceptor: Attach Access Token ──────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 + Token Refresh ──────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not a refresh request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = data;
        tokenStorage.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Typed API Methods ─────────────────────────────────────

// Auth
export const authAPI = {
  register: (data: { email: string; phone?: string; firstName: string; lastName?: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { identifier: string; password: string }) =>
    api.post("/auth/login", data),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
  logout: (refreshToken?: string) =>
    api.post("/auth/logout", { refreshToken }),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post("/auth/reset-password", { email, otp, newPassword }),
  verifyEmail: (email: string, otp: string) =>
    api.post("/auth/verify-email", { email, otp }),
  sendOtp: (identifier: string, type: string) =>
    api.post("/auth/send-otp", { identifier, type }),
};

// Users
export const usersAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: Record<string, unknown>) => api.put("/users/profile", data),
  getAddresses: () => api.get("/users/addresses"),
  addAddress: (data: Record<string, unknown>) => api.post("/users/addresses", data),
  updateAddress: (id: string, data: Record<string, unknown>) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
};

// Products
export const productsAPI = {
  list: (params?: Record<string, unknown>) => api.get("/products", { params }),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  getFeatured: (limit = 8) => api.get("/products/featured", { params: { limit } }),
  getTrending: (limit = 8) => api.get("/products/trending", { params: { limit } }),
  getRelated: (slug: string, limit = 4) => api.get(`/products/${slug}/related`, { params: { limit } }),
  checkStock: (id: string, quantity = 1) => api.get(`/products/${id}/stock`, { params: { quantity } }),
};

// Categories
export const categoriesAPI = {
  list: (featured?: boolean) => api.get("/categories", { params: { featured } }),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
};

// Cart
export const cartAPI = {
  get: (guestSessionId?: string) => api.get("/cart", { params: { guestSessionId } }),
  addItem: (data: Record<string, unknown>, guestSessionId?: string) =>
    api.post("/cart/items", data, { params: { guestSessionId } }),
  updateItem: (id: string, data: Record<string, unknown>) => api.put(`/cart/items/${id}`, data),
  removeItem: (id: string) => api.delete(`/cart/items/${id}`),
  clear: (guestSessionId?: string) => api.delete("/cart", { params: { guestSessionId } }),
  merge: (guestSessionId: string) => api.post("/cart/merge", { guestSessionId }),
};

// Orders
export const ordersAPI = {
  create: (data: Record<string, unknown>) => api.post("/orders", data),
  list: (page = 1, limit = 10) => api.get("/orders", { params: { page, limit } }),
  getById: (id: string) => api.get(`/orders/${id}`),
  track: (orderNumber: string, identifier?: string) =>
    api.get(`/orders/track/${orderNumber}`, { params: { identifier } }),
  cancel: (id: string, reason: string) => api.patch(`/orders/${id}/cancel`, { reason }),
};

// Payments
export const paymentsAPI = {
  initiate: (orderId: string, method: string, idempotencyKey?: string) =>
    api.post("/payments/initiate", { orderId, method }, { headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {} }),
  verify: (paymentId: string, verificationData: Record<string, unknown>) =>
    api.post("/payments/verify", { paymentId, verificationData }),
  refund: (orderId: string, amount?: number, reason?: string) =>
    api.post("/payments/refund", { orderId, amount, reason }),
  history: (orderId: string) => api.get(`/payments/history/${orderId}`),
};

// Wishlist
export const wishlistAPI = {
  get: () => api.get("/wishlist"),
  add: (productId: string) => api.post(`/wishlist/${productId}`),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`),
  check: (productId: string) => api.get(`/wishlist/check/${productId}`),
  clear: () => api.delete("/wishlist"),
};

// Coupons
export const couponsAPI = {
  validate: (code: string, cartTotal: number) => api.post("/coupons/validate", { code, cartTotal }),
};

// Reviews
export const reviewsAPI = {
  getForProduct: (productId: string, page = 1) =>
    api.get(`/reviews/product/${productId}`, { params: { page } }),
  create: (data: { productId: string; rating: number; title?: string; text: string; photos?: string[] }) =>
    api.post("/reviews", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

// Shipping
export const shippingAPI = {
  checkServiceability: (pincode: string) => api.get(`/shipping/check/${pincode}`),
  track: (trackingNumber: string) => api.get(`/shipping/track/${trackingNumber}`),
};

// Search
export const searchAPI = {
  query: (q: string, limit = 20) => api.get("/search", { params: { q, limit } }),
  autocomplete: (q: string) => api.get("/search/autocomplete", { params: { q } }),
};

// Notifications
export const notificationsAPI = {
  list: () => api.get("/notifications"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

// Admin
export const adminAPI = {
  dashboard: () => api.get("/admin/dashboard"),
  getOrders: (page = 1, limit = 20, status?: string) =>
    api.get("/admin/orders", { params: { page, limit, status } }),
  getUsers: (page = 1, limit = 20) => api.get("/admin/users", { params: { page, limit } }),
  updateOrderStatus: (id: string, status: string, note?: string) =>
    api.patch(`/admin/orders/${id}/status`, { status, note }),
  // Products CRUD
  getProducts: (page = 1, limit = 20, search?: string) =>
    api.get("/admin/products", { params: { page, limit, search } }),
  getProduct: (id: string) => api.get(`/admin/products/${id}`),
  createProduct: (data: Record<string, unknown>) => api.post("/admin/products", data),
  updateProduct: (id: string, data: Record<string, unknown>) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  // Categories CRUD
  getCategories: () => api.get("/admin/categories"),
  createCategory: (data: Record<string, unknown>) => api.post("/admin/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  // Inventory
  getInventory: (page = 1, limit = 20, search?: string, lowStock?: boolean) =>
    api.get("/admin/inventory", { params: { page, limit, search, lowStock } }),
  adjustInventory: (productId: string, data: { stockCount?: number; delta?: number; note?: string }) =>
    api.patch(`/admin/inventory/${productId}`, data),
  getInventoryTransactions: (productId: string, limit = 20) =>
    api.get(`/admin/inventory/${productId}/transactions`, { params: { limit } }),
  // Coupons CRUD
  getCoupons: () => api.get("/admin/coupons"),
  createCoupon: (data: Record<string, unknown>) => api.post("/admin/coupons", data),
  updateCoupon: (id: string, data: Record<string, unknown>) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/admin/coupons/${id}`),
  // Analytics
  analytics: (days = 30) => api.get("/admin/analytics", { params: { days } }),
};

// Upload (Azure Blob Storage)
export const uploadAPI = {
  uploadImage: (file: File, folder = "products") => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/upload/image?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadImages: (files: File[], folder = "products") => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    return api.post(`/upload/images?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/upload/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getSasUrl: (folder: string, filename: string, contentType: string) =>
    api.post("/upload/sas-url", { folder, filename, contentType }),
  deleteFile: (key: string) => api.delete(`/upload/${encodeURIComponent(key)}`),
};

export default api;
