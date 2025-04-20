import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '@src/types/navigation';
import { MaterialIcons } from '@expo/vector-icons';
import BillsStack from './stacks/BillsStack';
import MyBillsStack from './stacks/MyBillsStack';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

const Tab = createBottomTabNavigator<TabParamList>();

// Dummy component for the Profile tab since we're using router.push
const DummyScreen = () => <View />;

export default function MainTabs() {
  const router = useRouter();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#b22234',
        tabBarInactiveTintColor: 'gray',
      }}>
      <Tab.Screen
        name="BillsStack"
        component={BillsStack}
        options={{
          title: 'Bills',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="description" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBillsStack"
        component={MyBillsStack}
        options={{
          title: 'My Bills',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="save" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DummyScreen}
        listeners={{
          tabPress: (e) => {
            // Prevent default behavior
            e.preventDefault();
            // Navigate to the profile screen
            router.push('/profile');
          },
        }}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 