import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brand, surface, theme } from '@/theme/tokens';
import { format } from '@/lib/format';
import type { CashFlowLink, CashFlowNode, CashFlowSankeyData } from '@/lib/types';

type Props = {
  data: CashFlowSankeyData;
  highlightedNodeID?: string | null;
  compact?: boolean;
};

type PreparedSankey = {
  sourceNodes: CashFlowNode[];
  outflowNodes: CashFlowNode[];
  links: CashFlowLink[];
  mode: 'incomeToSpending' | 'spendingOnly';
};

type LaidOutNode = { id: string; x: number; y: number; w: number; h: number; color: string };
type LaidOutLabel = {
  id: string;
  title: string;
  amount: number;
  minY: number;
  height: number;
};
type LaidOutLink = {
  id: string;
  sourceID: string;
  targetID: string;
  d: string;
  color: string;
  gx1: number;
  gy1: number;
  gx2: number;
  gy2: number;
};

const MAX_EXPENSE_NODES = 6;

const prepare = (data: CashFlowSankeyData): PreparedSankey => {
  const expenses = data.outflowNodes.filter((n) => n.kind === 'expense');
  const leftover = data.outflowNodes.find((n) => n.kind === 'leftover');

  let outflow: CashFlowNode[] = [];
  if (expenses.length > MAX_EXPENSE_NODES) {
    const head = expenses.slice(0, MAX_EXPENSE_NODES - 1);
    const tail = expenses.slice(MAX_EXPENSE_NODES - 1);
    const otherAmount = tail.reduce((s, n) => s + n.amount, 0);
    outflow = [...head];
    if (otherAmount > 0) {
      outflow.push({
        id: 'out-other-grouped',
        title: 'Other',
        amount: otherAmount,
        systemImage: 'ellipsis.circle',
        kind: 'expense',
      });
    }
  } else {
    outflow = expenses;
  }
  if (leftover && leftover.amount > 0) outflow.push(leftover);

  const incomeTotal = data.incomeNodes.reduce((s, n) => s + n.amount, 0);
  if (incomeTotal > 0) {
    const source: CashFlowNode = {
      id: 'in-total',
      title: data.incomeNodes.length === 1 ? data.incomeNodes[0].title : 'Income',
      amount: incomeTotal,
      systemImage: 'arrow.down.circle',
      kind: 'income',
    };
    return {
      sourceNodes: [source],
      outflowNodes: outflow,
      links: outflow.map((o) => ({
        id: `${source.id}->${o.id}`,
        sourceID: source.id,
        targetID: o.id,
        amount: o.amount,
      })),
      mode: 'incomeToSpending',
    };
  }

  if (outflow.length === 0) {
    return { sourceNodes: [], outflowNodes: [], links: [], mode: 'spendingOnly' };
  }

  const spendingTotal = outflow.reduce((s, n) => s + n.amount, 0);
  const source: CashFlowNode = {
    id: 'in-spending',
    title: 'Spending',
    amount: spendingTotal,
    systemImage: 'arrow.up.circle',
    kind: 'expense',
  };
  return {
    sourceNodes: [source],
    outflowNodes: outflow,
    links: outflow.map((o) => ({
      id: `${source.id}->${o.id}`,
      sourceID: source.id,
      targetID: o.id,
      amount: o.amount,
    })),
    mode: 'spendingOnly',
  };
};

const nodeColor = (node: CashFlowNode, index: number, mode: PreparedSankey['mode']): string => {
  if (node.kind === 'income') return brand.inflow;
  if (node.kind === 'leftover') return brand.accent;
  if (node.id === 'in-spending') return brand.outflowSource;
  return brand.expensePalette[index % brand.expensePalette.length];
};

const ribbonPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  thickness: number
): string => {
  const midX = (startX + endX) / 2;
  return [
    `M ${startX} ${startY}`,
    `C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`,
    `L ${endX} ${endY + thickness}`,
    `C ${midX} ${endY + thickness} ${midX} ${startY + thickness} ${startX} ${startY + thickness}`,
    'Z',
  ].join(' ');
};

const layout = (
  prepared: PreparedSankey,
  canvasWidth: number,
  nodeWidth: number,
  gap: number,
  minNodeHeight: number,
  maxChartHeight?: number
) => {
  const outflows = prepared.outflowNodes;
  const outflowTotal = Math.max(
    outflows.reduce((s, n) => s + n.amount, 0),
    0.0001
  );
  const gapTotal = gap * Math.max(outflows.length - 1, 0);

  let heights: number[];
  let bodyHeight: number;
  let chartHeight: number;

  if (maxChartHeight != null) {
    const body = Math.max(maxChartHeight - gapTotal, 1);
    heights = outflows.map((n) => (n.amount / outflowTotal) * body);
    bodyHeight = heights.reduce((a, b) => a + b, 0);
    chartHeight = maxChartHeight;
  } else {
    const idealBody = Math.max(outflows.length * 44, 120);
    heights = outflows.map((n) => Math.max((n.amount / outflowTotal) * idealBody, minNodeHeight));
    const heightSum = heights.reduce((a, b) => a + b, 0);
    if (heightSum > idealBody * 1.8) {
      const scale = (idealBody * 1.35) / heightSum;
      heights = heights.map((h) => Math.max(h * scale, 22));
    }
    bodyHeight = heights.reduce((a, b) => a + b, 0);
    chartHeight = bodyHeight + gapTotal;
  }

  const leftX = 0;
  const rightX = Math.max(canvasWidth - nodeWidth, nodeWidth);
  const rightNodes: LaidOutNode[] = [];
  const rightLabels: LaidOutLabel[] = [];
  let y = 0;
  outflows.forEach((node, index) => {
    const h = heights[index];
    rightNodes.push({
      id: node.id,
      x: rightX,
      y,
      w: nodeWidth,
      h,
      color: nodeColor(node, index, prepared.mode),
    });
    rightLabels.push({
      id: node.id,
      title: node.title,
      amount: node.amount,
      minY: y,
      height: h,
    });
    y += h + gap;
  });

  const leftNodes: LaidOutNode[] = [];
  const leftLabels: LaidOutLabel[] = [];
  const source = prepared.sourceNodes[0];
  if (source) {
    leftNodes.push({
      id: source.id,
      x: leftX,
      y: 0,
      w: nodeWidth,
      h: bodyHeight,
      color: nodeColor(source, 0, prepared.mode),
    });
    leftLabels.push({
      id: source.id,
      title: source.title,
      amount: source.amount,
      minY: 0,
      height: bodyHeight,
    });
  }

  const links: LaidOutLink[] = [];
  const left = leftNodes[0];
  if (left) {
    let sourceY = 0;
    for (const right of rightNodes) {
      const thickness = right.h;
      const d = ribbonPath(left.x + left.w, sourceY, right.x, right.y, thickness);
      links.push({
        id: `${left.id}->${right.id}`,
        sourceID: left.id,
        targetID: right.id,
        d,
        color: right.color,
        gx1: left.x + left.w,
        gy1: sourceY + thickness / 2,
        gx2: right.x,
        gy2: right.y + thickness / 2,
      });
      sourceY += thickness;
    }
  }

  return {
    nodes: [...leftNodes, ...rightNodes],
    links,
    leftLabels,
    rightLabels,
    chartHeight,
  };
};

export function Sankey({ data, highlightedNodeID, compact = false }: Props) {
  const nodeWidth = compact ? 10 : 14;
  const labelWidth = compact ? 0 : 96;
  const columnGap = compact ? 0 : 10;
  const nodeGap = compact ? 4 : 10;
  const minNodeHeight = compact ? 10 : 30;
  const compactChartHeight = theme.halfTileCardHeight - 20;

  const prepared = useMemo(() => prepare(data), [data]);
  const [width, setWidth] = useState(0);

  if (prepared.sourceNodes.length === 0 && prepared.outflowNodes.length === 0) {
    return null;
  }

  const canvasWidth = Math.max(width - 2 * labelWidth - 2 * columnGap, nodeWidth * 2 + 40);

  const laidOut = layout(
    prepared,
    canvasWidth,
    nodeWidth,
    nodeGap,
    minNodeHeight,
    compact ? compactChartHeight : undefined
  );

  const shouldDimNode = (id: string) => highlightedNodeID != null && id !== highlightedNodeID;
  const shouldDimLink = (link: LaidOutLink) =>
    highlightedNodeID != null &&
    link.sourceID !== highlightedNodeID &&
    link.targetID !== highlightedNodeID;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[styles.row, { height: laidOut.chartHeight }]}>
      {!compact ? (
        <View style={{ width: labelWidth }}>
          {laidOut.leftLabels.map((node) => (
            <View
              key={node.id}
              style={{
                position: 'absolute',
                top: node.minY,
                height: node.height,
                width: labelWidth,
                justifyContent: 'center',
                alignItems: 'flex-end',
                opacity: shouldDimNode(node.id) ? 0.35 : 1,
              }}
            >
              <Text style={styles.labelTitle} numberOfLines={1}>
                {node.title}
              </Text>
              <Text style={styles.labelAmount}>
                {format.money(node.amount, node.amount >= 1000)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {width > 0 ? (
        <View style={{ flex: 1, height: laidOut.chartHeight, marginHorizontal: columnGap }}>
          <Svg width="100%" height={laidOut.chartHeight}>
            <Defs>
              {laidOut.links.map((link) => (
                <LinearGradient
                  key={`g-${link.id}`}
                  id={`grad-${link.id}`}
                  x1={link.gx1}
                  y1={link.gy1}
                  x2={link.gx2}
                  y2={link.gy2}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop
                    offset="0"
                    stopColor={link.color}
                    stopOpacity={shouldDimLink(link) ? 0.1 : 0.4}
                  />
                  <Stop
                    offset="1"
                    stopColor={link.color}
                    stopOpacity={shouldDimLink(link) ? 0.06 : 0.22}
                  />
                </LinearGradient>
              ))}
            </Defs>
            {laidOut.links.map((link) => (
              <Path key={link.id} d={link.d} fill={`url(#grad-${link.id})`} />
            ))}
            {laidOut.nodes.map((node) => (
              <Rect
                key={node.id}
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={compact ? 2 : 3}
                fill={node.color}
                opacity={shouldDimNode(node.id) ? 0.35 : 1}
              />
            ))}
          </Svg>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {!compact ? (
        <View style={{ width: labelWidth }}>
          {laidOut.rightLabels.map((node) => (
            <View
              key={node.id}
              style={{
                position: 'absolute',
                top: node.minY,
                height: node.height,
                width: labelWidth,
                justifyContent: 'center',
                alignItems: 'flex-start',
                opacity: shouldDimNode(node.id) ? 0.35 : 1,
              }}
            >
              <Text style={styles.labelTitle} numberOfLines={1}>
                {node.title}
              </Text>
              <Text style={styles.labelAmount}>
                {format.money(node.amount, node.amount >= 1000)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  labelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  labelAmount: {
    fontSize: 11,
    color: surface.labelMuted,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
