import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '@src/types/navigation';
import { MaterialIcons } from '@expo/vector-icons';
import BillsStack from './stacks/BillsStack';
import ProfileScreen from '@src/screens/ProfileScreen';
import MyBillsStack from './stacks/MyBillsStack';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
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
      {/* <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      /> */}
    </Tab.Navigator>
  );
} 