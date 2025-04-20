import { Stack } from 'expo-router';

export default function PoliticianLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Politician Details',
          headerShown: true,
        }}
      />
    </Stack>
  );
} 