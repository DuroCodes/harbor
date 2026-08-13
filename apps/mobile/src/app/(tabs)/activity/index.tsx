import { SymbolView } from 'expo-symbols';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ActivityFilterChips,
  ActivityFilterMenu,
  defaultActivityFilters,
  type ActivityFilters,
} from '@/components/activity/ActivityFilterMenu';
import { TransactionRow } from '@/components/rows/TransactionRow';
import { brand, surface, layout } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { accountDisplayName, transactionDisplayMerchant } from '@/lib/types';

export default function ActivityScreen() {
  const app = useApp();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>(
    defaultActivityFilters
  );

  const filtered = useMemo(() => {
    let items = app.transactions;
    const q = searchText.trim().toLowerCase();

    if (q) {
      items = items.filter((t) => {
        const merchant = transactionDisplayMerchant(t).toLowerCase();
        const name = t.name.toLowerCase();
        const cat = t.categoryID
          ? (app.categoriesById[t.categoryID]?.name.toLowerCase() ?? '')
          : '';
        const account = t.accountID
          ? (() => {
              const a = app.accountsById[t.accountID];
              return a ? accountDisplayName(a).toLowerCase() : '';
            })()
          : '';
        const notes = (t.notes ?? '').toLowerCase();
        return (
          merchant.includes(q) ||
          name.includes(q) ||
          cat.includes(q) ||
          account.includes(q) ||
          notes.includes(q)
        );
      });
    }

    if (filters.categoryID) {
      items = items.filter((t) => t.categoryID === filters.categoryID);
    }
    if (filters.accountID) {
      items = items.filter((t) => t.accountID === filters.accountID);
    }
    if (filters.status === 'pending') {
      items = items.filter((t) => t.status === 'pending');
    } else if (filters.status === 'posted') {
      items = items.filter((t) => t.status === 'posted');
    }

    if (filters.kind !== 'all') {
      items = items.filter((t) => {
        const cat = t.categoryID ? app.categoriesById[t.categoryID] : null;
        if (filters.kind === 'transfers') return !!cat?.isTransfer;
        if (filters.kind === 'income')
          return !!cat?.isIncome && !cat?.isTransfer;
        // spending: expense categories (not income, not transfer)
        return !!cat && !cat.isIncome && !cat.isTransfer;
      });
    }

    return items;
  }, [
    app.transactions,
    app.categoriesById,
    app.accountsById,
    searchText,
    filters,
  ]);

  return (
    <View style={layout.screen}>
      <Stack.SearchBar
        placeholder="Search merchant, category, account…"
        hideWhenScrolling={false}
        hideNavigationBar={false}
        obscureBackground={false}
        placement="stacked"
        autoCapitalize="none"
        tintColor={brand.accent}
        textColor={surface.label}
        barTintColor={surface.elevated}
        hintTextColor={surface.labelMuted}
        headerIconColor={surface.labelMuted}
        onChangeText={(e) => setSearchText(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearchText('')}
      />
      <Stack.Toolbar placement="right" tintColor={brand.accent}>
        <Stack.Toolbar.View>
          <ActivityFilterMenu
            filters={filters}
            onChange={setFilters}
            categories={app.categories}
            accounts={app.accounts}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={filtered.length > 0}
        bounces={filtered.length > 0}
        contentContainerStyle={
          filtered.length === 0 ? undefined : styles.listContent
        }
        ListHeaderComponent={
          <ActivityFilterChips
            filters={filters}
            onChange={setFilters}
            categories={app.categories}
            accounts={app.accounts}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SymbolView
              name="list.bullet"
              size={40}
              tintColor={surface.labelMuted}
              weight="light"
            />
            <Text style={styles.emptyTitle}>
              {app.transactions.length === 0 ? 'No Activity' : 'No Matches'}
            </Text>
            <Text style={styles.emptyBody}>
              {app.transactions.length === 0
                ? 'Transactions will appear after you connect an account.'
                : 'Try a different search or clear filters.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => app.openTransaction(item.id)}
          >
            <TransactionRow
              transaction={item}
              category={
                item.categoryID ? app.categoriesById[item.categoryID] : null
              }
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: surface.canvas,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: surface.hairline,
    marginLeft: 56,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
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
    textAlign: 'center',
  },
});
