import { SymbolView } from 'expo-symbols';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  const [filters, setFilters] = useState<ActivityFilters>(defaultActivityFilters);

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
        if (filters.kind === 'income') return !!cat?.isIncome && !cat?.isTransfer;
        // spending: expense categories (not income, not transfer)
        return !!cat && !cat.isIncome && !cat.isTransfer;
      });
    }

    return items;
  }, [app.transactions, app.categoriesById, app.accountsById, searchText, filters]);

  return (
    <View style={layout.screen}>
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

      <View style={styles.searchWrap}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search merchant, category, account…"
          placeholderTextColor={surface.labelMuted}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <ActivityFilterChips
        filters={filters}
        onChange={setFilters}
        categories={app.categories}
        accounts={app.accounts}
      />

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : { paddingBottom: 24 }
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
          <Pressable style={styles.row} onPress={() => app.openTransaction(item.id)}>
            <TransactionRow
              transaction={item}
              category={item.categoryID ? app.categoriesById[item.categoryID] : null}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  search: {
    backgroundColor: surface.elevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: surface.label,
    fontSize: 16,
  },
  list: {
    flex: 1,
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
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
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
