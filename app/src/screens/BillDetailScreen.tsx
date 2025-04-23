import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  Text, 
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import SimplePDFViewer from '../components/SimplePDFViewer';

export default function BillDetailScreen({ route, navigation }: any) {
  // Extract navigation parameters for the bill details
  const { uri, title } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(true);

  // Handle closing the screen
  const handleClose = () => {
    navigation.goBack();
  };
  
  // Handle sharing the document
  const shareDocument = async () => {
    try {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      console.error('Error sharing document', error);
      Alert.alert('Error', 'Could not share the document');
    }
  };
  
  // Toggle PDF visibility
  const togglePdfVisibility = () => {
    setShowPdf(!showPdf);
  };
  
  // Handle PDF load complete
  const handlePdfLoadComplete = (isSuccess: boolean) => {
    setLoading(false);
    if (!isSuccess) {
      setError('Unable to load PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        
        <View style={styles.headerRightButtons}>
          <TouchableOpacity onPress={togglePdfVisibility} style={styles.headerButton}>
            <MaterialIcons 
              name={showPdf ? "visibility" : "visibility-off"} 
              size={24} 
              color="#333" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareDocument} style={styles.headerButton}>
            <MaterialIcons name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.pdfContainer}>
        {error ? (
          <View style={styles.centerContent}>
            <MaterialIcons name="error-outline" size={50} color="#b22234" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={handleClose}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          showPdf ? (
            <SimplePDFViewer 
              uri={uri} 
              visible={true}
              onLoadComplete={handlePdfLoadComplete}
            />
          ) : (
            <View style={styles.centerContent}>
              <MaterialIcons name="picture-as-pdf" size={50} color="#b22234" />
              <Text style={styles.infoText}>PDF view is hidden</Text>
              <Text style={styles.infoSubtext}>Tap the eye icon to show the document</Text>
            </View>
          )
        )}
        
        {loading && showPdf && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#b22234" />
            <Text style={styles.loadingText}>Loading bill document...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#b22234',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
}); 