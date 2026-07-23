import { useState } from "react";
import { LoaderCircle, LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Language } from "@/lib/i18n";
import { authRepository, type AuthUser } from "@/repositories/authRepository";

interface AccountMenuProps {
  fallbackName?: string;
  language: Language;
  onNavigate: (path: string) => void;
}

const copy = {
  en: {
    account: "Account",
    avatarLabel: "Open account menu",
    loading: "Loading account…",
    unavailable: "Unable to load account",
    signOut: "Sign out",
    signingOut: "Signing out…",
  },
  zh: {
    account: "账号",
    avatarLabel: "打开账号菜单",
    loading: "正在加载账号…",
    unavailable: "无法加载账号信息",
    signOut: "退出登录",
    signingOut: "正在退出登录…",
  },
} as const;

function initials(user: AuthUser | null, fallbackName?: string) {
  return (user?.username ?? fallbackName)
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AccountMenu({ fallbackName, language, onNavigate }: AccountMenuProps) {
  const text = copy[language];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadUser = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      setUser(await authRepository.me());
    } catch {
      // Keep the menu usable so the owner can still sign out of an expired session.
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await authRepository.logout();
    } finally {
      onNavigate("/login");
    }
  };

  const userInitials = initials(user, fallbackName);

  return (
    <DropdownMenu onOpenChange={(isOpen) => { if (isOpen) void loadUser(); }}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={text.avatarLabel}
          className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white/10 outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          type="button"
        >
          {user?.avatar ? (
            <img alt="" className="size-full object-cover" src={user.avatar} />
          ) : userInitials ? (
            userInitials
          ) : (
            <UserRound className="size-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <div className="px-2.5 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">{text.account}</p>
          {isLoading ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              {text.loading}
            </p>
          ) : user ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{user.username}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{text.unavailable}</p>
          )}
        </div>
        <div className="my-1 h-px bg-border" />
        <DropdownMenuItem
          className="gap-2 px-2.5 py-2 text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
          disabled={isSigningOut}
          onSelect={() => void signOut()}
        >
          {isSigningOut ? <LoaderCircle className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          {isSigningOut ? text.signingOut : text.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
