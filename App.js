import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAppLock from './src/hooks/useAppLock';
import useFinance from './src/hooks/useFinance';
import DashboardScreen from './src/screens/DashboardScreen';
import LockScreen from './src/screens/LockScreen';
import RecoveryScreen from './src/screens/RecoveryScreen';
import { colors } from './src/theme/colors';

const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
    <ActivityIndicator color={colors.primary} />
  </View>
);

export default function App() {
  const finance = useFinance();
  const lock = useAppLock();

  useEffect(() => {
    if (finance.status === 'recovered') {
      Alert.alert('Data dipulihkan', 'Data utama gagal dibaca, jadi dipulihkan dari cadangan otomatis terakhir. Perubahan terbaru mungkin belum tercakup.');
    }
  }, [finance.status]);

  let body;
  if (!lock.ready || finance.status === 'loading') body = <Loading />;
  else if (lock.locked) body = <LockScreen config={lock.config} onUnlock={lock.unlock} />;
  else if (finance.status === 'error' || finance.status === 'corrupt') body = <RecoveryScreen finance={finance} />;
  else body = <DashboardScreen finance={finance} lock={lock} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {body}
    </SafeAreaProvider>
  );
}
