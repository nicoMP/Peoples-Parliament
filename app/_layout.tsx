import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, Button } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // Import icon library
import BillCarousel from '@/components/BillCarousel';
import BillDetails from '@/components/BillWebview';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BillsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BillCarousel" component={BillCarousel} options={{ title: 'Parliament Bills' }} />
      <Stack.Screen name="BillDetails" component={BillDetails} options={{ title: 'Bill Details' }} />
    </Stack.Navigator>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  React.useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tab.Navigator>
        <Tab.Screen
          name="Bills"
          component={BillsStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="description" size={size} color={color} /> // Bill icon
            ),
          }}
        />
        {/* Add other tabs here if necessary */}
      </Tab.Navigator>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
