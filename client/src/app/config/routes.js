/** Single source of truth for URLs. Import ROUTES instead of typing paths. */
export const ROUTES = {
  home: "/",

  // auth
  login: "/login",
  register: "/register",
  completeRegistration: "/complete-registration",
  forgotPassword: "/forgot-password",

  // main
  explore: "/explore",
  friends: "/friends",
  messages: "/messages",
  messageRequests: "/message-requests",

  // discover
  videos: "/videos",
  subscriptions: "/subscriptions",
  watch: "/watch",
  gaming: "/gaming",
  communities: "/communities",

  // workspace
  workspace: "/workspace",
  calendar: "/calendar",
  tasks: "/tasks",

  // account
  profile: "/profile",
  privacySafety: "/privacy-safety",
  moderation: "/moderation",
  settings: "/settings",

  // legal / support
  terms: "/terms",
  privacy: "/privacy",
  help: "/help",
};

/** Titles for pages that exist in navigation but are not built yet. */
export const PAGE_TITLES = {
  [ROUTES.forgotPassword]: "Reset password",
  [ROUTES.explore]: "Explore",
  [ROUTES.friends]: "Friends",
  [ROUTES.messages]: "Messages",
  [ROUTES.videos]: "Short videos",
  [ROUTES.watch]: "Watch",
  [ROUTES.gaming]: "Gaming",
  [ROUTES.communities]: "Communities",
  [ROUTES.workspace]: "Company",
  [ROUTES.calendar]: "Calendar",
  [ROUTES.tasks]: "Tasks",
  [ROUTES.profile]: "Profile",
  [ROUTES.settings]: "Settings",
  [ROUTES.terms]: "Terms of service",
  [ROUTES.privacy]: "Privacy policy",
  [ROUTES.help]: "Help centre",
};
