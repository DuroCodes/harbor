import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';

import { useApp } from '@/context/app';
import { brand, surface } from '@/theme/tokens';

export const unstable_settings = {
  initialRouteName: 'home',
};

const tint =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ dark: brand.accent, light: brand.accent })
    : brand.accent;

const labelColor =
  Platform.OS === 'ios'
    ? DynamicColorIOS({
        dark: 'rgba(255,255,255,0.55)',
        light: 'rgba(255,255,255,0.55)',
      })
    : surface.labelSecondary;

/**
 * Home is always shown; Cash Flow / Activity / Accounts / Budgets appear once accounts exist.
 * Settings is a BottomSheet from Home, not a tab — see Settings.
 *
 * NativeTabs cannot dynamically add/remove tabs; use `hidden` instead.
 */
export default function TabLayout() {
  const { hasAccounts } = useApp();

  return (
    <NativeTabs
      tintColor={tint}
      labelStyle={{ color: labelColor }}
      disableTransparentOnScrollEdge
      backgroundColor={surface.canvas}
    >
      <NativeTabs.Trigger name="home" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="cash-flow"
        hidden={!hasAccounts}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Cash Flow</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="activity"
        hidden={!hasAccounts}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="accounts"
        hidden={!hasAccounts}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.columns" md="account_balance" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="budgets"
        hidden={!hasAccounts}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Budgets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.doc.horizontal" md="pie_chart" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
