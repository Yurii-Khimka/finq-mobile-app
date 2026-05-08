import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontSize } from '../tokens';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

interface NumPadProps {
  value: string;
  onValueChange: (val: string) => void;
}

export default function NumPad({ value, onValueChange }: NumPadProps) {
  function handlePress(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === '⌫') {
      onValueChange(value.slice(0, -1));
      return;
    }

    if (key === '.') {
      if (value.includes('.')) return;
      onValueChange(value === '' ? '0.' : value + '.');
      return;
    }

    // Max 2 decimal places
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1 && value.length - dotIndex > 2) return;

    // Max 10 digits before decimal
    const intPart = dotIndex !== -1 ? value.slice(0, dotIndex) : value;
    if (dotIndex === -1 && intPart.length >= 10) return;

    // Prevent leading zeros (allow "0.")
    if (value === '0' && key !== '.') {
      onValueChange(key);
      return;
    }

    onValueChange(value + key);
  }

  return (
    <View style={styles.container}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              activeOpacity={0.6}
              onPress={() => handlePress(key)}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  key: {
    width: 70,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
});
