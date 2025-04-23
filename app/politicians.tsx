import React from 'react';
import Politicians from './src/screens/Politicians';
import { Stack } from 'expo-router';
import { getPartyColor } from './src/utils/partyColors'; // We'll create this utility

export default function PoliticiansScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Politicians',
          headerShown: false, // Hide the header as the page has its own header
          // When we do show headers for child routes, ensure they can have dynamic styling
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          // No fixed colors here to allow dynamic party colors
        }}
      />
      <Politicians />
    </>
  );
} 