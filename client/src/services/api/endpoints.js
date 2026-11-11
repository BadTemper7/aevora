export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  feed: {
    list: "/feed",
    post: (id) => `/posts/${id}`,
    like: (id) => `/posts/${id}/like`,
    comments: (id) => `/posts/${id}/comments`,
  },
};
