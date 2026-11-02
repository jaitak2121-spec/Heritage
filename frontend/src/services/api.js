import axios from 'axios';

const normalizeApiBaseUrl = (value) => {
  const baseUrl = value.trim().replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:8000';

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl);
const CURATOR_TOKEN_KEY = 'heritagelens.curator.session';

export const isCuratorAuthenticated = () => Boolean(window.sessionStorage.getItem(CURATOR_TOKEN_KEY));

export const logoutCurator = () => {
  window.sessionStorage.removeItem(CURATOR_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent('curator:auth-changed'));
};

const requireArray = (data, resourceName) => {
  if (!Array.isArray(data)) {
    throw new Error(`The API returned an invalid ${resourceName} response.`);
  }
  return data;
};

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const isTransientError = (error) => (
  error.code === 'ECONNABORTED'
  || !error.response
  || error.response.status === 429
  || error.response.status >= 500
);

const getWithColdStartRetry = async (url, config = {}) => {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await apiClient.get(url, config);
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === maxAttempts) throw error;
      await wait(attempt * 1200);
    }
  }

  throw lastError;
};

export const getApiErrorMessage = (error, fallbackMessage = 'The HeritageLens API request failed.') => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return `${fallbackMessage} Server response: ${detail}`;
  }

  if (error.response) {
    return `${fallbackMessage} The server returned HTTP ${error.response.status}.`;
  }

  if (error.code === 'ECONNABORTED') {
    return `${fallbackMessage} The request to ${API_BASE_URL} timed out.`;
  }

  if (error.request) {
    return `${fallbackMessage} The browser could not reach ${API_BASE_URL}. Check the deployment URL and CORS configuration.`;
  }

  return error.message || fallbackMessage;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Render free services can need close to a minute to wake from an idle spin-down.
  // Three safe GET attempts provide that window without retrying write operations.
  timeout: 25000,
});

apiClient.interceptors.request.use((config) => {
  const token = window.sessionStorage.getItem(CURATOR_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.sessionStorage.getItem(CURATOR_TOKEN_KEY)) {
      logoutCurator();
      window.dispatchEvent(new CustomEvent('curator:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export const heritageApi = {
  loginCurator: async (password) => {
    const response = await apiClient.post('/auth/login', { password });
    window.sessionStorage.setItem(CURATOR_TOKEN_KEY, response.data.access_token);
    window.dispatchEvent(new CustomEvent('curator:auth-changed'));
    return response.data;
  },

  // Heritage Sites
  getSites: async (params = {}) => {
    const response = await getWithColdStartRetry('/sites', { params });
    return requireArray(response.data, 'heritage sites');
  },

  getSiteById: async (id) => {
    const response = await getWithColdStartRetry(`/sites/${id}`);
    return response.data;
  },

  createSite: async (siteData) => {
    const response = await apiClient.post('/sites', siteData);
    return response.data;
  },

  updateSite: async (id, siteData) => {
    const response = await apiClient.put(`/sites/${id}`, siteData);
    return response.data;
  },

  deleteSite: async (id) => {
    const response = await apiClient.delete(`/sites/${id}`);
    return response.data;
  },

  // Map Markers
  getMapMarkers: async () => {
    const response = await getWithColdStartRetry('/map/markers');
    return requireArray(response.data, 'map markers');
  },

  // Archival Documents & OCR
  uploadDocument: async (formData) => {
    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
    return response.data;
  },

  getDocuments: async (params = {}) => {
    const response = await getWithColdStartRetry('/documents', { params });
    return requireArray(response.data, 'documents');
  },

  getDocumentById: async (id) => {
    const response = await getWithColdStartRetry(`/documents/${id}`);
    return response.data;
  },

  updateDocument: async (id, data) => {
    const response = await apiClient.put(`/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },

  getDocumentDownloadUrl: (id) => `${API_BASE_URL}/documents/${id}/download`,

  searchArchive: async (params) => {
    const response = await getWithColdStartRetry('/search', { params });
    if (!Array.isArray(response.data?.sites) || !Array.isArray(response.data?.documents)) {
      throw new Error('The API returned an invalid archive search response.');
    }
    return response.data;
  },

  // AI Cultural Heritage Assistant
  askAssistant: async (payload) => {
    const response = await apiClient.post('/assistant/chat', payload);
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await getWithColdStartRetry('/health');
    return response.data;
  },
};

export default heritageApi;
