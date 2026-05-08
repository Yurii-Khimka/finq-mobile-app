import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { isAuthenticated } from '../src/store/auth';
import { initDB } from '../src/db';
import { syncAll, replayPendingWrites } from '../src/db/sync';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { getPendingCount, getConfigValue } from '../src/db/queries';
import { fontSize, spacing } from '../src/tokens';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function RootContent() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const segments = useSegments();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const { theme, colors } = useTheme();

  async function promptBiometric() {
    setBiometricError('');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock finQ',
      fallbackLabel: 'Use passcode',
    });
    if (result.success) {
      setBiometricLocked(false);
    } else {
      setBiometricError('Authentication failed');
    }
  }

  useEffect(() => {
    initDB();
    isAuthenticated().then(async (auth) => {
      setLoggedIn(auth);
      if (auth) {
        const biometricEnabled = getConfigValue('biometric_lock') === 'true';
        if (biometricEnabled) {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && isEnrolled) {
            setBiometricLocked(true);
            setReady(true);
            // Prompt immediately
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Unlock finQ',
              fallbackLabel: 'Use passcode',
            });
            if (result.success) {
              setBiometricLocked(false);
            } else {
              setBiometricError('Authentication failed');
            }
          } else {
            setReady(true);
          }
        } else {
          setReady(true);
        }
        syncAll()
          .then(() => replayPendingWrites())
          .catch(() => { /* offline, use cached data */ });
      } else {
        setReady(true);
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
    if (!ready || biometricLocked) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!loggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (loggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, loggedIn, biometricLocked, segments]);

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
    lockScreen: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    lockTitle: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.lg,
    },
    lockIcon: {
      marginBottom: spacing.lg,
    },
    lockButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 220,
    },
    lockButtonText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    lockError: {
      color: colors.danger,
      fontSize: fontSize.sm,
      marginBottom: spacing.md,
    },
  }), [colors]);

  if (!ready) return null;

  if (biometricLocked) {
    return (
      <View style={styles.lockScreen}>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        <Text style={styles.lockTitle}>finQ</Text>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={colors.textSecondary}
          style={styles.lockIcon}
        />
        {biometricError !== '' && (
          <Text style={styles.lockError}>{biometricError}</Text>
        )}
        <TouchableOpacity style={styles.lockButton} onPress={promptBiometric}>
          <Text style={styles.lockButtonText}>
            {biometricError ? 'Try Again' : 'Unlock with Biometrics'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
