import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BillsStackParamList } from '@/src/types/navigation';

type Props = NativeStackScreenProps<BillsStackParamList, 'BillDetails'>;

export default function BillDetails({ route }: Props) {
  const { billId } = route.params;

  return (
    <View style={styles.container}>
      <Text>Bill Details for ID: {billId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
}); 