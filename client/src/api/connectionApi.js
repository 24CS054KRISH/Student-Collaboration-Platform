import API from './projectApi';

/**
 * Send a connection request to another user.
 * @param {string} receiverId - The ID of the user to connect with
 * @returns {Promise<Object>} The API response data
 */
export const sendConnectionRequest = async (receiverId) => {
    try {
        const response = await API.post('/connections/request', { receiverId });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all connection requests sent by the current user.
 * @param {string} [userId] - Optional user ID
 * @returns {Promise<Object>} The API response data containing sent requests and receiverIds
 */
export const getSentRequests = async (userId) => {
    try {
        const url = userId ? `/connections/sent/${userId}` : '/connections/sent';
        const response = await API.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all pending connection requests received by the logged-in user.
 * @returns {Promise<Object>} The API response data containing requests array
 */
export const getPendingRequests = async () => {
    try {
        const response = await API.get('/connections/pending');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Respond to a connection request (accept or reject).
 * @param {string} requestId - The ID of the connection request
 * @param {'accept' | 'reject'} action - Action to perform on the request
 * @returns {Promise<Object>} The API response data
 */
export const respondConnectionRequest = async (requestId, action) => {
    try {
        const response = await API.put(`/connections/respond/${requestId}`, { action });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch all accepted connection profiles for the logged-in user.
 * @returns {Promise<Object>} The API response data containing connections array
 */
export const getAcceptedConnections = async () => {
    try {
        const response = await API.get('/connections/accepted');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Cancel a pending connection request.
 * @param {string} receiverId - The ID of the target user
 * @returns {Promise<Object>} The API response data
 */
export const cancelConnectionRequest = async (receiverId) => {
    try {
        const response = await API.delete(`/connections/cancel/${receiverId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Remove an existing connection with a target user.
 * @param {string} targetUserId - The ID of the target user
 * @returns {Promise<Object>} The API response data
 */
export const removeConnection = async (targetUserId) => {
    try {
        const response = await API.delete(`/connections/remove/${targetUserId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getTeammateRecommendations = async (projectId) => {
    try {
        const response = await API.get(`/connections/recommendations/${projectId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};






