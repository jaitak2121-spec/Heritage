import axios from 'axios';

const normalizeApiBaseUrl = (value) => {
  const baseUrl = value.trim().replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:8000';

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl);

const requireArray = (data, resourceName) => {
  if (!Array.isArray(data)) {
    throw new Error(`The API returned an invalid ${resourceName} response.`);
  }
  return data;
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
  timeout: 10000,
});

export const heritageApi = {
  // Heritage Sites
  getSites: async (params = {}) => {
    const response = await apiClient.get('/sites', { params });
    return requireArray(response.data, 'heritage sites');
  },

  getSiteById: async (id) => {
    const response = await apiClient.get(`/sites/${id}`);
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
    const response = await apiClient.get('/map/markers');
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
    const response = await apiClient.get('/documents', { params });
    return requireArray(response.data, 'documents');
  },

  getDocumentById: async (id) => {
    const response = await apiClient.get(`/documents/${id}`);
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

  // AI Cultural Heritage Assistant
  askAssistant: async (payload) => {
    const response = await apiClient.post('/assistant/chat', payload);
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default heritageApi;
