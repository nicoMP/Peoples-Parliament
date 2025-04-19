import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BillDetails from '@/components/BillWebview';
import BillCarousel from '@/src/components/features/bills/BillCarousel';
import { BillsStackParamList } from '@/src/types/navigation';

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
        component={BillDetails}
        options={{ 
          title: 'Bill Details',
          headerShown: true
        }}
      />
    </Stack.Navigator>
  );
} 