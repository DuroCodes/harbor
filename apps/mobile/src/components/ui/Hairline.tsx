import { StyleSheet, View } from 'react-native';

import { surface } from '@/theme/tokens';

type Props = {
  leadingInset?: number;
};

export function Hairline({ leadingInset = 0 }: Props) {
  return (
    <View
      style={[
        styles.line,
        { marginLeft: leadingInset, backgroundColor: surface.hairline },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
