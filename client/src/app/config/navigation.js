import {
  Building2,
  CalendarDays,
  Clapperboard,
  Compass,
  Gamepad2,
  House,
  MessageCircle,
  Play,
  SquareCheck,
  Users,
  UsersRound,
  TvMinimalPlay,
  Shield,
  UserRound,
} from "lucide-react";

import { ROUTES } from "./routes";

/** Sidebar navigation (desktop). */
export const NAV_GROUPS = [
  {
    id: "main",
    title: "Main",
    items: [
      { label: "Home", icon: House, path: ROUTES.home },
      { label: "Explore", icon: Compass, path: ROUTES.explore },
      { label: "Friends", icon: Users, path: ROUTES.friends },
      { label: "Messages", icon: MessageCircle, path: ROUTES.messages },
      { label: "Privacy & Safety", icon: Shield, path: ROUTES.privacySafety },
    ],
  },
  {
    id: "discover",
    title: "Discover",
    items: [
      { label: "Short videos", icon: Clapperboard, path: ROUTES.videos },
      { label: "Subscriptions", icon: TvMinimalPlay, path: ROUTES.subscriptions },
      { label: "Gaming", icon: Gamepad2, path: ROUTES.gaming },
      { label: "Communities", icon: UsersRound, path: ROUTES.communities },
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    items: [
      { label: "Company", icon: Building2, path: ROUTES.workspace },
      { label: "Calendar", icon: CalendarDays, path: ROUTES.calendar },
      { label: "Tasks", icon: SquareCheck, path: ROUTES.tasks },
    ],
  },
];

/** Bottom tab bar (mobile). The middle slot is the "create" action. */
export const MOBILE_NAV = [
  { label: "Home", icon: House, path: ROUTES.home },
  { label: "Explore", icon: Compass, path: ROUTES.explore },
  { label: "Create", action: "create" },
  { label: "Messages", icon: MessageCircle, path: ROUTES.messages },
  { label: "Profile", icon: UserRound, path: ROUTES.profile },
];
