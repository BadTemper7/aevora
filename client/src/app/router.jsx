import { createBrowserRouter } from "react-router-dom";

import LoadingScreen from "../components/feedback/LoadingScreen";
import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";
import MessageLayout from "../layouts/MessageLayout";
import CommunityLayout from "../layouts/CommunityLayout";
import RouteErrorPage from "../components/feedback/RouteErrorPage";
import GuestRoute from "./guards/GuestRoute";
import ProtectedRoute from "./guards/ProtectedRoute";
import CompleteRegistrationRoute from "./guards/CompleteRegistrationRoute";
import { PAGE_TITLES, ROUTES } from "./config/routes";

/** Code-split a page: the chunk loads when the route is first visited. */
const page = (load) => ({
  lazy: async () => ({ Component: (await load()).default }),
});

const comingSoon = () => import("../pages/ComingSoonPage");

// Only unrelated workspace/gaming features remain placeholders.
const placeholderPaths = [
  ROUTES.gaming,
  ROUTES.workspace,
  ROUTES.calendar,
  ROUTES.tasks,
];

// legal and support pages must be reachable while signed out
const publicPlaceholderPaths = [
  ROUTES.forgotPassword,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.help,
];

const routes = [
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.login, ...page(() => import("../features/auth/pages/LoginPage")) },
          { path: ROUTES.register, ...page(() => import("../features/auth/pages/RegisterPage")) },
        ],
      },
    ],
  },

  {
    element: <CompleteRegistrationRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.completeRegistration, ...page(() => import("../features/auth/pages/CompleteRegistrationPage")) },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, ...page(() => import("../features/social/feed/pages/HomePage")) },
          { path: "/posts/:id", ...page(() => import("../features/social/feed/pages/PostDetailPage")) },
          { path: ROUTES.explore, ...page(() => import("../features/social/pages/ExplorePage")) },
          { path: ROUTES.friends, ...page(() => import("../features/social/pages/FriendsPage")) },
          { path: ROUTES.videos, ...page(() => import("../features/social/pages/VideosPage")) },
          { path: `${ROUTES.videos}/:id`, ...page(() => import("../features/social/pages/VideosPage").then(m => ({ default: m.VideoDetailPage }))) },
          { path: ROUTES.subscriptions, ...page(() => import("../features/social/pages/VideosPage")) },
          { path: ROUTES.watch, ...page(() => import("../features/social/pages/VideosPage")) },
          { path: ROUTES.profile, ...page(() => import("../features/social/pages/ProfilePage")) },
          { path: "/u/:username", ...page(() => import("../features/social/pages/ProfilePage")) },
          { path: ROUTES.settings, ...page(() => import("../features/social/pages/PrivacyPage")) },
          { path: ROUTES.privacySafety, ...page(() => import("../features/social/pages/PrivacyPage")) },
          { path: ROUTES.moderation, ...page(() => import("../features/social/pages/ModerationPage")) },
          ...placeholderPaths.map((path) => ({
            path,
            ...page(comingSoon),
            handle: { title: PAGE_TITLES[path] },
          })),
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [{
      element: <MessageLayout />,
      children: [
        { path: ROUTES.messages, ...page(() => import("../features/social/pages/MessagesPage")) },
        { path: `${ROUTES.messages}/:id`, ...page(() => import("../features/social/pages/MessagesPage")) },
        { path: ROUTES.messageRequests, ...page(() => import("../features/social/pages/MessagesPage")) },
      ],
    }],
  },

  {
    element: <ProtectedRoute />,
    children: [{
      element: <CommunityLayout />,
      children: [
        { path: ROUTES.communities, ...page(() => import("../features/communities/pages/CommunityDiscoveryPage")) },
        { path: `${ROUTES.communities}/invite/:token`, ...page(() => import("../features/communities/pages/CommunityInvitePage")) },
        { path: `${ROUTES.communities}/:id`, ...page(() => import("../features/communities/pages/CommunityPage")) },
        { path: `${ROUTES.communities}/:id/:channelId`, ...page(() => import("../features/communities/pages/CommunityPage")) },
      ],
    }],
  },

  ...publicPlaceholderPaths.map((path) => ({
    path,
    ...page(comingSoon),
    handle: { title: PAGE_TITLES[path], standalone: true },
  })),

  { path: "*", ...page(() => import("../pages/NotFoundPage")) },
];

export const router = createBrowserRouter([
  {
    // shown while the first lazy route loads
    hydrateFallbackElement: <LoadingScreen />,
    errorElement: <RouteErrorPage />,
    children: routes,
  },
]);
