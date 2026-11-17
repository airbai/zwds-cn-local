import '@/polyfills';
import '@/i18n';

import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  useFonts,
} from '@expo-google-fonts/cormorant-garamond';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { onPlusGranted, ownedPlans } from '@/lib/purchases';
import { useStore } from '@/store';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsReady] = useFonts({ CormorantGaramond_400Regular, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold });
  const hydrated = useStore((s) => s.hydrated);
  const ready = fontsReady && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // StoreKit is the source of truth for Plus: pick up renewals, lapses and refunds at launch.
  useEffect(() => {
    if (!hydrated) return;
    onPlusGranted((plan) => useStore.getState().grant(plan));
    ownedPlans()
      .then((owned) => useStore.getState().setOwned(owned))
      .catch(() => {});
  }, [hydrated]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.ink }} />;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ink }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
