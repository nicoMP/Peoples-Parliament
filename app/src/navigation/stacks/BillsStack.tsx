import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BillCarousel from '../../components/features/bills/BillCarousel';
import { BillsStackParamList } from '../../types/navigation';
import BillDetailScreen from '../../screens/BillDetailScreen';

const Stack = createNativeStackNavigator<BillsStackParamList>();

export default function BillsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BillCarousel"
        component={BillCarousel}
        options={{ 
          headerShown: false 
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