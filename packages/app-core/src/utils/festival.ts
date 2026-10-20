import { festivalConfigList } from '../config/modules/festival'

// 纯函数，避免 setting store 与 useCeremony 循环依赖
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 判断日期是否在节日范围内
 * @param currentDate 当前日期
 * @param festivalDate 节日开始日期
 * @param festivalEndDate 节日结束日期（可选）
 */
export function isDateInFestivalRange(
  currentDate: string,
  festivalDate: string,
  festivalEndDate?: string
): boolean {
  if (!festivalEndDate) {
    // 单日节日
    return currentDate === festivalDate
  }

  // 区间节日
  const current = new Date(currentDate)
  const start = new Date(festivalDate)
  const end = new Date(festivalEndDate)

  return current >= start && current <= end
}

/**
 * 获取当前日期对应的节日配置
 */
export function findCurrentFestival() {
  const currentDate = formatDate(new Date())
  return festivalConfigList.find((item) =>
    isDateInFestivalRange(currentDate, item.date, item.endDate)
  )
}
