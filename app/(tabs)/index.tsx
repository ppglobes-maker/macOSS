import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const GOOGLE_IMAGE_KEY = 'google_login_image_uri';

export default function HomeScreen() {
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [loginPressed, setLoginPressed] = useState(false);
  const [saveLoginChecked, setSaveLoginChecked] = useState(true);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [googleImageUri, setGoogleImageUri] = useState<string | null>(null);
  const [showGoogleImageScreen, setShowGoogleImageScreen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const isInputFocused = usernameFocused || passwordFocused;
  const isLoginReady = usernameOrEmail.trim().length > 0 && password.length > 0;
  const passwordMask = password.length > 0 ? new Array(password.length).fill('\u2022').join(' ') : '';
  const loginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadStoredImage = async () => {
      try {
        const storedUri = await AsyncStorage.getItem(GOOGLE_IMAGE_KEY);
        if (!storedUri) {
          return;
        }
        if (storedUri.startsWith('file://')) {
          const info = await FileSystem.getInfoAsync(storedUri);
          if (!info.exists) {
            await AsyncStorage.removeItem(GOOGLE_IMAGE_KEY);
            return;
          }
        }
        setGoogleImageUri(storedUri);
      } catch {
        // Keep UI usable even if storage read fails.
      }
    };
    void loadStoredImage();
  }, []);

  useEffect(() => {
    if (!isLoggingIn) {
      spinnerAnim.stopAnimation();
      spinnerAnim.setValue(0);
      return;
    }

    Animated.loop(
      Animated.timing(spinnerAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [isLoggingIn, spinnerAnim]);

  useEffect(() => {
    return () => {
      if (loginTimerRef.current) {
        clearTimeout(loginTimerRef.current);
      }
    };
  }, []);

  const onGoogle = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to pick an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const pickedAsset = result.assets[0];
      const pickedUri = pickedAsset.uri;
      let savedUri = pickedUri;

      if (FileSystem.documentDirectory) {
        const cleanUri = pickedUri.split('?')[0];
        const ext = cleanUri.includes('.') ? cleanUri.substring(cleanUri.lastIndexOf('.')) : '.jpg';
        const target = `${FileSystem.documentDirectory}google-login-image${ext}`;
        const existing = await FileSystem.getInfoAsync(target);
        if (existing.exists) {
          await FileSystem.deleteAsync(target, { idempotent: true });
        }
        await FileSystem.copyAsync({ from: pickedUri, to: target });
        savedUri = target;
      }

      setGoogleImageUri(savedUri);
      await AsyncStorage.setItem(GOOGLE_IMAGE_KEY, savedUri);
    } catch {
      Alert.alert('Error', 'Could not save selected image.');
    }
  };
  const onApple = () => Alert.alert('Apple', 'Apple button clicked');
  const onLogin = () => {
    setLoginPressed(false);
    setShowLoginScreen(true);
  };
  const onSignup = () => Alert.alert('Sign Up', 'Sign Up button clicked');
  const onLoginPressed = () => {
    if (!isLoginReady) {
      return;
    }
    if (!googleImageUri) {
      Alert.alert('Add image first', 'Tap Continue with Google and choose an image.');
      return;
    }
    if (isLoggingIn) {
      return;
    }
    setIsLoggingIn(true);
    loginTimerRef.current = setTimeout(() => {
      setShowGoogleImageScreen(true);
      loginTimerRef.current = null;
    }, 2000);
  };
  const onToggleSaveLogin = () => {
    setSaveLoginChecked((v) => !v);
  };

  if (showGoogleImageScreen && googleImageUri) {
    return (
      <View style={styles.screen}>
        <Pressable
          style={styles.fullScreenImageTap}
          onPress={() => {
            setShowGoogleImageScreen(false);
            setIsLoggingIn(false);
          }}>
          <Image source={{ uri: googleImageUri }} style={styles.fullScreenImage} resizeMode="cover" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={
          showLoginScreen
            ? isInputFocused
              ? saveLoginChecked
                ? require('../../loginopen-full.png')
                : require('../../loginopen-full-unchecked.png')
              : saveLoginChecked
                ? require('../../login.png')
                : require('../../loginunchecked.png')
            : loginPressed
              ? require('../../login-click.png')
              : require('../../start-screen.png')
        }
        style={styles.image}
        fadeDuration={0}
        resizeMode="cover">
        {!showLoginScreen ? (
          <>
            <Pressable style={styles.googleTap} onPress={onGoogle} />
            <Pressable style={styles.appleTap} onPress={onApple} />
            <Pressable
              style={styles.loginTap}
              onPress={onLogin}
              onPressIn={() => setLoginPressed(true)}
              onPressOut={() => setLoginPressed(false)}
            />
            <Pressable style={styles.signupTap} onPress={onSignup} />
          </>
        ) : (
          <>
            <TextInput
              style={styles.usernameInput}
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              allowFontScaling={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              placeholder=""
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
            />
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              allowFontScaling={false}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              placeholder=""
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Text pointerEvents="none" style={styles.passwordMaskText}>
              {passwordMask}
            </Text>
            <Pressable
              style={styles.backArrowTap}
              onPress={() => {
                Keyboard.dismiss();
                setShowLoginScreen(false);
                setLoginPressed(false);
                setUsernameFocused(false);
                setPasswordFocused(false);
              }}
            />
            {isInputFocused ? (
              <Pressable
                style={styles.saveLoginOverlayOpenTap}
                onPress={onToggleSaveLogin}
                hitSlop={14}
              />
            ) : (
              <>
                <Pressable
                  style={styles.saveLoginCheckboxTap}
                  onPress={onToggleSaveLogin}
                  hitSlop={18}
                />
                <Pressable
                  style={styles.saveLoginTextTap}
                  onPress={onToggleSaveLogin}
                  hitSlop={18}
                />
              </>
            )}
            {isLoginReady ? (
              isInputFocused ? (
                <Pressable style={styles.loginButtonReadyOpenOverlay} onPress={onLoginPressed} disabled={isLoggingIn}>
                  <Image
                    source={isLoggingIn ? require('../../loginloader.png') : require('../../loginbutton.png')}
                    style={styles.loginButtonReadyImage}
                    resizeMode="contain"
                  />
                  {isLoggingIn ? (
                    <View pointerEvents="none" style={styles.loaderWrap}>
                      <Animated.View
                        style={[
                          styles.loaderOuter,
                          {
                            transform: [
                              {
                                rotate: spinnerAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg'],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.loaderInner,
                          {
                            transform: [
                              {
                                rotate: spinnerAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['360deg', '0deg'],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </Pressable>
              ) : (
                <Pressable style={styles.loginButtonReadyClosedOverlay} onPress={onLoginPressed} disabled={isLoggingIn}>
                  <Image
                    source={isLoggingIn ? require('../../loginloader.png') : require('../../loginbutton.png')}
                    style={styles.loginButtonReadyImage}
                    resizeMode="contain"
                  />
                  {isLoggingIn ? (
                    <View pointerEvents="none" style={styles.loaderWrap}>
                      <Animated.View
                        style={[
                          styles.loaderOuter,
                          {
                            transform: [
                              {
                                rotate: spinnerAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg'],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.loaderInner,
                          {
                            transform: [
                              {
                                rotate: spinnerAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['360deg', '0deg'],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  ) : null}
                </Pressable>
              )
            ) : !isInputFocused ? (
              <Pressable
                style={styles.loginButtonTapClosed}
                onPress={onLoginPressed}
              />
            ) : (
              <Pressable
                style={styles.loginButtonTapOpen}
                onPress={onLoginPressed}
              />
            )}
            {isInputFocused ? <View pointerEvents="none" style={styles.lowerControlsHideOverlay} /> : null}
          </>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenImageTap: {
    flex: 1,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  googleTap: {
    position: 'absolute',
    left: '7.5%',
    right: '7.5%',
    top: '65.7%',
    height: '5.8%',
    borderRadius: 999,
  },
  appleTap: {
    position: 'absolute',
    left: '7.5%',
    right: '7.5%',
    top: '74.8%',
    height: '5.8%',
    borderRadius: 999,
  },
  loginTap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '81.5%',
    height: '6.25%',
  },
  signupTap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '87.75%',
    height: '6.25%',
  },
  backArrowTap: {
    position: 'absolute',
    left: '2%',
    top: '4.5%',
    width: '14%',
    height: '8%',
  },
  saveLoginOverlayOpenTap: {
    position: 'absolute',
    left: '12.5%',
    right: '8%',
    top: '37.8%',
    height: '5.0%',
    zIndex: 50,
  },
  saveLoginCheckboxTap: {
    position: 'absolute',
    left: '18.5%',
    width: '7%',
    top: '87.2%',
    height: '4.2%',
    zIndex: 30,
  },
  saveLoginTextTap: {
    position: 'absolute',
    left: '25.5%',
    right: '8%',
    top: '87.2%',
    height: '4.2%',
    zIndex: 30,
  },
  loginButtonTapClosed: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '66.8%',
    height: '5.9%',
    zIndex: 40,
  },
  loginButtonReadyClosedOverlay: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
    top: '61.5%',
    height: '5.9%',
    zIndex: 41,
  },
  loginButtonTapOpen: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '52.4%',
    height: '5.9%',
    zIndex: 40,
  },
  loginButtonReadyOpenOverlay: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
    top: '51%',
    height: '5.9%',
    zIndex: 41,
  },
  loginButtonReadyImage: {
    width: '100%',
    height: '100%',
  },
  loaderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopWidth: 2,
    borderTopColor: '#FFFFFF',
  },
  loaderInner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopWidth: 2,
    borderTopColor: '#FFFFFF',
  },
  lowerControlsHideOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  usernameInput: {
    position: 'absolute',
    left: '14.5%',
    right: '14.5%',
    top: '24.2%',
    height: '4.3%',
    color: '#1C1C1C',
    fontSize: 17,
    fontFamily: 'Avenir Next',
    fontWeight: '500',
    lineHeight: 22,
    paddingTop: 2,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  passwordInput: {
    position: 'absolute',
    left: '14.5%',
    right: '20.5%',
    top: '31.6%',
    height: '4.3%',
    color: 'transparent',
    fontSize: 17,
    fontFamily: 'Avenir Next',
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0,
    paddingTop: 2,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  passwordMaskText: {
    position: 'absolute',
    left: '14.5%',
    right: '20.5%',
    top: '31.6%',
    height: '4.3%',
    color: '#1C1C1C',
    fontSize: 14,
    fontFamily: 'Avenir Next',
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0,
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
});
