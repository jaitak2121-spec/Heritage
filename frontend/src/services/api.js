import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
    return response.data;
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
    return response.data;
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
    return response.data;
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
