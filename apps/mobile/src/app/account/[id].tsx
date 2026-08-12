import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Hairline } from '@/components/ui/Hairline';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { TransactionRow } from '@/components/rows/TransactionRow';
import { brand, surface, typo } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { format } from '@/lib/format';
import { ACCOUNT_SUBTYPE_DISPLAY } from '@/lib/types';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const app = useApp();
  const account = app.getAccount(id);

  if (!account) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Stack.Screen
          options={{
            title: 'Account',
            headerLeft: () => (
              <HeaderBackButton onPress={() => router.back()} />
            ),
          }}
        />
        <Text style={styles.muted}>Account not found.</Text>
      </View>
    );
  }

  const institution = account.institutionID
    ? app.institutionsById[account.institutionID]
    : null;
  const recent = app.transactions
    .filter((t) => t.accountID === account.id)
    .slice(0, 12);

  const heroSubtitle = [
    institution?.name,
    account.mask ? `••••${account.mask}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const confirmUnlink = () => {
    if (!account.institutionID) return;
    const name = institution?.name ?? 'this institution';
    Alert.alert(
      `Unlink ${name}?`,
      'This disconnects the bank connection and deletes its local accounts and transactions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await app.unlinkInstitution(account.institutionID!);
                if (router.canGoBack()) router.back();
              } catch (err) {
                Alert.alert(
                  'Couldn’t Unlink',
                  err instanceof Error ? err.message : 'Something went wrong.'
                );
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: ACCOUNT_SUBTYPE_DISPLAY[account.subtype],
          headerTintColor: brand.accent,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
        }}
      />

      <View style={styles.hero}>
        <Text style={styles.heroSub}>
          {heroSubtitle || ACCOUNT_SUBTYPE_DISPLAY[account.subtype]}
        </Text>
        <Text
          style={[typo.heroBalance, { color: surface.label }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {format.money(account.currentBalance)}
        </Text>
      </View>

      <View style={styles.card}>
        {account.availableBalance != null ? (
          <Row
            label="Available"
            value={format.money(account.availableBalance)}
          />
        ) : null}
        <Row label="Institution" value={institution?.name ?? '—'} />
        {account.mask ? (
          <Row label="Account" value={`••••${account.mask}`} />
        ) : null}
      </View>

      {recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <View style={styles.cardFlush}>
            {recent.map((txn, index) => (
              <View key={txn.id}>
                <Pressable
                  onPress={() => router.push(`/transaction/${txn.id}`)}
                  style={styles.txnRow}
                >
                  <TransactionRow
                    transaction={txn}
                    category={
                      txn.categoryID ? app.categoriesById[txn.categoryID] : null
                    }
                  />
                </Pressable>
                {index < recent.length - 1 ? (
                  <Hairline leadingInset={50} />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {account.institutionID ? (
        <Pressable style={styles.unlinkBtn} onPress={confirmUnlink}>
          <Text style={styles.unlinkText}>Unlink Institution</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
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
  muted: { color: surface.labelMuted },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroSub: {
    fontSize: 15,
    color: surface.labelMuted,
    marginBottom: 6,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: surface.elevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardFlush: {
    marginHorizontal: 16,
    backgroundColor: surface.elevated,
    borderRadius: 14,
    overflow: 'hidden',
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
  section: { marginTop: 28 },
  sectionTitle: {
    marginHorizontal: 20,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '500',
    color: surface.labelMuted,
  },
  txnRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unlinkBtn: {
    marginTop: 28,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: surface.elevated,
    alignItems: 'center',
  },
  unlinkText: {
    color: brand.expensePalette[0],
    fontSize: 16,
    fontWeight: '600',
  },
});
