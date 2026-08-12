import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme/nav';

export default function CashFlowStackLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Cash Flow' }} />
    </Stack>
  );
}
