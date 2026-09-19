import API from './projectApi';

/**
 * Global Search API
 * Calls GET /api/search/global?q=<query>
 *
 * @param {string} query
 * @returns {Promise<{success: boolean, projects: Array, students: Array, connections: Array, chats: Array}>}
 */
export const getGlobalSearch = async (query) => {
    try {
        const response = await API.get('/search/global', {
            params: { q: query }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export default {
    getGlobalSearch
};
