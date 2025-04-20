import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import PoliticianDetails from '../../src/pages/PoliticianDetails';

export default function PoliticianDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  if (!id) {
    return null; // Or some loading/error state
  }
  
  return <PoliticianDetails route={{ params: { id } }} />;
} 