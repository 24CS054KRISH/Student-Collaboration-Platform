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

export const getAllProjects = async () => {
    try {
        const response = await API.get('/projects/all');
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

export default API;
