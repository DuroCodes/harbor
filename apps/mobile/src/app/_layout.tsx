import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { LockScreen } from '@/components/security/LockScreen';
import { Settings } from '@/components/settings/Settings';
import { brand, surface } from '@/theme/tokens';
import { AppProvider, useApp } from '@/context/app';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const HarborDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.accent,
    background: surface.canvas,
    card: surface.canvas,
    text: surface.label,
    border: surface.hairline,
    notification: brand.accent,
  },
};

const iosScrollEdge =
  Platform.OS === 'ios'
    ? {
        scrollEdgeEffects: {
          top: 'soft' as const,
          bottom: 'automatic' as const,
          left: 'hidden' as const,
          right: 'hidden' as const,
        },
      }
    : {};

const harborFormSheet = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: true,
  headerShadowVisible: false,
  headerTintColor: brand.accent,
  headerTitleStyle: { color: surface.label, fontWeight: '600' as const },
  headerStyle: { backgroundColor: surface.canvas },
  contentStyle: { backgroundColor: surface.canvas },
};

function HarborSettingsSheet() {
  const { settingsOpen, closeSettings } = useApp();
  return <Settings isPresented={settingsOpen} onDismiss={closeSettings} />;
}

function HarborRoot() {
  const app = useApp();

  if (app.lockEnabled && !app.lockUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: surface.canvas }}>
        <StatusBar style="light" />
        <LockScreen
          biometricsEnabled={app.lockBiometricsEnabled}
          biometricsAvailable={app.lockBiometricsAvailable}
          biometricsName={app.lockBiometricsName}
          onUnlocked={app.unlockApp}
        />
      </View>
    );
  }

  return (
    <ThemeProvider value={HarborDarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTransparent: Platform.OS === 'ios',
          headerTintColor: brand.accent,
          headerTitleStyle: { color: surface.label, fontWeight: '600' },
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle:
            Platform.OS === 'ios'
              ? { backgroundColor: 'transparent' }
              : { backgroundColor: surface.canvas },
          contentStyle: { backgroundColor: surface.canvas },
          ...iosScrollEdge,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            // Used as the back-button label when pushing account/transaction.
            title: 'Home',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="connect"
          options={{
            ...harborFormSheet,
            sheetAllowedDetents: [0.65, 1],
            title: 'Connect Account',
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            title: 'Transaction',
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="account/[id]"
          options={{
            title: 'Account',
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="net-worth"
          options={{
            title: 'Net Worth',
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>
      <HarborSettingsSheet />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <HarborRoot />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
