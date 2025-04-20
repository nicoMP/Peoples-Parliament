import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyBillsScreen from '@src/screens/MyBillsScreen';

const Stack = createNativeStackNavigator();

export default function MyBillsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyBills"
        component={MyBillsScreen}
        options={{
          title: 'My Bills',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#f4f4f4',
          },
        }}
      />
    </Stack.Navigator>
  );
} 