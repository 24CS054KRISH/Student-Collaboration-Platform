import API from './projectApi';

/**
 * Fetch all available channels/conversations for the logged-in user.
 * @returns {Promise<Object>} { success: true, directChats, teamChats }
 */
export const getConversations = async () => {
    try {
        const response = await API.get('/messages/conversations');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch direct messages history with a target peer.
 * @param {string} peerId
 * @returns {Promise<Object>} { success: true, messages }
 */
export const getDirectMessages = async (peerId) => {
    try {
        const response = await API.get(`/messages/direct/${peerId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch project team messages history.
 * @param {string} projectId
 * @returns {Promise<Object>} { success: true, messages }
 */
export const getProjectMessages = async (projectId) => {
    try {
        const response = await API.get(`/messages/project/${projectId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Send a message via REST endpoint.
 * @param {Object} messageData { chatType, receiverId, projectId, content }
 * @returns {Promise<Object>} { success: true, data }
 */
export const sendMessage = async (messageData) => {
    try {
        const response = await API.post('/messages/send', messageData);
        return response.data;
    } catch (error) {
        throw error;
    }
};
