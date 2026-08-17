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

/**
 * Update current user profile.
 * @param {Object} profileData - Updated user profile fields
 * @returns {Promise<Object>} The API response data containing updated user details
 */
export const updateProfile = async (profileData) => {
    try {
        const response = await API.put('/auth/profile', profileData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Fetch single user profile by ID.
 * @param {string} userId - User ID to fetch
 * @returns {Promise<Object>} The API response data containing user object
 */
export const getUserById = async (userId) => {
    try {
        const response = await API.get(`/auth/users/${userId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Upload / change current user's profile photo.
 * @param {File} file - Image file selected by the user
 * @returns {Promise<Object>} API response with updated user
 */
export const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
        // Do NOT set Content-Type manually — axios + browser auto-generates
        // the correct multipart/form-data boundary, which multer requires.
        const response = await API.post('/auth/avatar', formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Remove current user's profile photo from Cloudinary & database.
 * @returns {Promise<Object>} API response with updated user
 */
export const removeAvatar = async () => {
    try {
        const response = await API.delete('/auth/avatar');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Upload / change current user's cover photo.
 * @param {File} file - Image file selected by the user
 * @returns {Promise<Object>} API response with updated user
 */
export const uploadCoverImage = async (file) => {
    const formData = new FormData();
    formData.append('coverImage', file);
    try {
        const response = await API.post('/auth/cover', formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Remove current user's cover photo from Cloudinary & database.
 * @returns {Promise<Object>} API response with updated user
 */
export const removeCoverImage = async () => {
    try {
        const response = await API.delete('/auth/cover');
        return response.data;
    } catch (error) {
        throw error;
    }
};
