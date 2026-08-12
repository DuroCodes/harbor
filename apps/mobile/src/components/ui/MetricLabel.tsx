import { StyleSheet, Text, View } from 'react-native';

import { surface, theme, typo } from '@/theme/tokens';

type Props = {
  title: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
};

export function MetricLabel({
  title,
  value,
  emphasis = false,
  positive = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text
        style={[
          emphasis ? typo.amount(22) : typo.amount(17),
          { color: positive ? theme.positive : surface.label },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 12,
    color: surface.labelMuted,
    marginBottom: 4,
  },
});
