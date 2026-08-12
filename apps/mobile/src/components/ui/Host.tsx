import { Host as NativeHost } from '@expo/ui';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { brand, surface } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Use when Host should size to its native SwiftUI/Compose content. */
  matchContents?: boolean;
};

/** Forces dark mode + accent tint for all nested @expo/ui native controls. */
export function Host({ children, matchContents }: Props) {
  return (
    <NativeHost
      colorScheme="dark"
      seedColor={brand.accent}
      style={styles.host}
      matchContents={matchContents}
      useViewportSizeMeasurement={!matchContents}
    >
      {children}
    </NativeHost>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: surface.canvas,
  },
});
