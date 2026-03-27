"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import Button from "@/components/shared/button";

interface AdminSettingsTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface AdminSettingsTabsProps {
  tabs: AdminSettingsTab[];
}

const ADMIN_SETTINGS_TAB_STORAGE_KEY = "droplet-admin-settings-active-tab";

export function AdminSettingsTabs({ tabs }: AdminSettingsTabsProps) {
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? "");
  const resolvedActiveTabId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : (tabs[0]?.id ?? "");

  useEffect(() => {
    const storedTab = window.localStorage.getItem(
      ADMIN_SETTINGS_TAB_STORAGE_KEY,
    );

    if (!(storedTab && tabs.some((tab) => tab.id === storedTab))) {
      return;
    }

    const restoreTimer = window.setTimeout(() => {
      setActiveTabId(storedTab);
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);
    };
  }, [tabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_SETTINGS_TAB_STORAGE_KEY, tabId);
    }
  };

  const focusAndActivateTabAtIndex = (nextIndex: number) => {
    const nextTab = tabs[nextIndex];

    if (!nextTab) {
      return;
    }

    handleTabChange(nextTab.id);

    if (typeof document === "undefined") {
      return;
    }

    const tabButton = document.getElementById(
      `admin-settings-tab-${nextTab.id}`,
    );

    if (tabButton instanceof HTMLButtonElement) {
      tabButton.focus();
    }
  };

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) {
      return;
    }

    const activeIndex = tabs.findIndex((tab) => tab.id === resolvedActiveTabId);
    const fallbackIndex = activeIndex === -1 ? 0 : activeIndex;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAndActivateTabAtIndex((fallbackIndex + 1) % tabs.length);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAndActivateTabAtIndex(
        (fallbackIndex - 1 + tabs.length) % tabs.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusAndActivateTabAtIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusAndActivateTabAtIndex(tabs.length - 1);
    }
  };

  return (
    <div className="AdminSettingsTabs flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Admin settings sections"
        onKeyDown={handleTabListKeyDown}
      >
        {tabs.map((tab) => {
          const tabPanelId = `admin-settings-panel-${tab.id}`;
          const tabId = `admin-settings-tab-${tab.id}`;
          const isActive = tab.id === resolvedActiveTabId;

          return (
            <Button
              key={tab.id}
              id={tabId}
              type="button"
              size="sm"
              variant={isActive ? "contained" : "outlined"}
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const tabPanelId = `admin-settings-panel-${tab.id}`;
        const tabId = `admin-settings-tab-${tab.id}`;
        const isActive = tab.id === resolvedActiveTabId;

        return (
          <div
            key={tab.id}
            id={tabPanelId}
            role="tabpanel"
            aria-labelledby={tabId}
            aria-hidden={!isActive}
            hidden={!isActive}
            className={isActive ? "block" : "hidden"}
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}
