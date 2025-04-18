import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp } from '@react-navigation/native';
import { baseWebParliamentUrlEn, RootStackParamList } from '@/constants/constants';




const BillDetails = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'BillDetails'>>();
  const { session, number } = route.params;
  const url = `${baseWebParliamentUrlEn}/${session}/${number}`
  console.log(url)
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={styles.loader}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BillDetails;
