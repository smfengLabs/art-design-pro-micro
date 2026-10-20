export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BreakpointConfig {
  threshold: number
  fallback: number
}

const BREAKPOINT_CONFIG: Record<ResponsiveBreakpoint, BreakpointConfig | null> = {
  xs: { threshold: 12, fallback: 24 }, // 手机：小于 12 时使用满宽
  sm: { threshold: 12, fallback: 12 }, // 平板：小于 12 时使用半宽
  md: { threshold: 8, fallback: 8 }, // 中等屏幕：小于 8 时使用三分之一宽
  lg: null, // 大屏幕：直接使用设置的 span
  xl: null // 超大屏幕：直接使用设置的 span
}

export function calculateResponsiveSpan(
  itemSpan: number | undefined,
  defaultSpan: number,
  breakpoint: ResponsiveBreakpoint
): number {
  const finalSpan = itemSpan ?? defaultSpan
  const config = BREAKPOINT_CONFIG[breakpoint]

  if (!config) {
    return finalSpan
  }

  return finalSpan >= config.threshold ? finalSpan : config.fallback
}

export function createResponsiveSpanCalculator(defaultSpan: number) {
  return (itemSpan: number | undefined, breakpoint: ResponsiveBreakpoint): number => {
    return calculateResponsiveSpan(itemSpan, defaultSpan, breakpoint)
  }
}
