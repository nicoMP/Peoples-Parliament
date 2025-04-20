import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Politicians from '@/src/pages/Politicians';
import PoliticianDetails from '@/src/pages/PoliticianDetails';
import { getPartyColor } from '@/src/utils/partyColors';

// Create a type for the stack
export type PoliticiansStackParamList = {
  PoliticiansList: undefined;
  PoliticianDetails: { id: string };
};

const Stack = createNativeStackNavigator<PoliticiansStackParamList>();

export default function PoliticiansStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Global screen options that will be inherited by all screens
        animation: 'slide_from_right',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="PoliticiansList"
        component={Politicians}
        options={{ 
          headerShown: false 
        }}
      />
      <Stack.Screen
        name="PoliticianDetails"
        component={PoliticianDetails}
        options={{ 
          title: 'Politician Details',
          headerShown: true,
          // The headerStyle will be set dynamically in the component
          // based on the politician's party
        }}
      />
    </Stack.Navigator>
  );
} 