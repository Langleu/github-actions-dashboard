// Utility functions for GitHub Actions Dashboard

/**
 * Fetch with timeout and retry
 * @param {string} url
 * @param {object} options
 * @param {number} timeout
 * @param {number} retries
 * @returns {Promise<Response>}
 */
export function fetchWithTimeoutAndRetry(url, options = {}, timeout = 8000, retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            fetch(url, { ...options, signal: controller.signal })
                .then(res => {
                    clearTimeout(id);
                    if (!res.ok) throw new Error('HTTP error');
                    resolve(res);
                })
                .catch(err => {
                    clearTimeout(id);
                    if (n > 0) {
                        setTimeout(() => attempt(n - 1), 500);
                    } else {
                        reject(err);
                    }
                });
        };
        attempt(retries);
    });
}
