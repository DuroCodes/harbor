import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChartMenu, type ChartKind } from '@/components/cash-flow/ChartMenu';
import { Sankey } from '@/components/charts/Sankey';
import { Pie } from '@/components/charts/Pie';
import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { surface, theme, typo, layout } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { cashFlowSankey } from '@/lib/calc';
import { format } from '@/lib/format';

export default function CashFlowScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null);
  const [chartKind, setChartKind] = useState<ChartKind>('sankey');

  const monthDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset, 1);
    return d;
  }, [monthOffset]);

  const monthTitle = format.monthYear(monthDate);
  const sankeyData = useMemo(
    () => cashFlowSankey(app.toCashFlowInputs(), monthDate),
    [app, monthDate]
  );

  const heroTitle =
    sankeyData.totalIncome === 0 && sankeyData.totalSpending > 0
      ? 'Spending'
      : sankeyData.leftover >= 0
        ? 'Left over'
        : 'Shortfall';

  const heroValue =
    sankeyData.totalIncome === 0 && sankeyData.totalSpending > 0
      ? sankeyData.totalSpending
      : Math.abs(sankeyData.leftover);

  const heroPositive =
    !(sankeyData.totalIncome === 0 && sankeyData.totalSpending > 0) &&
    sankeyData.leftover >= 0;

  return (
    <View style={layout.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          layout.screenPadding,
          {
            gap: theme.sectionSpacing,
            paddingBottom: Math.max(insets.bottom, 12) + 40,
          },
        ]}
      >
        <View style={styles.monthPicker}>
          <Pressable
            onPress={() => setMonthOffset((o) => o - 1)}
            style={styles.chevron}
            hitSlop={8}
          >
            <SymbolView
              name="chevron.left"
              size={14}
              tintColor={surface.labelSecondary}
              weight="semibold"
            />
          </Pressable>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <Pressable
            onPress={() => setMonthOffset((o) => Math.min(o + 1, 0))}
            disabled={monthOffset >= 0}
            style={[styles.chevron, monthOffset >= 0 && { opacity: 0.3 }]}
            hitSlop={8}
          >
            <SymbolView
              name="chevron.right"
              size={14}
              tintColor={surface.labelSecondary}
              weight="semibold"
            />
          </Pressable>
        </View>

        {sankeyData.isEmpty ? (
          <View style={styles.empty}>
            <SymbolView
              name="chart.bar"
              size={40}
              tintColor={surface.labelMuted}
              weight="light"
            />
            <Text style={styles.emptyTitle}>No activity</Text>
            <Text style={styles.emptyBody}>
              Nothing recorded for {monthTitle}.
            </Text>
          </View>
        ) : (
          <>
            <View>
              <Text style={styles.heroLabel}>{heroTitle}</Text>
              <Text
                style={[
                  typo.heroBalance,
                  {
                    color: heroPositive ? theme.positive : surface.label,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {format.money(heroValue)}
              </Text>
            </View>

            <Card>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCell}>
                  <Text style={styles.caption}>Income</Text>
                  <Text
                    style={[typo.amount(20), { color: theme.positive }]}
                    numberOfLines={1}
                  >
                    {format.money(sankeyData.totalIncome)}
                  </Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.summaryCell}>
                  <Text style={styles.caption}>Spending</Text>
                  <Text
                    style={[typo.amount(20), { color: surface.label }]}
                    numberOfLines={1}
                  >
                    {format.money(sankeyData.totalSpending)}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={{ gap: 10 }}>
              <View style={styles.chartHeader}>
                <Text style={styles.section}>
                  {chartKind === 'sankey' ? 'Flow' : 'Spending'}
                </Text>
                <ChartMenu value={chartKind} onChange={setChartKind} />
              </View>
              <View style={{ paddingVertical: 4 }}>
                {chartKind === 'sankey' ? (
                  <Sankey
                    data={sankeyData}
                    highlightedNodeID={selectedNodeID}
                  />
                ) : (
                  <Pie
                    data={sankeyData}
                    highlightedNodeID={selectedNodeID}
                    onSelectNode={setSelectedNodeID}
                  />
                )}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.section}>Breakdown</Text>
              <Card padding={4}>
                {sankeyData.outflowNodes.map((node, index) => (
                  <View key={node.id}>
                    <Pressable
                      style={[
                        styles.breakRow,
                        {
                          opacity:
                            selectedNodeID == null || selectedNodeID === node.id
                              ? 1
                              : 0.35,
                        },
                      ]}
                      onPress={() =>
                        setSelectedNodeID((id) =>
                          id === node.id ? null : node.id
                        )
                      }
                    >
                      <SymbolView
                        name={
                          (node.systemImage ??
                            (node.kind === 'leftover'
                              ? 'checkmark.circle'
                              : 'circle')) as any
                        }
                        size={15}
                        tintColor={surface.labelMuted}
                        weight="light"
                        style={{ width: 24, height: 24 }}
                      />
                      <Text style={styles.breakTitle}>{node.title}</Text>
                      <Text
                        style={[
                          typo.amount(20),
                          {
                            color:
                              node.kind === 'leftover'
                                ? theme.positive
                                : surface.label,
                          },
                        ]}
                      >
                        {format.money(node.amount)}
                      </Text>
                    </Pressable>
                    {index < sankeyData.outflowNodes.length - 1 ? (
                      <Hairline leadingInset={52} />
                    ) : null}
                  </View>
                ))}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelMuted,
    minWidth: 140,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: surface.labelMuted,
  },
  emptyBody: {
    fontSize: 15,
    color: surface.labelMuted,
  },
  heroLabel: {
    fontSize: 15,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  summaryRow: { flexDirection: 'row' },
  summaryCell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  caption: {
    fontSize: 12,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: surface.hairline,
    marginVertical: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  breakTitle: {
    flex: 1,
    fontSize: 15,
    color: surface.labelMuted,
  },
});
