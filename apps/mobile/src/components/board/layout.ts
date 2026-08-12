import { storage } from '@/lib/storage';

export type DashboardWidgetWidth = 'full' | 'half';

export type DashboardWidgetKind =
  | 'netWorth'
  | 'netWorthChart'
  | 'assets'
  | 'incomeSpending'
  | 'recentActivity'
  | 'sankey'
  | 'pie'
  | 'budgets';

export interface DashboardWidgetItem {
  id: string;
  kind: DashboardWidgetKind;
  width: DashboardWidgetWidth;
  showsTitle: boolean;
}

export const STORAGE_KEY = 'harbor.dashboard.widgets.v10';

const ALL_KINDS: DashboardWidgetKind[] = [
  'netWorth',
  'netWorthChart',
  'assets',
  'incomeSpending',
  'recentActivity',
  'sankey',
  'pie',
  'budgets',
];

export const WIDGET_META: Record<
  DashboardWidgetKind,
  {
    title: string;
    systemImage: string;
    detail: string;
    defaultWidth: DashboardWidgetWidth;
    allowsHalfWidth: boolean;
  }
> = {
  netWorth: {
    title: 'Net Worth',
    systemImage: 'dollarsign',
    detail: 'Total net worth at a glance',
    defaultWidth: 'full',
    allowsHalfWidth: false,
  },
  netWorthChart: {
    title: 'Net Worth Chart',
    systemImage: 'chart.line.uptrend.xyaxis',
    detail: 'Net worth over time',
    defaultWidth: 'full',
    allowsHalfWidth: true,
  },
  assets: {
    title: 'Assets',
    systemImage: 'square.stack.3d.up',
    detail: 'Cash, invested, and credit totals',
    defaultWidth: 'half',
    allowsHalfWidth: true,
  },
  incomeSpending: {
    title: 'Income & Spending',
    systemImage: 'arrow.left.arrow.right',
    detail: 'Income and spending this month',
    defaultWidth: 'half',
    allowsHalfWidth: true,
  },
  recentActivity: {
    title: 'Recent Activity',
    systemImage: 'list.bullet',
    detail: 'Latest transactions',
    defaultWidth: 'full',
    allowsHalfWidth: false,
  },
  sankey: {
    title: 'Cash Flow',
    systemImage: 'chart.bar.xaxis',
    detail: 'Income → spending Sankey chart',
    defaultWidth: 'half',
    allowsHalfWidth: true,
  },
  pie: {
    title: 'Spending Pie',
    systemImage: 'chart.pie',
    detail: 'Spending breakdown pie chart',
    defaultWidth: 'half',
    allowsHalfWidth: true,
  },
  budgets: {
    title: 'Budgets',
    systemImage: 'chart.bar.doc.horizontal',
    detail: 'Category budget progress this month',
    defaultWidth: 'full',
    allowsHalfWidth: false,
  },
};

const newId = (): string =>
  `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const createWidget = (
  kind: DashboardWidgetKind,
  width?: DashboardWidgetWidth,
  showsTitle = false
): DashboardWidgetItem => {
  const meta = WIDGET_META[kind];
  let w = width ?? meta.defaultWidth;
  if (!meta.allowsHalfWidth) w = 'full';
  return { id: newId(), kind, width: w, showsTitle };
};

export const defaultLayout = (): DashboardWidgetItem[] => [
  createWidget('netWorth', 'full'),
  createWidget('netWorthChart', 'full'),
  createWidget('assets', 'half'),
  createWidget('incomeSpending', 'half'),
  createWidget('budgets', 'full'),
  createWidget('recentActivity', 'full'),
];

export const packRows = (widgets: DashboardWidgetItem[]): DashboardWidgetItem[][] => {
  const result: DashboardWidgetItem[][] = [];
  let pendingHalf: DashboardWidgetItem | undefined;

  for (const widget of widgets) {
    const useHalf = widget.width === 'half' && WIDGET_META[widget.kind].allowsHalfWidth;
    if (!useHalf) {
      if (pendingHalf) {
        result.push([pendingHalf]);
        pendingHalf = undefined;
      }
      result.push([widget]);
    } else if (pendingHalf) {
      result.push([pendingHalf, widget]);
      pendingHalf = undefined;
    } else {
      pendingHalf = widget;
    }
  }
  if (pendingHalf) result.push([pendingHalf]);
  return result;
};

export const availableToAdd = (widgets: DashboardWidgetItem[]): DashboardWidgetKind[] =>
  ALL_KINDS.filter((kind) => !widgets.some((w) => w.kind === kind));

export const addWidget = (
  widgets: DashboardWidgetItem[],
  kind: DashboardWidgetKind
): DashboardWidgetItem[] => {
  if (!availableToAdd(widgets).includes(kind)) return widgets;
  return [...widgets, createWidget(kind)];
};

export const removeWidget = (widgets: DashboardWidgetItem[], id: string): DashboardWidgetItem[] =>
  widgets.filter((w) => w.id !== id);

export const toggleWidth = (widgets: DashboardWidgetItem[], id: string): DashboardWidgetItem[] =>
  widgets.map((w) => {
    if (w.id !== id) return w;
    if (!WIDGET_META[w.kind].allowsHalfWidth) return w;
    return { ...w, width: w.width === 'full' ? 'half' : 'full' };
  });

export const relocateWidget = (
  widgets: DashboardWidgetItem[],
  id: string,
  destination: number
): DashboardWidgetItem[] => {
  const from = widgets.findIndex((w) => w.id === id);
  if (from < 0) return widgets;
  let to = destination;
  if (to > from) to -= 1;
  to = Math.min(Math.max(to, 0), widgets.length - 1);
  if (from === to) return widgets;
  const next = [...widgets];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Move widget to an absolute index (0…n-1). Prefer this for live drag reordering. */
export const moveWidgetToIndex = (
  widgets: DashboardWidgetItem[],
  id: string,
  finalIndex: number
): DashboardWidgetItem[] => {
  const from = widgets.findIndex((w) => w.id === id);
  if (from < 0) return widgets;
  const to = Math.min(Math.max(finalIndex, 0), widgets.length - 1);
  if (from === to) return widgets;
  const next = [...widgets];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const loadWidgets = async (): Promise<DashboardWidgetItem[]> => {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout();
    const decoded = JSON.parse(raw) as DashboardWidgetItem[];
    if (!Array.isArray(decoded) || decoded.length === 0) return defaultLayout();
    return decoded.map((item) => {
      const meta = WIDGET_META[item.kind];
      if (!meta) return item;
      if (!meta.allowsHalfWidth) return { ...item, width: 'full' };
      return item;
    });
  } catch {
    return defaultLayout();
  }
};

export const persistWidgets = async (widgets: DashboardWidgetItem[]): Promise<void> => {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // ignore persist errors
  }
};
