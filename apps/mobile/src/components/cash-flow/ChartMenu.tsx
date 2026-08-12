import { Button, Host, HStack, Image, Menu, Text } from '@expo/ui/swift-ui';
import { background, clipShape, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { Platform, View } from 'react-native';

import { brand, surface } from '@/theme/tokens';

export type ChartKind = 'sankey' | 'pie';

type Props = {
  value: ChartKind;
  onChange: (kind: ChartKind) => void;
};

/**
 * Native SwiftUI Menu that overlays content (glass on iOS 26).
 * Host seedColor tints menu actions with the app's accent color.
 */
export function ChartMenu({ value, onChange }: Props) {
  const menu = (
    <Menu
      label={
        <HStack
          spacing={4}
          modifiers={[
            padding({ horizontal: 10, vertical: 6 }),
            background(surface.elevated),
            clipShape('capsule'),
          ]}
        >
          <Text
            modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(surface.labelMuted)]}
          >
            {value === 'sankey' ? 'Sankey' : 'Pie'}
          </Text>
          <Image systemName="chevron.up.chevron.down" size={10} color={surface.labelMuted} />
        </HStack>
      }
    >
      <Button
        label="Sankey"
        systemImage={value === 'sankey' ? 'checkmark' : undefined}
        onPress={() => onChange('sankey')}
      />
      <Button
        label="Pie"
        systemImage={value === 'pie' ? 'checkmark' : undefined}
        onPress={() => onChange('pie')}
      />
    </Menu>
  );

  if (Platform.OS !== 'ios') {
    return (
      <Host matchContents colorScheme="dark" seedColor={brand.accent}>
        {menu}
      </Host>
    );
  }

  return (
    <View style={{ alignSelf: 'flex-end' }}>
      <Host
        matchContents
        colorScheme="dark"
        seedColor={brand.accent}
        style={{ alignSelf: 'flex-end' }}
      >
        {menu}
      </Host>
    </View>
  );
}
