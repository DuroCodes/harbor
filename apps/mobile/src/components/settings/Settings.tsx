import {
  BottomSheet,
  Button,
  Form,
  Group,
  Host,
  HStack,
  Section,
  SecureField,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  listRowBackground,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  scrollContentBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { PasscodeSheet } from '@/components/security/PasscodeSheet';
import { brand, surface } from '@/theme/tokens';
import { useApp } from '@/context/app';

type Props = {
  isPresented: boolean;
  onDismiss: () => void;
};

export function Settings({ isPresented, onDismiss }: Props) {
  const { width } = useWindowDimensions();
  const app = useApp();
  const proxyURL = useNativeState(app.proxyURL);
  const apiKey = useNativeState(app.proxyAPIKey);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  useEffect(() => {
    if (!isPresented) return;
    void proxyURL.set(app.proxyURL);
    void apiKey.set(app.proxyAPIKey);
    setSavedMessage(null);
    void app.refreshLockState();
    // Only re-sync when the sheet opens or proxy values change — not when
    // useNativeState identities churn (that remounts/dismisses the sheet).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [isPresented, app.proxyURL, app.proxyAPIKey]);

  return (
    <>
      <Host
        colorScheme="dark"
        seedColor={brand.accent}
        style={{ position: 'absolute', width }}
        pointerEvents="none"
      >
        <BottomSheet
          isPresented={isPresented}
          onIsPresentedChange={(open) => {
            if (!open) onDismiss();
          }}
          onDismiss={onDismiss}
        >
          <Group
            modifiers={[
              presentationDetents(['medium', 'large']),
              presentationDragIndicator('visible'),
              presentationBackground(surface.canvas),
            ]}
          >
            <VStack
              spacing={0}
              modifiers={[
                frame({
                  maxWidth: Infinity,
                  maxHeight: Infinity,
                  alignment: 'topLeading',
                }),
                background(surface.canvas),
              ]}
            >
              <HStack
                modifiers={[
                  padding({ horizontal: 16, top: 12, bottom: 8 }),
                  frame({ maxWidth: Infinity }),
                ]}
              >
                <Text
                  modifiers={[
                    font({ size: 17, weight: 'semibold' }),
                    foregroundStyle(surface.label),
                  ]}
                >
                  Settings
                </Text>
                <Spacer />
                <Button
                  label="Done"
                  modifiers={[
                    buttonStyle('glassProminent'),
                    tint(brand.accent),
                  ]}
                  onPress={onDismiss}
                />
              </HStack>

              <Form
                modifiers={[
                  scrollContentBackground('hidden'),
                  background(surface.canvas),
                  tint(brand.accent),
                  frame({ maxWidth: Infinity, maxHeight: Infinity }),
                ]}
              >
                <Section title="Plaid Proxy">
                  <TextField
                    text={proxyURL}
                    placeholder="Proxy URL"
                    modifiers={[
                      keyboardType('url'),
                      autocorrectionDisabled(),
                      listRowBackground(surface.elevated),
                      foregroundStyle(surface.label),
                    ]}
                  />
                  <SecureField
                    text={apiKey}
                    placeholder="API key"
                    modifiers={[
                      autocorrectionDisabled(),
                      listRowBackground(surface.elevated),
                      foregroundStyle(surface.label),
                    ]}
                  />
                  <Button
                    label="Save"
                    modifiers={[
                      buttonStyle('glass'),
                      tint(brand.accent),
                      listRowBackground(surface.elevated),
                    ]}
                    onPress={async () => {
                      const url = String(proxyURL.value ?? '');
                      const key = String(apiKey.value ?? '');
                      await app.saveProxySettings(url, key);
                      setSavedMessage('Saved.');
                    }}
                  />
                  {savedMessage ? (
                    <Text
                      modifiers={[
                        font({ size: 13 }),
                        foregroundStyle(surface.labelMuted),
                        listRowBackground(surface.elevated),
                      ]}
                    >
                      {savedMessage}
                    </Text>
                  ) : null}
                </Section>

                <Section
                  title="Security"
                  footer={
                    <Text modifiers={[foregroundStyle(surface.labelMuted)]}>
                      {app.lockEnabled
                        ? 'Harbor locks on launch. Enter your 4–6 digit passcode to unlock.'
                        : 'Add a 4–6 digit Harbor passcode to lock the app.'}
                    </Text>
                  }
                >
                  {app.lockEnabled ? (
                    <>
                      <Button
                        label="Change Passcode"
                        modifiers={[
                          buttonStyle('glass'),
                          tint(brand.accent),
                          listRowBackground(surface.elevated),
                        ]}
                        onPress={() => setShowPasscode(true)}
                      />
                      <Button
                        label="Turn Off App Lock"
                        role="destructive"
                        modifiers={[
                          buttonStyle('glass'),
                          listRowBackground(surface.elevated),
                        ]}
                        onPress={() => {
                          void app.clearAppLock();
                        }}
                      />
                    </>
                  ) : (
                    <Button
                      label="Set Passcode…"
                      modifiers={[
                        buttonStyle('glass'),
                        tint(brand.accent),
                        listRowBackground(surface.elevated),
                      ]}
                      onPress={() => setShowPasscode(true)}
                    />
                  )}
                </Section>

                <Section title="Refresh Accounts">
                  <Button
                    label={app.isSyncing ? 'Refreshing…' : 'Refresh Now'}
                    modifiers={[
                      buttonStyle('glass'),
                      tint(brand.accent),
                      listRowBackground(surface.elevated),
                    ]}
                    onPress={() => {
                      void app.refreshAll();
                    }}
                  />
                  {app.lastSyncError ? (
                    <Text
                      modifiers={[
                        font({ size: 13 }),
                        foregroundStyle(brand.expensePalette[0]),
                        listRowBackground(surface.elevated),
                      ]}
                    >
                      {app.lastSyncError}
                    </Text>
                  ) : null}
                </Section>
              </Form>
            </VStack>
          </Group>
        </BottomSheet>
      </Host>

      <PasscodeSheet
        isPresented={showPasscode}
        changing={app.lockEnabled}
        onDismiss={() => setShowPasscode(false)}
        onSaved={() => {
          void app.refreshLockState();
        }}
      />
    </>
  );
}
