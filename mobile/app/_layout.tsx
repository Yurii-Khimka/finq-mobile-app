import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isAuthenticated } from '../src/store/auth';
import { initDB } from '../src/db';
import { syncAll, replayPendingWrites } from '../src/db/sync';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { getPendingCount } from '../src/db/queries';
import { fontSize } from '../src/tokens';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function RootContent() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const { theme, colors } = useTheme();

  useEffect(() => {
    initDB();
    isAuthenticated().then((auth) => {
      setLoggedIn(auth);
      setReady(true);
      if (auth) {
        syncAll()
          .then(() => replayPendingWrites())
          .catch(() => { /* offline, use cached data */ });
      }
    });
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingCount());
    }, 5000);
    return () => clearInterval(interval);
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

  const styles = useMemo(() => StyleSheet.create({
    offlineBar: {
      backgroundColor: colors.warning,
      paddingVertical: 6,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    offlineText: {
      color: '#fff',
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    pendingBar: {
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 4,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    pendingText: {
      color: colors.warning,
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
  }), [colors]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            You're offline — changes will sync when connected
          </Text>
        </View>
      )}
      {isOnline && pendingCount > 0 && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText}>
            {pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync
          </Text>
        </View>
      )}
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}
