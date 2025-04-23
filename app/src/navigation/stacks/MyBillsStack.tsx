import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyBillsScreen from '../../screens/MyBillsScreen';
import BillDetailScreen from '../../screens/BillDetailScreen';

const Stack = createNativeStackNavigator();

export default function MyBillsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyBillsList"
        component={MyBillsScreen}
        options={{ 
          title: 'My Bills',
          headerShown: true,
          headerLargeTitle: true,
          headerTransparent: false,
          headerLargeTitleShadowVisible: false,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="BillDetails"
        component={BillDetailScreen}
        options={{ 
          title: 'Bill Details',
          headerShown: true
        }}
      />
    </Stack.Navigator>
  );
} 