import axios from 'axios';

// Create a reusable Axios instance configured with the backend base URL
const API = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to automatically add the Authorization header with JWT token if it exists in local storage
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const getAllProjects = async (params = {}) => {
    try {
        const response = await API.get('/projects/all', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createProject = async (projectData) => {
    try {
        const response = await API.post('/projects/create', projectData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMyProjects = async (userId) => {
    try {
        const response = await API.get(`/projects/my/${userId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateProject = async (id, projectData) => {
    try {
        const response = await API.put(`/projects/update/${id}`, projectData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteProject = async (id) => {
    try {
        const response = await API.delete(`/projects/delete/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// ─── Project Join Application API Calls ──────────────────────────────────────

export const applyToProject = async (projectId, message = '') => {
    try {
        const response = await API.post(`/projects/apply/${projectId}`, { message });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getReceivedProjectApplications = async () => {
    try {
        const response = await API.get('/projects/applications/received');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMyProjectApplications = async () => {
    try {
        const response = await API.get('/projects/applications/my-applications');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const respondProjectApplication = async (applicationId, action) => {
    try {
        const response = await API.put(`/projects/applications/respond/${applicationId}`, { action });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const withdrawProjectApplication = async (projectId) => {
    try {
        const response = await API.delete(`/projects/applications/cancel/${projectId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default API;

