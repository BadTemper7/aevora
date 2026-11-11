import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";

import { ROUTES } from "../../app/config/routes";
import ThemeToggle from "../../components/common/ThemeToggle";
import Avatar from "../../components/ui/Avatar";
import Dropdown, {
  DropdownDivider,
  DropdownItem,
} from "../../components/ui/Dropdown";
import { useAuth } from "../../features/auth/hooks/useAuth";

export default function UserMenu() {
  const { user, signOut } = useAuth();

  return (
    <Dropdown
      trigger={({ toggle, props }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Open account menu"
          className="flex items-center gap-1.5 rounded-xl p-1 pr-2 transition-colors hover:bg-raised"
          {...props}
        >
          <Avatar name={user?.name} size="sm" />
          <ChevronDown className="size-4 text-ink-soft" aria-hidden="true" />
        </button>
      )}
    >
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
        <p className="truncate text-[13px] text-ink-soft">@{user?.username}</p>
      </div>

      <DropdownDivider />
      <DropdownItem icon={UserRound} to={ROUTES.profile}>
        Your profile
      </DropdownItem>
      <DropdownItem icon={Settings} to={ROUTES.settings}>
        Settings
      </DropdownItem>

      <DropdownDivider />
      <div data-keep-open className="px-2 py-1.5">
        <p className="mb-2 px-1 text-xs font-semibold text-ink-soft">Theme</p>
        <ThemeToggle variant="segmented" />
      </div>

      <DropdownDivider />
      <DropdownItem icon={LogOut} danger onClick={signOut}>
        Log out
      </DropdownItem>
    </Dropdown>
  );
}
