import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Line, Text as SvgText } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { brand, surface, theme } from '@/theme/tokens';
import type { NetWorthSnapshot } from '@/lib/types';

type Props = {
  snapshots: NetWorthSnapshot[];
  /** Half-tile height + elevated chrome. */
  compact?: boolean;
  /** Axis labels + grid — for the detail screen. */
  detailed?: boolean;
};

export function NetWorthChart({ snapshots, compact = false, detailed = false }: Props) {
  const chartSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [snapshots]
  );
  const [width, setWidth] = useState(0);
  const height = detailed ? 220 : compact ? 120 : 140;
  const padL = detailed ? 52 : 4;
  const padR = detailed ? 12 : 4;
  const padT = detailed ? 12 : 8;
  const padB = detailed ? 28 : 8;

  if (chartSnapshots.length < 2) {
    return (
      <Card style={{ padding: 16 }}>
        <Text style={styles.empty}>Not enough history yet.</Text>
      </Card>
    );
  }

  const values = chartSnapshots.map((s) => s.netWorth);
  let lo = Math.min(...values, 0);
  let hi = Math.max(...values, 0);
  if (lo === hi) {
    const pad = Math.max(Math.abs(hi) * 0.1, 100);
    lo = hi - pad;
    hi = hi + pad;
  } else {
    const pad = (hi - lo) * 0.12;
    lo = lo - pad * 0.2;
    hi = hi + pad;
  }

  const times = chartSnapshots.map((s) => +new Date(s.date));
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const tSpan = Math.max(t1 - t0, 1);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const innerW = Math.max(width - padL - padR, 1);
  const innerH = height - padT - padB;

  const points = chartSnapshots.map((s) => {
    const x = padL + ((+new Date(s.date) - t0) / tSpan) * innerW;
    const y = padT + (1 - (s.netWorth - lo) / (hi - lo)) * innerH;
    return { x, y };
  });

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  const yTicks = 4;
  const formatY = (amount: number) => {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
    if (abs >= 100) return `${sign}$${Math.round(abs)}`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const t = i / (yTicks - 1);
    const value = hi - t * (hi - lo);
    const y = padT + t * innerH;
    return { value, y, label: formatY(value) };
  });

  const spanDays = Math.round(tSpan / (1000 * 60 * 60 * 24));
  const xLabels =
    spanDays <= 45
      ? [
          { date: new Date(t0), x: padL },
          { date: new Date(t1), x: padL + innerW },
        ]
      : [
          { date: new Date(t0), x: padL },
          {
            date: new Date(t0 + tSpan / 2),
            x: padL + innerW / 2,
          },
          { date: new Date(t1), x: padL + innerW },
        ];

  const formatX = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      ...(spanDays <= 45 ? { day: 'numeric' } : {}),
    });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrap,
        compact &&
          !detailed && {
            padding: 10,
            backgroundColor: surface.elevated,
            borderRadius: theme.cardCorner,
          },
      ]}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={brand.accent} stopOpacity={0.28} />
              <Stop offset="1" stopColor={brand.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {detailed
            ? yLabels.map((tick, i) => (
                <Line
                  key={`yg-${i}`}
                  x1={padL}
                  x2={padL + innerW}
                  y1={tick.y}
                  y2={tick.y}
                  stroke={surface.hairline}
                  strokeWidth={0.5}
                />
              ))
            : null}
          {detailed
            ? yLabels.map((tick, i) => (
                <SvgText
                  key={`yl-${i}`}
                  x={padL - 8}
                  y={tick.y + 3}
                  fill={surface.labelMuted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {tick.label}
                </SvgText>
              ))
            : null}
          <Path d={areaD} fill="url(#nwFill)" />
          <Path d={lineD} fill="none" stroke={brand.accent} strokeWidth={2} />
          {detailed
            ? xLabels.map((tick, i) => (
                <SvgText
                  key={`xl-${i}`}
                  x={tick.x}
                  y={height - 6}
                  fill={surface.labelMuted}
                  fontSize={10}
                  textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
                >
                  {formatX(tick.date)}
                </SvgText>
              ))
            : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  empty: {
    fontSize: 15,
    color: surface.labelMuted,
  },
});
