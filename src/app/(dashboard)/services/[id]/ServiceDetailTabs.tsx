"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type ServiceDetailTab = "overview" | "eventTasks";

type ServiceDetailTabsProps = {
  labels: {
    navigationLabel: string;
    overview: string;
    eventTasks: string;
  };
  isRtl: boolean;
  overview: ReactNode;
  eventTasks: ReactNode;
};

const TAB_ORDER: ServiceDetailTab[] = ["overview", "eventTasks"];

export default function ServiceDetailTabs({
  labels,
  isRtl,
  overview,
  eventTasks,
}: ServiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<ServiceDetailTab>("overview");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const tabIds = {
    overview: `${id}-overview-tab`,
    eventTasks: `${id}-event-tasks-tab`,
  };
  const panelIds = {
    overview: `${id}-overview-panel`,
    eventTasks: `${id}-event-tasks-panel`,
  };

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: ServiceDetailTab,
  ) {
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    let nextIndex: number | null = null;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TAB_ORDER.length - 1;
    } else if (event.key === (isRtl ? "ArrowLeft" : "ArrowRight")) {
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (event.key === (isRtl ? "ArrowRight" : "ArrowLeft")) {
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = TAB_ORDER[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  }

  function renderTab(tab: ServiceDetailTab, label: string, index: number) {
    const selected = activeTab === tab;

    return (
      <button
        key={tab}
        ref={(element) => {
          tabRefs.current[index] = element;
        }}
        type="button"
        id={tabIds[tab]}
        role="tab"
        aria-selected={selected}
        aria-controls={panelIds[tab]}
        tabIndex={selected ? 0 : -1}
        onClick={() => setActiveTab(tab)}
        onKeyDown={(event) => handleTabKeyDown(event, tab)}
        className={`min-w-0 flex-1 basis-36 border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
          selected
            ? "border-primary bg-surface-container-low text-primary"
            : "border-transparent text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-5">
      <div
        className="flex min-w-0 max-w-full flex-wrap border-b border-outline-variant"
        role="tablist"
        aria-label={labels.navigationLabel}
      >
        {renderTab("overview", labels.overview, 0)}
        {renderTab("eventTasks", labels.eventTasks, 1)}
      </div>

      <section
        id={panelIds.overview}
        role="tabpanel"
        aria-labelledby={tabIds.overview}
        tabIndex={0}
        hidden={activeTab !== "overview"}
        className="min-w-0 max-w-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {overview}
      </section>
      <section
        id={panelIds.eventTasks}
        role="tabpanel"
        aria-labelledby={tabIds.eventTasks}
        tabIndex={0}
        hidden={activeTab !== "eventTasks"}
        className="min-w-0 max-w-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {eventTasks}
      </section>
    </div>
  );
}
