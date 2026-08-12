import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { brand, surface, typo, theme } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { format } from '@/lib/format';
import {
  accountDisplayName,
  signedAmountForDisplay,
  transactionDisplayMerchant,
} from '@/lib/types';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const app = useApp();
  const transaction = app.getTransaction(id);
  const [notes, setNotes] = useState(transaction?.notes ?? '');

  useEffect(() => {
    setNotes(transaction?.notes ?? '');
  }, [transaction?.id, transaction?.notes]);

  if (!transaction) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Stack.Screen
          options={{
            title: 'Transaction',
            headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
          }}
        />
        <Text style={styles.muted}>This transaction could not be found.</Text>
      </View>
    );
  }

  const category = transaction.categoryID ? app.categoriesById[transaction.categoryID] : null;
  const account = transaction.accountID ? app.accountsById[transaction.accountID] : null;
  const signed = signedAmountForDisplay(transaction.amount);
  const merchant = transactionDisplayMerchant(transaction);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Transaction',
          headerTintColor: brand.accent,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
        }}
      />

      <View style={styles.hero}>
        <Text style={styles.heroMerchant} numberOfLines={2}>
          {merchant}
        </Text>
        <Text
          style={[
            typo.heroBalance,
            { color: signed >= 0 ? theme.positive : surface.label, fontSize: 34 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {format.signedMoney(signed)}
        </Text>
        <Text style={styles.heroMeta}>{format.mediumDate(transaction.date)}</Text>
      </View>

      <View style={styles.card}>
        {transaction.status === 'pending' ? <Row label="Status" value="Pending" accent /> : null}
        {account ? <Row label="Account" value={accountDisplayName(account)} /> : null}
        {category ? <Row label="Category" value={category.name} /> : null}
        {transaction.name && transaction.name !== merchant ? (
          <Row label="Description" value={transaction.name} />
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Notes</Text>
      <View style={styles.card}>
        <TextInput
          value={notes}
          onChangeText={(text) => {
            setNotes(text);
            app.updateTransactionNotes(transaction.id, text);
          }}
          placeholder="Add a note"
          placeholderTextColor={surface.labelMuted}
          multiline
          style={styles.notes}
        />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent ? { color: brand.accent } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: surface.canvas,
  },
  content: {
    paddingBottom: 40,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: surface.labelMuted, fontSize: 15 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroMerchant: {
    fontSize: 15,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  heroMeta: {
    marginTop: 8,
    fontSize: 15,
    color: surface.labelSecondary,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: surface.elevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: surface.labelMuted,
    fontSize: 15,
    flexShrink: 0,
  },
  value: {
    color: surface.label,
    fontSize: 15,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '500',
    color: surface.labelMuted,
  },
  notes: {
    color: surface.label,
    fontSize: 16,
    minHeight: 88,
    textAlignVertical: 'top',
    padding: 0,
  },
});
