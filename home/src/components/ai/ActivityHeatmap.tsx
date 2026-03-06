// src/components/ai/ActivityHeatmap.tsx
// React wrapper for react-activity-calendar

import { useState, useMemo, useRef, useEffect } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'
import dayjs from 'dayjs'

interface DailyUsage {
  date: string
  totalTokens: number
}

interface Props {
  data: DailyUsage[]
  theme?: 'light' | 'dark'
}

export default function ActivityHeatmap({ data, theme = 'light' }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [year, setYear] = useState<number>(() => {
    const years = [...new Set(data.map(d => parseInt(d.date.split('-')[0])))].sort((a, b) => a - b)
    return years[years.length - 1] || new Date().getFullYear()
  })

  // 滚动到当前月的位置
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const currentMonth = new Date().getMonth() // 0-11
      const containerWidth = container.clientWidth
      const totalWidth = container.scrollWidth

      // 计算当前月大约的位置（每个月大约占总宽度的 1/12）
      const monthPosition = (currentMonth / 12) * totalWidth

      // 滚动到当前月位置居中
      container.scrollLeft = monthPosition - containerWidth / 2 + totalWidth / 24
    }
  }, [year])

  // 计算可用的年份
  const years = useMemo(() => {
    return [...new Set(data.map(d => parseInt(d.date.split('-')[0])))].sort((a, b) => a - b)
  }, [data])

  // 过滤当前年份数据
  const yearData = useMemo(() => {
    return data.filter(d => d.date.startsWith(`${year}-`))
  }, [data, year])

  // 转换数据格式并计算 level (基于百分位)
  const calendarData = useMemo(() => {
    const nonZeroTokens = yearData.map(d => d.totalTokens).filter(t => t > 0).sort((a, b) => a - b)

    // 创建有数据的日期 Map
    const dataMap = new Map<string, { count: number; level: number }>()
    for (const d of yearData) {
      const tokens = d.totalTokens
      let level = 0

      if (tokens > 0) {
        const index = nonZeroTokens.indexOf(tokens)
        const percentile = index / nonZeroTokens.length

        if (percentile <= 0.25) level = 1
        else if (percentile <= 0.50) level = 2
        else if (percentile <= 0.75) level = 3
        else level = 4
      }

      dataMap.set(d.date, { count: tokens, level })
    }

    // 生成完整的年份数据（1月1日 - 12月31日）
    const fullYearData: Array<{ date: string; count: number; level: number }> = []
    const startDate = new Date(year, 0, 1) // 1月1日
    const endDate = new Date(year, 11, 31) // 12月31日

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const existing = dataMap.get(dateStr)

      if (existing) {
        fullYearData.push({
          date: dateStr,
          count: existing.count,
          level: existing.level
        })
      } else {
        // 没有数据的日期，添加空数据
        fullYearData.push({
          date: dateStr,
          count: 0,
          level: 0
        })
      }
    }

    return fullYearData
  }, [yearData, year])

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toString()
  }

  // 计算当前年份总 token
  const totalTokens = useMemo(() => {
    return yearData.reduce((sum, d) => sum + d.totalTokens, 0)
  }, [yearData])

  // 主题配置 (GitHub 绿色风格)
  const calendarTheme = {
    light: ['#f5f5f5', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#212121', '#0e4429', '#006d32', '#26a641', '#39d353']
  }

  // 标签配置
  const labels = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    legend: {
      less: 'Less',
      more: 'More'
    }
  }

  const currentIndex = years.indexOf(year)

  return (
    <div className="activity-heatmap w-full">
      {/* Custom tooltip styles */}
      <style>{`
        /* Hide default total count */
        .react-activity-calendar__count,
        [class*="count"] {
          display: none !important;
        }
        /* Scrollable calendar container */
        .activity-heatmap-scrollable {
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }
        /* Tooltip styles */
        .react-activity-calendar__tooltip,
        .react-activity-calendar [class*="tooltip"] {
          background-color: #1f2937 !important;
          color: #ffffff !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        .react-activity-calendar__tooltip::after,
        .react-activity-calendar [class*="tooltip"]::after {
          border-color: #1f2937 transparent transparent transparent !important;
        }
        /* Dark mode tooltip */
        .dark .react-activity-calendar__tooltip,
        .dark .react-activity-calendar [class*="tooltip"] {
          background-color: #374151 !important;
          color: #ffffff !important;
        }
        .dark .react-activity-calendar__tooltip::after,
        .dark .react-activity-calendar [class*="tooltip"]::after {
          border-color: #374151 transparent transparent transparent !important;
        }
      `}</style>
      {/* Year navigator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tokens Activity</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(years[currentIndex - 1])}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous year"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(years[currentIndex + 1])}
            disabled={currentIndex >= years.length - 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next year"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable calendar container */}
      <div
        ref={scrollContainerRef}
        className="activity-heatmap-scrollable"
      >
        <div className="inline-block">
          <ActivityCalendar
            data={calendarData}
            theme={calendarTheme}
            labels={labels}
            colorScheme={theme}
            blockSize={13}
            blockRadius={2}
            blockMargin={3}
            fontSize={12}
            showWeekdayLabels
            showMonthLabels
            tooltips={{
              activity: {
                text: (activity) => {
                  const date = dayjs(activity.date)
                  return `${date.format('YYYY-MM-DD')}: ${formatNumber(activity.count)} Tokens`
                }
              }
            }}
          />
          {/* Spacer to prevent scrollbar from covering content */}
          <div className="pt-2 pb-1"></div>
        </div>
      </div>

      {/* Custom total count (fixed position, not affected by scroll) */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {year}: {formatNumber(totalTokens)} Tokens
      </div>
    </div>
  )
}
