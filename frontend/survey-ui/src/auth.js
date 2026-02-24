// Authentication utilities for JWT token management

const API_BASE_URL = '/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'survey_access_token';
const REFRESH_TOKEN_KEY = 'survey_refresh_token';

/**
 * Get stored access token
 */
export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Store tokens in localStorage
 */
export const setTokens = (access, refresh) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
};

/**
 * Remove tokens from localStorage
 */
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAccessToken();
};

/**
 * Login and store tokens
 */
export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error de autenticación');
    }

    const data = await response.json();
    setTokens(data.access, data.refresh);
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    setTokens(data.access, null); // Refresh token remains the same
    return data.access;
  } catch (error) {
    clearTokens();
    throw error;
  }
};

/**
 * Logout and clear tokens
 */
export const logout = () => {
  clearTokens();
};

/**
 * Refresh access token once if we have a refresh token (e.g. on app load).
 * Use before the first authenticated requests to avoid initial 401s.
 */
export const ensureFreshToken = async () => {
  if (!getRefreshToken()) return;
  try {
    await refreshAccessToken();
  } catch {
    // Refresh failed; subsequent requests will 401 and retry or redirect to login
  }
};

/**
 * Make authenticated API request with automatic token refresh
 */
export const authenticatedFetch = async (url, options = {}) => {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    throw new Error('No authentication token available');
  }

  // Add Authorization header
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401) {
    try {
      const newAccessToken = await refreshAccessToken();
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (refreshError) {
      // Refresh failed, redirect to login or handle error
      clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
};

