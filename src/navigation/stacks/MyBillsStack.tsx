import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyBillsScreen from '@src/screens/MyBillsScreen';
import BillDetailScreen from '@src/screens/BillDetailScreen';

// Create a param list for the MyBills stack
export type MyBillsStackParamList = {
  MyBills: undefined;
  BillDetail: { 
    uri: string; 
    title?: string;
    parliament?: string;
    session?: string;
    billNumber?: string;
  };
};

const Stack = createNativeStackNavigator<MyBillsStackParamList>();

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
      <Stack.Screen
        name="BillDetail"
        component={BillDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
} 