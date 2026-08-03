// src/components/ai/ClientDashboard.tsx
// Client-side React component for AI Usage Dashboard

import { useState, useEffect, useMemo } from "react";
import ActivityHeatmap from "./ActivityHeatmap.tsx";

interface DailyUsage {
  date: string;
  totalTokens: number;
  modelBreakdowns?: Array<{
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  }>;
}

interface AIUsageData {
  byDevice: Record<
    string,
    {
      byMonth: Record<string, DailyUsage[]>;
    }
  >;
  total: {
    byMonth: Record<string, DailyUsage[]>;
  };
  summary: {
    byModel: Record<string, number>;
    deviceList: string[];
  };
}

interface Props {
  data: string;
  dailyData: string;
  devices: string[];
  locale: string;
  messages: {
    loading: string;
    noData: string;
    noDataHelp: string;
    models: string;
    tokens: string;
    streak: string;
    days: string;
    tokensActivity: string;
    previousYear: string;
    nextYear: string;
    less: string;
    more: string;
  };
}

export default function ClientDashboard({
  data: serializedData,
  dailyData: serializedDailyData,
  devices,
  locale,
  messages,
}: Props) {
  const [currentDevice, setCurrentDevice] = useState("all");
  const [loading, setLoading] = useState(true);

  const usageData: AIUsageData = useMemo(
    () => JSON.parse(serializedData),
    [serializedData]
  );
  const allDailyData: DailyUsage[] = useMemo(
    () => JSON.parse(serializedDailyData),
    [serializedDailyData]
  );

  // Get current device from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const device = url.searchParams.get("device") || "all";
    if (devices.includes(device) || device === "all") {
      setCurrentDevice(device);
    }
    setLoading(false);
  }, [devices]);

  // Listen for device change events from DeviceSelector
  useEffect(() => {
    const handleDeviceChange = (e: CustomEvent) => {
      setCurrentDevice(e.detail.device);
    };

    window.addEventListener(
      "device-change",
      handleDeviceChange as EventListener
    );
    return () => {
      window.removeEventListener(
        "device-change",
        handleDeviceChange as EventListener
      );
    };
  }, []);

  // Get data for current device
  const currentData = useMemo(() => {
    if (currentDevice === "all") {
      return allDailyData;
    }
    const deviceData = usageData.byDevice[currentDevice];
    if (!deviceData) return [];

    const daily: DailyUsage[] = [];
    for (const monthData of Object.values(deviceData.byMonth)) {
      daily.push(...monthData);
    }
    return daily;
  }, [currentDevice, usageData, allDailyData]);

  // Get model statistics
  const modelStats = useMemo(() => {
    let byModel: Record<string, number> = {};

    if (currentDevice === "all") {
      byModel = usageData.summary.byModel;
    } else {
      const deviceData = usageData.byDevice[currentDevice];
      if (!deviceData) return [];

      for (const monthData of Object.values(deviceData.byMonth)) {
        for (const day of monthData) {
          for (const breakdown of day.modelBreakdowns || []) {
            const tokens =
              breakdown.inputTokens +
              breakdown.outputTokens +
              breakdown.cacheReadTokens;
            byModel[breakdown.modelName] =
              (byModel[breakdown.modelName] || 0) + tokens;
          }
        }
      }
    }

    const total = Object.values(byModel).reduce((sum, v) => sum + v, 0);
    if (total === 0) return [];

    return Object.entries(byModel)
      .map(([name, tokens]) => ({
        name,
        tokens,
        percentage: (tokens / total) * 100,
      }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [currentDevice, usageData]);

  // Calculate stats
  const stats = useMemo(() => {
    const sortedData = [...currentData].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const totalTokens = sortedData.reduce((sum, d) => sum + d.totalTokens, 0);
    const dateRange =
      sortedData.length > 0
        ? {
            start: sortedData[0].date,
            end: sortedData[sortedData.length - 1].date,
          }
        : null;

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedByDate = [...currentData]
      .filter(d => d.totalTokens > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    if (sortedByDate.length > 0) {
      const mostRecentDate = new Date(sortedByDate[0].date);
      const daysDiff = Math.floor(
        (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 1) {
        streak = 1;
        let checkDate = mostRecentDate;

        for (let i = 1; i < sortedByDate.length; i++) {
          const prevDate = new Date(sortedByDate[i].date);
          const dayDiff = Math.floor(
            (checkDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (dayDiff === 1) {
            streak++;
            checkDate = prevDate;
          } else {
            break;
          }
        }
      }
    }

    return { totalTokens, dateRange, streak };
  }, [currentData]);

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  // Format date range
  const formatDateRange = (start: string, end: string): string => {
    const [sy, sm, sd] = start.split("-");
    const [ey, em, ed] = end.split("-");
    return `${sy}-${sm}-${sd} ~ ${ey}-${em}-${ed}`;
  };

  // Detect dark mode
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(
        document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    };

    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center lg:col-span-2 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="mb-4 text-4xl">📊</div>
        <h3 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">
          {messages.loading}
        </h3>
      </div>
    );
  }

  if (currentData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center lg:col-span-2 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="mb-4 text-4xl">📊</div>
        <h3 className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">
          {messages.noData}
        </h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          {messages.noDataHelp}{" "}
          <code className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            ai/usages/
          </code>
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-100 p-4 text-left text-sm dark:bg-gray-800">
          ccusage -j &gt; ai/usages/mydevice-$(date +%Y-%m).json
        </pre>
      </div>
    );
  }

  return (
    <>
      {/* Stats Panel */}
      <div className="stats-panel h-fit rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-6 dark:border-gray-700 dark:bg-gray-800">
        {/* Time Range */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {stats.dateRange
              ? formatDateRange(stats.dateRange.start, stats.dateRange.end)
              : messages.noData}
          </p>
        </div>

        {/* Models List */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>🔮</span>
            <span>{messages.models}</span>
          </div>
          {modelStats.length > 0 ? (
            modelStats.map(m => (
              <div
                key={m.name}
                className="flex items-center justify-between py-1.5"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {m.name}
                </span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                  {formatNumber(m.tokens)}{" "}
                  <span className="text-xs text-gray-500">
                    ({m.percentage.toFixed(1)}%)
                  </span>
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">{messages.noData}</div>
          )}
        </div>

        {/* Total Tokens & Streak */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>🪙</span>
              <span>{messages.tokens}</span>
            </div>
            <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(stats.totalTokens)}
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>🔥</span>
              <span>{messages.streak}</span>
            </div>
            <p className="font-mono text-lg font-bold text-orange-600 dark:text-orange-400">
              {stats.streak} {messages.days}
            </p>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="w-full overflow-hidden">
        <ActivityHeatmap
          data={currentData}
          theme={isDark ? "dark" : "light"}
          locale={locale}
          messages={messages}
        />
      </div>
    </>
  );
}
