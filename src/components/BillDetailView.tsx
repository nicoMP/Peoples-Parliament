import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Text, 
  Alert, 
  Platform,
  Dimensions,
  ScrollView,
  Switch
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import Pdf from 'react-native-pdf';

interface BillDetailViewProps {
  uri: string;
  title?: string;
  onClose?: () => void;
}

export default function BillDetailView({ uri, title, onClose }: BillDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUri, setPdfUri] = useState('');
  const [showPdf, setShowPdf] = useState(true);
  
  // Settings
  const [enableZoom, setEnableZoom] = useState(true);
  const [nightMode, setNightMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  
  const { width, height } = Dimensions.get('window');
  const pdfRef = useRef<Pdf>(null);

  // Log the received props for debugging
  useEffect(() => {
    console.log('[BillDetailView] Props received:', { uri, title });
    
    // Format URI based on platform
    let formattedUri = uri;
    if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
      formattedUri = `file://${uri}`;
    } 
    
    console.log('[BillDetailView] Formatted URI:', formattedUri);
    setPdfUri(formattedUri);
  }, [uri, title]);

  useEffect(() => {
    if (!pdfUri) return;
    
    const checkFile = async () => {
      try {
        setLoading(true);
        console.log('[BillDetailView] Checking file existence:', pdfUri);
        
        // Get proper path for FileSystem operations
        const fsPath = Platform.OS === 'ios' && pdfUri.startsWith('file://') 
          ? pdfUri.substring(7) 
          : pdfUri;
          
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
        console.log('[BillDetailView] File exists and has content');
        setFileExists(true);
      } catch (error) {
        console.error('[BillDetailView] Error checking file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Unable to access PDF file: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    checkFile();
  }, [pdfUri]);

  const shareFile = async () => {
    try {
      // For sharing, we need to use the original URI format
      await Sharing.shareAsync(pdfUri || uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
      console.log('[BillDetailView] File shared successfully');
    } catch (error) {
      console.error("[BillDetailView] Error sharing file:", error);
      Alert.alert('Error', 'Cannot share this file');
    }
  };

  const togglePdfVisibility = () => {
    setShowPdf(!showPdf);
  };

  const renderSettings = () => {
    return (
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Document Settings</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Zoom</Text>
          <Switch
            value={enableZoom}
            onValueChange={setEnableZoom}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={enableZoom ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Night Mode</Text>
          <Switch
            value={nightMode}
            onValueChange={setNightMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={nightMode ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto Scroll</Text>
          <Switch
            value={autoScroll}
            onValueChange={setAutoScroll}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoScroll ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        <Text style={styles.settingsNote}>
          Changes take effect when you toggle the document view
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#b22234" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      );
    }
    
    if (error || !fileExists) {
      return (
        <View style={styles.centeredContainer}>
          <MaterialIcons name="picture-as-pdf" size={80} color="#b22234" />
          <Text style={styles.placeholderText}>PDF Document</Text>
          <Text style={styles.placeholderSubtext}>
            {error || title || 'Document not available'}
          </Text>
        </View>
      );
    }
    
    // return (
    //   <ScrollView style={styles.contentScroll} contentContainerStyle={{flexGrow: 1}}>
    //     {showPdf && (
    //       <View style={styles.pdfContainer}>
    //         <Pdf
    //           ref={pdfRef}
    //           source={{ uri: pdfUri, cache: true }}
    //           enablePaging={false}
    //           horizontal={false}
    //           enableRTL={false}
    //           spacing={0}
    //           scale={enableZoom ? 1.0 : undefined}
    //           minScale={0.5}
    //           maxScale={enableZoom ? 4.0 : 1.0}
    //           fitPolicy={0}
    //           trustAllCerts={false}
    //           enableAnnotationRendering={true}
    //           onLoadComplete={(numberOfPages, filePath) => {
    //             console.log(`[BillDetailView] PDF loaded with ${numberOfPages} pages from ${filePath}`);
    //             setPageCount(numberOfPages);
    //             setLoading(false);
    //           }}
    //           onPageChanged={(page) => {
    //             console.log(`[BillDetailView] Current page: ${page}`);
    //             setCurrentPage(page);
    //           }}
    //           onError={(error) => {
    //             console.error("[BillDetailView] Error loading PDF:", error);
    //             setError(`Error loading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    //           }}
    //           onPressLink={(uri) => {
    //             console.log(`[BillDetailView] Link pressed: ${uri}`);
    //           }}
    //           style={[styles.pdf, nightMode && styles.nightModePdf]}
    //           renderActivityIndicator={() => (
    //             <ActivityIndicator color="#b22234" size="large" />
    //           )}
    //         />
            
    //         {pageCount > 0 && (
    //           <View style={styles.pageIndicator}>
    //             <Text style={styles.pageIndicatorText}>
    //               Page {currentPage} of {pageCount}
    //             </Text>
    //           </View>
    //         )}
    //       </View>
    //     )}
        
    //     {renderSettings()}
    //   </ScrollView>
    // );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Title, eye toggle and share button */}
        {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
        
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={togglePdfVisibility} style={styles.headerButton}>
            <MaterialIcons
              name={showPdf ? "visibility" : "visibility-off"} 
              size={24} 
              color="#333" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareFile} style={styles.headerButton}>
            <MaterialIcons name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {renderContent()}
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
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
  },
  contentScroll: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.6, // 60% of screen height
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  nightModePdf: {
    backgroundColor: '#222',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholderSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16, 
    fontSize: 16,
    color: '#666',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  pageIndicatorText: {
    color: '#fff',
    fontSize: 14,
  },
  settingsContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingsNote: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});