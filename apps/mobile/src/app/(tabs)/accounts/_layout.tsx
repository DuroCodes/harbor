import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme/nav';

export default function AccountsStackLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Accounts' }} />
    </Stack>
  );
}
