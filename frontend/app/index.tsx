import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LaunchScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation sequence
    const animationSequence = Animated.sequence([
      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),
      // Small bounce effect
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(600),
      // Fade out and navigate
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      // Navigate to login screen after animation
      router.replace('/login');
    });

    // Cleanup function
    return () => {
      animationSequence.stop();
    };
  }, [fadeAnim, scaleAnim, rotateAnim]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      { scale: scaleAnim },
    ],
  };

  return (
    <LinearGradient
      colors={['#F0F9FF', '#E0F2FE', '#BAE6FD']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedStyle]}>
          <Image
            source={require('@/assets/images/app-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, animatedStyle]}>
          <Animated.Text style={styles.appName}>
            Wohnblitzer
          </Animated.Text>
          <Animated.Text style={styles.tagline}>
            Dein Immobilien-Assistent
          </Animated.Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
}); 