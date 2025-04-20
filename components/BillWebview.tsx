import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/constants/constants';

const BillDetails = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BillDetails'>>();
  const { session = "1", number} = route.params;
  
  // Construct the URL using the new legisinfo format
  // Format: https://www.parl.ca/legisinfo/en/bill/44-1/s-291
  // Where 44 is parliament, 1 is session, and s-291 is the bill number
  const url = `https://www.parl.ca/legisinfo/en/bill/${session}/${number.toLowerCase()}`;
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setIsLoading(false)}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject, // <- takes up full parent space
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // to avoid the black flash
    zIndex: 1,
  },
});

export default BillDetails;
