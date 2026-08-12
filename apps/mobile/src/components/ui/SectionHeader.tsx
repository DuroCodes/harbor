import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { brand, surface } from '@/theme/tokens';

type Props = {
  title: string;
  systemImage?: string;
};

export function SectionHeader({ title, systemImage }: Props) {
  return (
    <View style={styles.row}>
      {systemImage ? (
        <SymbolView
          name={systemImage as any}
          size={14}
          tintColor={`${brand.accent}E6`}
          weight="medium"
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: surface.labelSecondary,
  },
});
