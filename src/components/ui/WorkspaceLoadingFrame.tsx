"use client";

import type { Locale } from "@/lib/i18n/locales";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import WorkspaceSkeleton, {
  resolveWorkspaceSkeletonVariant,
} from "./WorkspaceSkeleton";

export default function WorkspaceLoadingFrame({
  locale,
}: {
  locale: Locale;
}) {
  const pathname = usePathname() ?? "/";
  const [revealed, setRevealed] = useState(false);
  const shared = getSharedUiStates(locale);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <WorkspaceSkeleton
      label={shared.loading.workspace}
      revealed={revealed}
      variant={resolveWorkspaceSkeletonVariant(pathname)}
    />
  );
}
