import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BudgetEditor } from '@/components/finance/BudgetEditor';
import { BudgetList } from '@/components/finance/BudgetList';
import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { brand, surface, theme, typo, layout } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { format } from '@/lib/format';
import type { Category } from '@/lib/types';

export default function BudgetsScreen() {
  const app = useApp();
  const [editing, setEditing] = useState<Category | null>(null);

  const expenseCategories = useMemo(
    () => app.categories.filter((c) => !c.isIncome && !c.isTransfer),
    [app.categories]
  );

  return (
    <View style={layout.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          layout.screenPadding,
          { gap: theme.sectionSpacing },
        ]}
      >
        {app.budgetProgress.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.section}>This month</Text>
            <BudgetList items={app.budgetProgress} />
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <Text style={styles.section}>Categories</Text>
          <Card padding={4}>
            {expenseCategories.map((category, index) => (
              <View key={category.id}>
                <Pressable
                  style={styles.catRow}
                  onPress={() => setEditing(category)}
                >
                  <SymbolView
                    name={category.systemImage as any}
                    size={15}
                    tintColor={surface.labelMuted}
                    weight="light"
                    style={{ width: 24, height: 24 }}
                  />
                  <Text style={styles.catName}>{category.name}</Text>
                  {(category.monthlyBudgetLimit ?? 0) > 0 ? (
                    <Text style={[typo.amount(20), { color: brand.accent }]}>
                      {format.money(category.monthlyBudgetLimit!)}
                    </Text>
                  ) : (
                    <Text style={styles.addLabel}>Add</Text>
                  )}
                  <SymbolView
                    name="chevron.right"
                    size={12}
                    tintColor="rgba(255,255,255,0.315)"
                    weight="semibold"
                  />
                </Pressable>
                {index < expenseCategories.length - 1 ? (
                  <Hairline leadingInset={52} />
                ) : null}
              </View>
            ))}
          </Card>
          <Text style={styles.footer}>
            Budgets apply to the current calendar month. Spending matches Cash
            Flow — transfers excluded, refunds netted.
          </Text>
        </View>
      </ScrollView>

      <BudgetEditor
        category={editing}
        onDismiss={() => setEditing(null)}
        onSave={(amount) => {
          if (editing) app.setBudget(editing.id, amount);
          setEditing(null);
        }}
        onClear={() => {
          if (editing) app.setBudget(editing.id, null);
          setEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  catName: {
    flex: 1,
    fontSize: 15,
    color: surface.label,
  },
  addLabel: {
    fontSize: 15,
    color: surface.labelMuted,
  },
  footer: {
    fontSize: 12,
    color: surface.labelMuted,
    lineHeight: 17,
  },
});
