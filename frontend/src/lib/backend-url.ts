/**
 * The internal backend API URL used by BFF proxy routes (server-side only).
 * This is NOT exposed to the browser.
 */
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api';
