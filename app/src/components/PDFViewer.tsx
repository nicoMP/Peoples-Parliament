import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Text, 
  Alert, 
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as WebBrowser from 'expo-web-browser';

interface BillDetailViewProps {
  uri: string;
  title?: string;
  onClose?: () => void;
}

export default function BillDetailView({ uri, title, onClose }: BillDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Log the received props for debugging
  useEffect(() => {
    console.log('[BillDetailView] Props received:', { uri, title });
  }, [uri, title]);

  useEffect(() => {
    const checkFile = async () => {
      try {
        console.log('[BillDetailView] Checking file existence:', uri);
        
        // Remove "file://" prefix temporarily for FileSystem operations
        const fsPath = uri.startsWith('file://') ? uri.substring(7) : uri;
        console.log('[BillDetailView] Checking path:', fsPath);
        
        const fileInfo = await FileSystem.getInfoAsync(fsPath, { size: true });
        console.log('[BillDetailView] File info:', fileInfo);
        
        if (!fileInfo.exists) {
          setError('PDF file not found');
          console.log('[BillDetailView] File does not exist');
          return;
        }
        
        if (fileInfo.size === 0) {
          console.log('[BillDetailView] File exists but is empty');
          setError('PDF file is empty');
          return;
        }
        
        // File exists and has content
        setFileExists(true);
        
        // Load PDF as base64 for WebView
        try {
          const base64 = await FileSystem.readAsStringAsync(fsPath, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('[BillDetailView] PDF loaded as base64, size:', base64.length);
          setPdfBase64(base64);
        } catch (readError) {
          console.error('[BillDetailView] Error loading PDF as base64:', readError);
          // Still mark as exists even if we can't load base64
        }
      } catch (error) {
        console.error('[BillDetailView] Error checking file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Unable to access PDF file: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    checkFile();
  }, [uri]);

  const shareFile = async () => {
    try {
      // For sharing, we need to use the original URI format
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
      console.log('[BillDetailView] File shared successfully');
    } catch (error) {
      console.error("[BillDetailView] Error sharing file:", error);
      Alert.alert('Error', 'Cannot share this file');
    }
  };

  const openInExternalApp = async () => {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, use sharing
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else if (Platform.OS === 'android') {
        // On Android, use intent launcher
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      }
      console.log('[BillDetailView] Opened in external app');
    } catch (error) {
      console.error('[BillDetailView] Error opening in external app:', error);
      
      // Fallback to WebBrowser
      try {
        await WebBrowser.openBrowserAsync(`file://${uri}`);
      } catch (browserError) {
        Alert.alert('Error', 'Could not open PDF. Please try sharing it instead.');
      }
    }
  };

  const togglePdfViewer = () => {
    setShowPdfViewer(!showPdfViewer);
  };

  const renderPdfContent = () => {
    if (!pdfBase64) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>PDF preview not available</Text>
          <TouchableOpacity style={styles.errorButton} onPress={openInExternalApp}>
            <Text style={styles.errorButtonText}>Open in External App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Create HTML content with embedded PDF viewer
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=1" />
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background-color: #f0f0f0;
          }
          #pdf-viewer {
            display: block;
            border: none;
            height: 100vh;
            width: 100vw;
          }
        </style>
      </head>
      <body>
        <object 
          id="pdf-viewer"
          data="data:application/pdf;base64,${pdfBase64}" 
          type="application/pdf"
        >
          <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
        </object>
        <script>
          window.onload = function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('PDF_LOADED');
            }
          };
        </script>
      </body>
      </html>
    `;

    return (
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={(event) => {
          console.log('[BillDetailView] Message from WebView:', event.nativeEvent.data);
        }}
        onError={(e) => {
          console.error('[BillDetailView] WebView error:', e.nativeEvent);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        onLoadStart={() => console.log('[BillDetailView] WebView loading started')}
        onLoadEnd={() => console.log('[BillDetailView] WebView loading ended')}
      />
    );
  };

  const renderBillDetail = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b22234" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={50} color="#b22234" />
          <Text style={styles.errorText}>{error}</Text>
          {onClose && (
            <TouchableOpacity style={styles.errorButton} onPress={onClose}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    if (showPdfViewer && fileExists) {
      return renderPdfContent();
    }
    
    return (
      <View style={styles.contentContainer}>
        <View style={styles.previewContainer}>
          <MaterialIcons name="picture-as-pdf" size={80} color="#b22234" />
          <Text style={styles.previewText}>PDF Document</Text>
          <Text style={styles.previewSubtext}>
            {title || 'Document ready to view'}
          </Text>
        </View>
        
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
        
        <View style={styles.headerButtons}>
          {fileExists && (
            <TouchableOpacity onPress={togglePdfViewer} style={styles.headerButton}>
              <MaterialIcons
                name={showPdfViewer ? "visibility-off" : "visibility"} 
                size={24} 
                color="#333" 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={shareFile} style={styles.headerButton}>
            <MaterialIcons name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.pdfContainer}>
        {renderBillDetail()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 0.7, // Typical PDF aspect ratio
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  previewSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  viewButton: {
    backgroundColor: '#b22234',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', 
    maxWidth: 300,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#b22234',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 