import API from './projectApi';

/**
 * Register a new user.
 * @param {Object} userData - User registration details (fullName, email, password, college, branch, year)
 * @returns {Promise<Object>} The API response data
 */
export const registerUser = async (userData) => {
    try {
        const response = await API.post('/auth/register', userData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Log in an existing user.
 * @param {Object} userData - User login credentials (email, password)
 * @returns {Promise<Object>} The API response data containing token and user details
 */
export const loginUser = async (userData) => {
    try {
        const response = await API.post('/auth/login', userData);
        return response.data;
    } catch (error) {
        throw error;
    }
};
