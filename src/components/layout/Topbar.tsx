"use client";

import { useState } from "react";
import { Search, Bell, UserCircle, LogOut, ChevronDown } from "lucide-react";
import { useAuth, SignInButton, useClerk } from "@clerk/nextjs";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut({ redirectUrl: "/sign-in" });
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-sm hidden md:block">
          <Search
            size={18}
            className="absolute top-1/2 -translate-y-1/2 text-outline"
            style={{ insetInlineStart: "0.75rem" }}
          />
          <input
            dir="auto"
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 text-[14px] leading-[20px] text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "1rem" }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          aria-label="Notifications"
          className="rounded-full"
          size="icon"
          variant="ghost"
        >
          <Bell size={20} />
        </Button>
        {isSignedIn ? (
          <details className="group relative">
            <summary
              aria-label="Open account menu"
              title="Account"
              className="flex cursor-pointer list-none items-center gap-1 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary [&::-webkit-details-marker]:hidden"
            >
              <UserCircle size={20} />
              <ChevronDown
                size={14}
              className="transition-transform group-open:rotate-180"
            />
            </summary>
            <div
              className="absolute top-full z-50 mt-2 w-44 rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
              style={{ insetInlineEnd: 0 }}
            >
              <Button
                aria-label="Sign out"
                className="w-full justify-start rounded-none px-3 py-2 text-[12px] leading-[16px]"
                loading={isSigningOut}
                onClick={handleSignOut}
                size="sm"
                style={{ textAlign: "start" }}
                variant="ghost"
              >
                <LogOut size={16} />
                <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
              </Button>
            </div>
          </details>
        ) : (
          <SignInButton>
            <Button
              aria-label="Sign in"
              className="rounded-full"
              size="icon"
              variant="ghost"
            >
              <UserCircle size={20} />
            </Button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
