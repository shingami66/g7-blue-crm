"use client";

import { Search, Bell, UserCircle, LogOut, ChevronDown } from "lucide-react";
import { useAuth, SignInButton, SignOutButton } from "@clerk/nextjs";

export default function Topbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 right-0 z-40 bg-surface border-b border-outline-variant flex justify-between items-center h-16 px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-sm hidden md:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low rounded-full">
          <Bell size={20} />
        </button>
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
            <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
              <SignOutButton redirectUrl="/sign-in">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold leading-[16px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </div>
          </details>
        ) : (
          <SignInButton>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low rounded-full">
              <UserCircle size={20} />
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
