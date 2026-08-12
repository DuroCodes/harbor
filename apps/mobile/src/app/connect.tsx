import { Button, Column, Spacer, Text } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  createPlaidLinkSession,
  type LinkExit,
  type LinkSuccess,
} from 'react-native-plaid-link-sdk';

import { Host } from '@/components/ui/Host';
import { useApp } from '@/context/app';
import { brand, surface } from '@/theme/tokens';
import { plaidProxy } from '@/lib/plaid/client';

export default function ConnectScreen() {
  const app = useApp();
  const [statusMessage, setStatusMessage] = useState(
    'Prepare a link token from your Plaid proxy, then open Link.'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // BottomSheet Settings can't present over this formSheet — dismiss first, then open.
  const openSettings = () => {
    router.back();
    setTimeout(() => {
      app.openSettings();
    }, 450);
  };

  const openLink = async (token: string) => {
    const session = await createPlaidLinkSession({
      token,
      onSuccess: (success: LinkSuccess) => {
        void (async () => {
          setStatusMessage('Exchanging connection…');
          setIsLoading(true);
          try {
            await app.connectWithPublicToken({
              publicToken: success.publicToken,
              institutionName: success.metadata.institution?.name,
              institutionID: success.metadata.institution?.id,
            });
            router.back();
          } catch (err) {
            setErrorMessage(
              err instanceof Error ? err.message : 'Could not connect.'
            );
          } finally {
            setIsLoading(false);
          }
        })();
      },
      onExit: (exit: LinkExit) => {
        if (exit.error?.displayMessage || exit.error?.errorMessage) {
          setErrorMessage(
            exit.error.displayMessage ??
              exit.error.errorMessage ??
              'Link closed.'
          );
        }
      },
      onEvent: () => {},
    });
    await session.open();
  };

  const prepareAndOpenLink = async () => {
    setErrorMessage(null);
    if (linkToken) {
      setIsLoading(true);
      try {
        await openLink(linkToken);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not open Link.'
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await plaidProxy.createLinkToken(
        app.proxyURL,
        app.proxyAPIKey
      );
      setLinkToken(response.linkToken);
      setStatusMessage('Link is ready. Continue to choose your institution.');
      await openLink(response.linkToken);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not create link token.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Connect Account', headerShown: true }} />
      <Host>
        <Column spacing={16} alignment="start" style={{ padding: 24 }}>
          <Text
            textStyle={{
              fontSize: 15,
              color: surface.labelSecondary,
              lineHeight: 22,
            }}
          >
            {
              'Connect an institution through Plaid Sandbox. Your Plaid secret stays on the proxy — never in this app.'
            }
          </Text>

          {!app.proxyConfigured ? (
            <>
              <Text
                textStyle={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: surface.label,
                }}
              >
                Proxy Required
              </Text>
              <Text
                textStyle={{
                  fontSize: 14,
                  color: surface.labelMuted,
                  lineHeight: 20,
                }}
              >
                {
                  'Configure the Plaid proxy URL and API key in Settings before linking accounts.'
                }
              </Text>
              <Button
                label="Open Settings"
                variant="filled"
                onPress={openSettings}
              />
            </>
          ) : (
            <>
              <Text
                textStyle={{
                  fontSize: 15,
                  color: surface.label,
                  lineHeight: 22,
                }}
              >
                {statusMessage}
              </Text>
              {errorMessage ? (
                <Text
                  textStyle={{
                    fontSize: 13,
                    color: brand.expensePalette[0],
                    lineHeight: 18,
                  }}
                >
                  {errorMessage}
                </Text>
              ) : null}
              {isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={brand.accent} />
                </View>
              ) : (
                <Button
                  label={linkToken ? 'Open Plaid Link' : 'Create Link Session'}
                  variant="filled"
                  onPress={() => {
                    void prepareAndOpenLink();
                  }}
                />
              )}
            </>
          )}

          <Button label="Close" variant="text" onPress={() => router.back()} />
          <Spacer />
        </Column>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
