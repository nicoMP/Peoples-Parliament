import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp } from '@react-navigation/native';
import { baseWebParliamentUrlEn, RootStackParamList } from '@/constants/constants';

const BillDetails = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BillDetails'>>();
  const { session, number } = route.params;
  const url = `${baseWebParliamentUrlEn}/${session}/${number}`;

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
