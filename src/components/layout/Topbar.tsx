"use client";

import { Search, Bell, UserCircle } from "lucide-react";

export default function Topbar() {
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
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low rounded-full">
          <UserCircle size={20} />
        </button>
      </div>
    </header>
  );
}
