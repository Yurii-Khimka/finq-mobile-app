import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isAuthenticated } from '../src/store/auth';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    isAuthenticated().then((auth) => {
      setLoggedIn(auth);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!loggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (loggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, loggedIn, segments]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
