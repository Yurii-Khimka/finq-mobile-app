import { useMemo, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { fontSize } from '../tokens';
import { useTheme } from '../context/ThemeContext';

const DELETE_WIDTH = 80;
const SWIPE_THRESHOLD = -40;

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
}

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  function handleDelete() {
    Alert.alert(
      'Delete transaction',
      'This will reverse the balance change. Continue?',
      [
        { text: 'Cancel', onPress: () => snapBack() },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  }

  function snapBack() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { position: 'relative', overflow: 'hidden' },
    deleteArea: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: DELETE_WIDTH,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
    content: { backgroundColor: colors.background },
  }), [colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.deleteArea}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
      <Animated.View
        style={[styles.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
