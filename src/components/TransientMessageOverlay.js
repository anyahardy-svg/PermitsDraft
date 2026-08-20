import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { registerTransientMessageOverlay } from '../utils/transientMessage';

const TransientMessageOverlay = () => {
  const [message, setMessage] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const showMessage = useCallback((text, durationMs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(text);
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessage(null);
      });
    }, durationMs);
  }, [opacity]);

  useEffect(() => {
    registerTransientMessageOverlay(showMessage);
    return () => {
      registerTransientMessageOverlay(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showMessage]);

  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.banner, { opacity }]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 56,
    zIndex: 99999,
    elevation: 99999,
  },
  banner: {
    backgroundColor: '#10B981',
    paddingVertical: 22,
    paddingHorizontal: 36,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    maxWidth: '92%',
    minWidth: 280,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default TransientMessageOverlay;
