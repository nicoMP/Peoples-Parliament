import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Politicians from '../../screens/Politicians';
import PoliticianDetails from '../../screens/PoliticianDetails';
import { getPartyColor } from '../../utils/partyColors';
import { PoliticiansStackParamList } from '../../types/navigation';

const Stack = createNativeStackNavigator<PoliticiansStackParamList>();

export default function PoliticiansStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PoliticiansList"
        component={Politicians}
        options={{
          title: 'Politicians',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="PoliticianDetails"
        component={PoliticianDetails}
        options={{
          title: 'Politician Details',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
} 