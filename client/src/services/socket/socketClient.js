let current = null;
const listeners = new Set();
export const getSocialSocket = () => current;
export const subscribeSocialSocket = (listener) => { listeners.add(listener); listener(current); return () => listeners.delete(listener); };
export const setSocialSocket = (socket) => { current = socket; listeners.forEach((listener) => listener(current)); };
