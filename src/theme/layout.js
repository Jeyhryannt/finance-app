import { Platform, StatusBar } from 'react-native';
// Jarak aman atas agar konten tidak menabrak status bar (jam, sinyal, baterai) di Android.
export const topInset = Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0;
