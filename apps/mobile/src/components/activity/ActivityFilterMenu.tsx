import { Button, Host, Image, Menu } from '@expo/ui/swift-ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { brand, surface } from '@/theme/tokens';
import type { Account, Category } from '@/lib/types';
import { accountDisplayName } from '@/lib/types';

export type ActivityStatusFilter = 'all' | 'pending' | 'posted';
export type ActivityKindFilter = 'all' | 'spending' | 'income' | 'transfers';

export type ActivityFilters = {
  categoryID: string | null;
  accountID: string | null;
  status: ActivityStatusFilter;
  kind: ActivityKindFilter;
};

export const defaultActivityFilters = (): ActivityFilters => ({
  categoryID: null,
  accountID: null,
  status: 'all',
  kind: 'all',
});

export const activityFiltersActive = (f: ActivityFilters) =>
  f.categoryID != null ||
  f.accountID != null ||
  f.status !== 'all' ||
  f.kind !== 'all';

type Props = {
  filters: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
  categories: Category[];
  accounts: Account[];
};

export function ActivityFilterMenu({
  filters,
  onChange,
  categories,
  accounts,
}: Props) {
  const active = activityFiltersActive(filters);
  const categoryName =
    filters.categoryID != null
      ? (categories.find((c) => c.id === filters.categoryID)?.name ??
        'Category')
      : 'Category';
  const accountName =
    filters.accountID != null
      ? (() => {
          const account = accounts.find((a) => a.id === filters.accountID);
          return account ? accountDisplayName(account) : 'Account';
        })()
      : 'Account';
  const statusName =
    filters.status === 'pending'
      ? 'Pending'
      : filters.status === 'posted'
        ? 'Posted'
        : 'Status';
  const kindName =
    filters.kind === 'spending'
      ? 'Spending'
      : filters.kind === 'income'
        ? 'Income'
        : filters.kind === 'transfers'
          ? 'Transfers'
          : 'Type';

  return (
    <View style={styles.menuWrap} accessibilityLabel="Filter">
      <Host matchContents colorScheme="dark" seedColor={brand.accent}>
        {/* Custom label — string+systemImage overlaps in the toolbar Host. */}
        <Menu
          label={
            <Image
              systemName="line.3.horizontal.decrease"
              size={17}
              color={brand.accent}
            />
          }
        >
          <Menu
            label={categoryName}
            systemImage={filters.categoryID != null ? 'checkmark' : 'tag'}
          >
            <Button
              label="All Categories"
              systemImage={filters.categoryID == null ? 'checkmark' : undefined}
              onPress={() => onChange({ ...filters, categoryID: null })}
            />
            {categories.map((c) => (
              <Button
                key={c.id}
                label={c.name}
                systemImage={
                  filters.categoryID === c.id ? 'checkmark' : undefined
                }
                onPress={() => onChange({ ...filters, categoryID: c.id })}
              />
            ))}
          </Menu>

          <Menu
            label={accountName}
            systemImage={
              filters.accountID != null ? 'checkmark' : 'building.columns'
            }
          >
            <Button
              label="All Accounts"
              systemImage={filters.accountID == null ? 'checkmark' : undefined}
              onPress={() => onChange({ ...filters, accountID: null })}
            />
            {accounts.map((a) => (
              <Button
                key={a.id}
                label={accountDisplayName(a)}
                systemImage={
                  filters.accountID === a.id ? 'checkmark' : undefined
                }
                onPress={() => onChange({ ...filters, accountID: a.id })}
              />
            ))}
          </Menu>

          <Menu
            label={statusName}
            systemImage={filters.status !== 'all' ? 'checkmark' : 'clock'}
          >
            <Button
              label="All"
              systemImage={filters.status === 'all' ? 'checkmark' : undefined}
              onPress={() => onChange({ ...filters, status: 'all' })}
            />
            <Button
              label="Pending"
              systemImage={
                filters.status === 'pending' ? 'checkmark' : undefined
              }
              onPress={() => onChange({ ...filters, status: 'pending' })}
            />
            <Button
              label="Posted"
              systemImage={
                filters.status === 'posted' ? 'checkmark' : undefined
              }
              onPress={() => onChange({ ...filters, status: 'posted' })}
            />
          </Menu>

          <Menu
            label={kindName}
            systemImage={
              filters.kind !== 'all' ? 'checkmark' : 'arrow.left.arrow.right'
            }
          >
            <Button
              label="All"
              systemImage={filters.kind === 'all' ? 'checkmark' : undefined}
              onPress={() => onChange({ ...filters, kind: 'all' })}
            />
            <Button
              label="Spending"
              systemImage={
                filters.kind === 'spending' ? 'checkmark' : undefined
              }
              onPress={() => onChange({ ...filters, kind: 'spending' })}
            />
            <Button
              label="Income"
              systemImage={filters.kind === 'income' ? 'checkmark' : undefined}
              onPress={() => onChange({ ...filters, kind: 'income' })}
            />
            <Button
              label="Transfers"
              systemImage={
                filters.kind === 'transfers' ? 'checkmark' : undefined
              }
              onPress={() => onChange({ ...filters, kind: 'transfers' })}
            />
          </Menu>

          {active ? (
            <Button
              label="Clear Filters"
              role="destructive"
              systemImage="xmark.circle"
              onPress={() => onChange(defaultActivityFilters())}
            />
          ) : null}
        </Menu>
      </Host>
      {active ? <View style={styles.dot} pointerEvents="none" /> : null}
    </View>
  );
}

type ChipsProps = {
  filters: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
  categories: Category[];
  accounts: Account[];
};

export function ActivityFilterChips({
  filters,
  onChange,
  categories,
  accounts,
}: ChipsProps) {
  if (!activityFiltersActive(filters)) return null;

  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.categoryID) {
    const name =
      categories.find((c) => c.id === filters.categoryID)?.name ?? 'Category';
    chips.push({
      key: 'cat',
      label: name,
      clear: () => onChange({ ...filters, categoryID: null }),
    });
  }
  if (filters.accountID) {
    const account = accounts.find((a) => a.id === filters.accountID);
    chips.push({
      key: 'acct',
      label: account ? accountDisplayName(account) : 'Account',
      clear: () => onChange({ ...filters, accountID: null }),
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: filters.status === 'pending' ? 'Pending' : 'Posted',
      clear: () => onChange({ ...filters, status: 'all' }),
    });
  }
  if (filters.kind !== 'all') {
    const labels: Record<ActivityKindFilter, string> = {
      all: 'All',
      spending: 'Spending',
      income: 'Income',
      transfers: 'Transfers',
    };
    chips.push({
      key: 'kind',
      label: labels[filters.kind],
      clear: () => onChange({ ...filters, kind: 'all' }),
    });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chips}
    >
      {chips.map((chip) => (
        <Pressable key={chip.key} onPress={chip.clear} style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {chip.label}
          </Text>
          <Text style={styles.chipX}>✕</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => onChange(defaultActivityFilters())}
        style={styles.clearChip}
      >
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menuWrap: {
    position: 'relative',
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: brand.accent,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: `${brand.accent}33`,
  },
  chipText: {
    color: brand.accent,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipX: {
    color: brand.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearText: {
    color: surface.labelMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
