import axios from 'axios';

// Create an axios instance with default configuration
const axiosClient = axios.create({
  baseURL: '', // Will use relative URLs which will be resolved against the current domain
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to all requests
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common response patterns
axiosClient.interceptors.response.use(
  (response) => {
    // Return only the data part of the response
    return response.data;
  },
  (error) => {
    // Handle common error responses
    if (error.response) {
      const { status } = error.response;
      
      // Handle 401 Unauthorized
      if (status === 401) {
        // Clear user token and redirect to login
        localStorage.removeItem('userToken');
        // In a real app, you might want to redirect to login page
        // window.location.href = '/login';
      }
      
      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Access forbidden - you do not have permission to access this resource');
      }
      
      // Handle 404 Not Found
      if (status === 404) {
        console.error('Resource not found');
      }
      
      // Handle 5xx server errors
      if (status >= 500) {
        console.error('Server error - please try again later');
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection');
    } else {
      // Other errors
      console.error('An error occurred:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;