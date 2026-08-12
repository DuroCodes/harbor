import { StyleSheet, Text, View } from 'react-native';

import { surface, typo } from '@/theme/tokens';
import { format } from '@/lib/format';
import {
  accountDisplayName,
  type Account,
  type Institution,
} from '@/lib/types';

type Props = {
  account: Account;
  institution?: Institution | null;
};

export function AccountRow({ account, institution }: Props) {
  return (
    <View style={styles.row} accessibilityRole="summary">
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {accountDisplayName(account)}
        </Text>
        <Text style={[typo.amount(22), { color: surface.label }]}>
          {format.money(account.currentBalance)}
        </Text>
      </View>
      <View style={styles.right}>
        {institution?.name ? (
          <Text style={styles.meta} numberOfLines={1}>
            {institution.name}
          </Text>
        ) : null}
        {account.mask ? (
          <Text
            style={[styles.meta, typo.amount(11, '400')]}
          >{`••••${account.mask}`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  left: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    color: surface.labelMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '40%',
  },
  meta: {
    fontSize: 11,
    color: surface.labelMuted,
  },
});
