import axios from "axios";

import { ROUTES } from "../../app/config/routes";

// The session lives in an httpOnly cookie that the browser attaches itself.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 15_000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // an expired or revoked session sends the person back to the login page
    const onAuthPage = [ROUTES.login, ROUTES.register].includes(window.location.pathname);
    if (error.response?.status === 401 && !onAuthPage) window.location.assign(ROUTES.login);
    return Promise.reject(error);
  },
);
