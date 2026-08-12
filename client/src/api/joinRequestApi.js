import API from './projectApi';

export const sendJoinRequest = async (projectId) => {
    try {
        const response = await API.post('/join-requests/request', { projectId });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMyJoinRequests = async () => {
    try {
        const response = await API.get('/join-requests/my-requests');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getNotifications = async () => {
    try {
        const response = await API.get('/join-requests/notifications');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const markNotificationRead = async (notificationId) => {
    try {
        const response = await API.put(`/join-requests/notifications/${notificationId}/read`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const respondToJoinRequest = async (requestId, action) => {
    try {
        const response = await API.put(`/join-requests/respond/${requestId}`, { action });
        return response.data;
    } catch (error) {
        throw error;
    }
};
