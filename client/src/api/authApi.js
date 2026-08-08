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

/**
 * Fetch all registered users.
 * @returns {Promise<Object>} The API response data containing users array
 */
export const getAllUsers = async () => {
    try {
        const response = await API.get('/auth/users');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Verify current user session via JWT token.
 * @returns {Promise<Object>} The API response data containing current user
 */
export const verifyMe = async () => {
    try {
        const response = await API.get('/auth/me');
        return response.data;
    } catch (error) {
        throw error;
    }
};


