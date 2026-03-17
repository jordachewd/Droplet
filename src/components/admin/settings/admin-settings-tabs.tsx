"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTab = window.localStorage.getItem(
      ADMIN_SETTINGS_TAB_STORAGE_KEY,
    );
    if (storedTab && tabs.some((tab) => tab.id === storedTab)) {
      setActiveTabId(storedTab);
      return;
    }

    if (tabs[0]) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_SETTINGS_TAB_STORAGE_KEY, tabId);
    }
  };

  return (
    <div className="AdminSettingsTabs flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Admin settings sections"
      >
        {tabs.map((tab) => {
          const tabPanelId = `admin-settings-panel-${tab.id}`;
          const tabId = `admin-settings-tab-${tab.id}`;
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelId}
              className={`btn btn-sm ${
                isActive ? "btn-contained" : "btn-outlined"
              }`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const tabPanelId = `admin-settings-panel-${tab.id}`;
        const tabId = `admin-settings-tab-${tab.id}`;
        const isActive = tab.id === activeTabId;

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
