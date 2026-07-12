"use client";

import { useState } from "react";
import { Search, Bell, UserCircle, LogOut, ChevronDown } from "lucide-react";
import { useAuth, SignInButton, useClerk } from "@clerk/nextjs";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  navigationDictionaryAr,
  navigationDictionaryEn,
} from "@/lib/i18n/dictionaries/navigation";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const locale = useLocale();
  const dictionary =
    locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn;
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-outline-variant bg-surface px-4 sm:px-6">
      {/* Search */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="relative hidden w-full max-w-sm md:block">
          <Search
            size={18}
            className="absolute top-1/2 -translate-y-1/2 text-outline"
            style={{ insetInlineStart: "0.75rem" }}
          />
          <input
            dir="auto"
            type="text"
            placeholder={dictionary.account.search}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 text-[14px] leading-[20px] text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ paddingInlineStart: "2.5rem", paddingInlineEnd: "1rem" }}
          />
        </div>
      </div>

      {/* Actions: language control permanently visible; account menu without duplicate selector */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isSignedIn ? <LocaleSelector /> : null}
        <Button
          aria-label={dictionary.account.notifications}
          className="rounded-full"
          size="icon"
          variant="ghost"
        >
          <Bell size={20} />
        </Button>
        {isSignedIn ? (
          <details className="group relative">
            <summary
              aria-label={dictionary.account.openMenu}
              title={dictionary.account.title}
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
                aria-label={dictionary.account.signOut}
                className="w-full justify-start rounded-none px-3 py-2 text-[12px] leading-[16px]"
                loading={isSigningOut}
                onClick={handleSignOut}
                size="sm"
                style={{ textAlign: "start" }}
                variant="ghost"
              >
                <LogOut
                  className={locale === "ar" ? "scale-x-[-1]" : undefined}
                  size={16}
                />
                <span>
                  {isSigningOut
                    ? dictionary.account.signingOut
                    : dictionary.account.signOut}
                </span>
              </Button>
            </div>
          </details>
        ) : (
          <SignInButton>
            <Button
              aria-label={dictionary.account.signIn}
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
