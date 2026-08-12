/** Donut spending chart (compact + full). Tap a slice or legend row to highlight it and show that category's amount. */
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { brand, surface, theme, typo } from '@/theme/tokens';
import { format } from '@/lib/format';
import type { CashFlowNode, CashFlowSankeyData } from '@/lib/types';

type Props = {
  data: CashFlowSankeyData;
  highlightedNodeID?: string | null;
  onSelectNode?: (id: string | null) => void;
  compact?: boolean;
};

const polar = (cx: number, cy: number, r: number, angle: number) => {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string => {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const os = polar(cx, cy, outerR, startAngle);
  const oe = polar(cx, cy, outerR, endAngle);
  const is = polar(cx, cy, innerR, endAngle);
  const ie = polar(cx, cy, innerR, startAngle);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${is.x} ${is.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y}`,
    'Z',
  ].join(' ');
};

export function Pie({ data, highlightedNodeID, onSelectNode, compact = false }: Props) {
  const slices = useMemo(() => {
    const expenses = data.outflowNodes.filter((n) => n.kind === 'expense' && n.amount > 0);
    if (expenses.length === 0) return data.outflowNodes.filter((n) => n.amount > 0);
    return expenses;
  }, [data]);

  const total = Math.max(
    slices.reduce((s, n) => s + n.amount, 0),
    0.0001
  );
  const chartHeight = compact ? theme.halfTileCardHeight - 20 : 200;
  const [width, setWidth] = useState(0);
  /** Transient press preview when parent isn't driving selection (e.g. home widget). */
  const [pressedID, setPressedID] = useState<string | null>(null);

  if (slices.length === 0) return null;

  const size = Math.min(width || chartHeight, chartHeight);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * (compact ? 0.58 : 0.6);
  const gap = compact ? 1.2 : 1.5;

  let angle = 0;
  const arcs = slices.map((node, index) => {
    const sweep = (node.amount / total) * 360;
    const start = angle + gap / 2;
    const end = angle + sweep - gap / 2;
    angle += sweep;
    return { node, index, start: Math.min(start, end), end: Math.max(start, end) };
  });

  const activeID = highlightedNodeID ?? pressedID;
  const activeNode = activeID ? (slices.find((n) => n.id === activeID) ?? null) : null;

  const opacityFor = (id: string) => (activeID == null || activeID === id ? 1 : 0.28);

  const toggleSelect = (id: string) => {
    if (!onSelectNode) return;
    onSelectNode(highlightedNodeID === id ? null : id);
  };

  return (
    <View style={styles.wrap}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.chartBox, { height: chartHeight }]}
      >
        {width > 0 ? (
          <View style={{ width: size, height: size, alignSelf: 'center' }}>
            <Svg width={size} height={size}>
              <G>
                {arcs.map(({ node, index, start, end }) => (
                  <Path
                    key={node.id}
                    d={arcPath(cx, cy, outerR, innerR, start, end)}
                    fill={brand.expensePalette[index % brand.expensePalette.length]}
                    opacity={opacityFor(node.id)}
                    onPress={() => toggleSelect(node.id)}
                    onPressIn={() => setPressedID(node.id)}
                    onPressOut={() => setPressedID(null)}
                  />
                ))}
              </G>
            </Svg>
            {!compact ? (
              <View style={styles.center} pointerEvents="none">
                <Text style={styles.centerLabel} numberOfLines={1}>
                  {activeNode?.title ?? 'Spending'}
                </Text>
                <Text
                  style={[typo.amount(20), { color: surface.label }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {format.money(activeNode?.amount ?? total, (activeNode?.amount ?? total) >= 1000)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {!compact ? (
        <FlowLegend
          nodes={slices}
          highlightedNodeID={activeID}
          onSelectNode={onSelectNode ? toggleSelect : undefined}
        />
      ) : null}
    </View>
  );
}

function FlowLegend({
  nodes,
  highlightedNodeID,
  onSelectNode,
}: {
  nodes: CashFlowNode[];
  highlightedNodeID?: string | null;
  onSelectNode?: (id: string) => void;
}) {
  return (
    <View style={styles.legend}>
      {nodes.map((node, index) => {
        const row = (
          <>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: brand.expensePalette[index % brand.expensePalette.length],
                },
              ]}
            />
            <Text style={styles.legendText} numberOfLines={1}>
              {node.title}
            </Text>
          </>
        );

        return onSelectNode ? (
          <Pressable
            key={node.id}
            onPress={() => onSelectNode(node.id)}
            style={[
              styles.legendItem,
              {
                opacity: highlightedNodeID == null || highlightedNodeID === node.id ? 1 : 0.35,
              },
            ]}
          >
            {row}
          </Pressable>
        ) : (
          <View
            key={node.id}
            style={[
              styles.legendItem,
              {
                opacity: highlightedNodeID == null || highlightedNodeID === node.id ? 1 : 0.35,
              },
            ]}
          >
            {row}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  chartBox: {
    width: '100%',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  centerLabel: {
    fontSize: 11,
    color: surface.labelMuted,
    marginBottom: 2,
    maxWidth: '80%',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 140,
    maxWidth: '48%',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontSize: 12,
    color: surface.labelMuted,
    flexShrink: 1,
  },
});
