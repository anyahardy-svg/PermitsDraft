import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import {
  registerTransientMessageOverlay,
  registerTransientProgressOverlay,
} from '../utils/transientMessage';

const TransientMessageOverlay = () => {
  const [message, setMessage] = useState(null);
  const [progressMessage, setProgressMessage] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
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

  const showProgress = useCallback((text) => {
    if (!text) {
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setProgressMessage(null);
      });
      return;
    }

    setProgressMessage(text);
    progressOpacity.setValue(0);
    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [progressOpacity]);

  useEffect(() => {
    registerTransientMessageOverlay(showMessage);
    registerTransientProgressOverlay(showProgress);
    return () => {
      registerTransientMessageOverlay(null);
      registerTransientProgressOverlay(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showMessage, showProgress]);

  return (
    <>
      {progressMessage ? (
        <View pointerEvents="none" style={styles.container}>
          <Animated.View style={[styles.progressBanner, { opacity: progressOpacity }]}>
            <ActivityIndicator color="#FFFFFF" size="small" style={styles.progressSpinner} />
            <Text style={styles.progressText}>{progressMessage}</Text>
          </Animated.View>
        </View>
      ) : null}
      {message ? (
        <View pointerEvents="none" style={styles.container}>
          <Animated.View style={[styles.banner, { opacity }]}>
            <Text style={styles.text}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}
    </>
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
  progressBanner: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    maxWidth: '92%',
    minWidth: 280,
  },
  progressSpinner: {
    marginRight: 12,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default TransientMessageOverlay;
