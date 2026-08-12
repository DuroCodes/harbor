import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme/nav';

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
