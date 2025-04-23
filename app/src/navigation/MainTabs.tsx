import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import { MaterialIcons } from '@expo/vector-icons';
import BillsStack from './stacks/BillsStack';
import MyBillsStack from './stacks/MyBillsStack';
import PoliticiansStack from './stacks/PoliticiansStack';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
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
        name="PoliticiansStack"
        component={PoliticiansStack}
        options={{
          title: 'Politicians',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 