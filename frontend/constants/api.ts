import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 8000;

function resolveHostFromExpo(): string | null {
  const hostUri = (Constants.expoConfig?.hostUri ?? '').split(':')[0];
  if (hostUri) return hostUri;
  // Fallback for older manifests
  const manifest: any = (Constants as any).manifest;
  const debuggerHost: string | undefined = manifest?.debuggerHost;
  if (debuggerHost) return debuggerHost.split(':')[0];
  return null;
}

const envUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL: string =
  envUrl ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : Platform.OS === 'web'
    ? 'http://localhost:8000'
    : (() => {
        const host = resolveHostFromExpo();
        return host ? `http://${host}:${DEFAULT_PORT}` : 'http://localhost:8000';
      })());


