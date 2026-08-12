import { SymbolView } from 'expo-symbols';
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { AccountRow } from '@/components/rows/AccountRow';
import { brand, surface, layout } from '@/theme/tokens';
import { useApp } from '@/context/app';
import { ACCOUNT_GROUP_META, accountGroup, type Account, type AccountGroup } from '@/lib/types';

export default function AccountsScreen() {
  const app = useApp();

  const sections = useMemo(() => {
    const groups: AccountGroup[] = ['cash', 'credit', 'investments', 'other'];
    return groups
      .map((group) => ({
        title: ACCOUNT_GROUP_META[group].title,
        data: app.accounts.filter((a) => accountGroup(a) === group),
      }))
      .filter((s) => s.data.length > 0);
  }, [app.accounts]);

  const unlink = (account: Account) => {
    const institutionID = account.institutionID;
    if (!institutionID) return;
    void (async () => {
      try {
        await app.unlinkInstitution(institutionID);
      } catch (err) {
        Alert.alert(
          'Couldn’t Unlink',
          err instanceof Error ? err.message : 'Something went wrong.'
        );
      }
    })();
  };

  return (
    <View style={layout.screen}>
      <Stack.Toolbar placement="right" tintColor={brand.accent}>
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Connect account"
          tintColor={brand.accent}
          onPress={app.openConnect}
        />
      </Stack.Toolbar>

      {app.accounts.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView
            name="building.columns"
            size={40}
            tintColor={surface.labelMuted}
            weight="light"
          />
          <Text style={styles.emptyTitle}>No Accounts</Text>
          <Text style={styles.emptyBody}>Connect an institution to get started.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => (
            <Swipeable
              overshootRight={false}
              renderRightActions={() => (
                <RectButton style={styles.unlinkAction} onPress={() => unlink(item)}>
                  <Text style={styles.unlinkLabel}>Unlink</Text>
                </RectButton>
              )}
            >
              <Pressable
                style={[
                  styles.cardRow,
                  index === 0 && styles.cardTop,
                  index === section.data.length - 1 && styles.cardBottom,
                ]}
                onPress={() => app.openAccount(item.id)}
              >
                <AccountRow
                  account={item}
                  institution={item.institutionID ? app.institutionsById[item.institutionID] : null}
                />
              </Pressable>
            </Swipeable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '500',
    color: surface.labelMuted,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardRow: {
    backgroundColor: surface.elevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTop: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  cardBottom: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: surface.hairline,
    marginLeft: 16,
  },
  unlinkAction: {
    backgroundColor: brand.expensePalette[0],
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  unlinkLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 21,
    marginTop: 12,
  },
});
