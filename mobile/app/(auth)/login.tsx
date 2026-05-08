import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fontSize, spacing } from '../../src/tokens';
import { useTheme } from '../../src/context/ThemeContext';
import { auth } from '../../src/api/client';
import { saveToken } from '../../src/store/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '';

  async function handleLogin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setLoading(true);
    try {
      const tokens = await auth.login(email.trim(), password);
      await saveToken(tokens.access_token);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('401')) {
        setError('Invalid email or password');
      } else {
        setError('Cannot connect to server');
      }
    } finally {
      setLoading(false);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      maxWidth: 360,
      alignSelf: 'center',
      width: '100%',
    },
    appTitle: {
      fontSize: fontSize.xxl,
      fontWeight: '700',
      color: colors.primary,
    },
    subtitle: {
      fontSize: fontSize.lg,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    input: {
      width: '100%',
      height: 48,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      color: colors.text,
      fontSize: fontSize.md,
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.sm,
      alignSelf: 'flex-start',
    },
    button: {
      width: '100%',
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    link: {
      color: colors.textSecondary,
      fontSize: fontSize.sm,
      textDecorationLine: 'underline',
    },
    spacerXs: { height: spacing.sm },
    spacerSm: { height: 12 },
    spacerMd: { height: spacing.md },
    spacerXl: { height: spacing.xl },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Text style={styles.appTitle}>finQ</Text>
          <Text style={styles.subtitle}>Login</Text>

          <View style={styles.spacerXl} />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.spacerSm} />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.spacerXs} />

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <View style={styles.spacerMd} />

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.spacerMd} />

          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/register'); }}>
            <Text style={styles.link}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
