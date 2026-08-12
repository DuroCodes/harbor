import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Assets } from '@/components/finance/Assets';
import { BudgetList } from '@/components/finance/BudgetList';
import { IncomeSpend } from '@/components/finance/IncomeSpend';
import { NetWorthChart } from '@/components/finance/NetWorthChart';
import { NetWorthHero } from '@/components/finance/NetWorthHero';
import { RecentTxns } from '@/components/finance/RecentTxns';
import { Sankey } from '@/components/charts/Sankey';
import { Pie } from '@/components/charts/Pie';
import {
  WIDGET_META,
  type DashboardWidgetItem,
  type DashboardWidgetWidth,
} from '@/components/board/layout';
import { Card } from '@/components/ui/Card';
import { surface, theme } from '@/theme/tokens';
import { useApp } from '@/context/app';
import type { DashboardWidgetKind } from '@/components/board/layout';

type Props = {
  item: DashboardWidgetItem;
  navigationEnabled?: boolean;
  equalHeight?: boolean;
};

export function WidgetView({ item, navigationEnabled = true, equalHeight = false }: Props) {
  const app = useApp();
  const isCompact = item.width === 'half' && WIDGET_META[item.kind].allowsHalfWidth;
  const recent = app.transactions.slice(0, 5);

  const openDestination = () => {
    if (!navigationEnabled) return;
    switch (item.kind) {
      case 'netWorthChart':
        app.openNetWorth();
        break;
      case 'assets':
        app.openAccounts();
        break;
      case 'incomeSpending':
      case 'sankey':
      case 'pie':
        app.openCashFlow();
        break;
      case 'budgets':
        app.openBudgets();
        break;
      default:
        break;
    }
  };

  const tappable =
    navigationEnabled &&
    (item.kind === 'netWorthChart' ||
      item.kind === 'assets' ||
      item.kind === 'incomeSpending' ||
      item.kind === 'sankey' ||
      item.kind === 'pie' ||
      item.kind === 'budgets');

  const content = (
    <View style={[styles.widgetRoot, equalHeight && { flex: 1 }]}>
      {item.showsTitle ? (
        <Text style={styles.widgetTitle}>{WIDGET_META[item.kind].title}</Text>
      ) : null}
      {renderKind(item.kind, item.width, app, recent, isCompact)}
    </View>
  );

  if (tappable) {
    return (
      <Pressable onPress={openDestination} style={equalHeight ? { flex: 1 } : undefined}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const renderKind = (
  kind: DashboardWidgetKind,
  width: DashboardWidgetWidth,
  app: ReturnType<typeof useApp>,
  recent: ReturnType<typeof useApp>['transactions'],
  isCompact: boolean
) => {
  switch (kind) {
    case 'netWorth':
      return <NetWorthHero netWorth={app.summary.netWorth} />;
    case 'netWorthChart':
      return <NetWorthChart snapshots={app.netWorthHistory} compact={isCompact} />;
    case 'assets':
      return (
        <Assets
          cash={app.summary.cash}
          investments={app.summary.investments}
          credit={app.summary.credit}
          compact={isCompact}
        />
      );
    case 'incomeSpending':
      return (
        <IncomeSpend
          income={app.cashFlow.income}
          spending={app.cashFlow.spending}
          compact={isCompact}
          showsHeader
        />
      );
    case 'recentActivity':
      return (
        <RecentTxns
          transactions={recent}
          categoriesById={app.categoriesById}
          onHeaderTap={() => app.openActivity()}
          onTransactionTap={(t) => app.openTransaction(t.id)}
        />
      );
    case 'sankey':
      return <SankeyWidget data={app.sankeyData} compact={isCompact} />;
    case 'pie':
      return <PieWidget data={app.sankeyData} compact={isCompact} />;
    case 'budgets':
      return (
        <View>
          <Text style={styles.sectionLabel}>Budgets</Text>
          <BudgetList
            items={app.budgetProgress.slice(0, 5)}
            emptyMessage="Tap to set category budgets."
            compact
          />
        </View>
      );
    default:
      return null;
  }
};

function SankeyWidget({
  data,
  compact,
}: {
  data: ReturnType<typeof useApp>['sankeyData'];
  compact: boolean;
}) {
  return (
    <View style={compact ? { flex: 1 } : undefined}>
      <Text style={styles.sectionLabel}>Cash flow</Text>
      {data.isEmpty ? (
        <Card style={{ padding: 16, height: compact ? theme.halfTileCardHeight : undefined }}>
          <Text style={styles.empty}>No activity this month.</Text>
        </Card>
      ) : (
        <View
          style={[
            styles.chartCard,
            compact && { height: theme.halfTileCardHeight, padding: 10 },
            !compact && { padding: 12 },
          ]}
        >
          <Sankey data={data} compact={compact} />
        </View>
      )}
    </View>
  );
}

function PieWidget({
  data,
  compact,
}: {
  data: ReturnType<typeof useApp>['sankeyData'];
  compact: boolean;
}) {
  return (
    <View style={compact ? { flex: 1 } : undefined}>
      <Text style={styles.sectionLabel}>Spending</Text>
      {data.isEmpty || data.totalSpending === 0 ? (
        <Card
          style={{
            padding: 16,
            height: compact ? theme.halfTileCardHeight : undefined,
          }}
        >
          <Text style={styles.empty}>No spending this month.</Text>
        </Card>
      ) : (
        <View
          style={[
            styles.chartCard,
            compact && { height: theme.halfTileCardHeight, padding: 10 },
            !compact && { padding: 12 },
          ]}
        >
          <Pie data={data} compact={compact} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  widgetRoot: {
    width: '100%',
    minWidth: 0,
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
    marginBottom: 12,
  },
  empty: {
    fontSize: 15,
    color: surface.labelMuted,
  },
  chartCard: {
    backgroundColor: surface.elevated,
    borderRadius: theme.cardCorner,
    overflow: 'hidden',
  },
});
