import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 300000, // 5m timeout for deep analysis & remote brain latency
});

// Retry Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // Retry only for network errors or 5xx server errors on GET requests
        if (config && config.method === 'get' && (!response || response.status >= 500) && !config._retry) {
            config._retry = true;
            config.__retryCount = config.__retryCount || 0;

            if (config.__retryCount < MAX_RETRIES) {
                config.__retryCount += 1;
                console.warn(`[API] Retrying request... (${config.__retryCount}/${MAX_RETRIES})`);

                // Exponential backoff
                const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
                await new Promise(resolve => setTimeout(resolve, delay));

                return apiClient(config);
            }
        }

        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);
