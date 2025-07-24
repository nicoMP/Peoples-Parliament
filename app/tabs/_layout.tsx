import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="file-text-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="politicians"
        options={{
          title: 'Politicians',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="user-o" color={color} />,
        }}
      /> 
    </Tabs>
  );
}
