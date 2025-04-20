import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text,
  Platform,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';

interface SimplePDFViewerProps {
  uri: string;
  visible: boolean;
  onLoadComplete?: (isSuccess: boolean) => void;
}

const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({ 
  uri, 
  visible = true,
  onLoadComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const webViewRef = useRef<WebView>(null);
  
  // Load PDF once when component mounts or URI changes
  useEffect(() => {
    if (!visible || !uri) return;
    
    const loadPdf = async () => {
      try {
        setLoading(true);
        console.log('[SimplePDFViewer] Loading PDF from:', uri);
        
        // Format URI for platform
        let formattedUri = uri;
        if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
          formattedUri = `file://${uri}`;
        }
        
        // Get proper path for FileSystem operations
        const fsPath = Platform.OS === 'ios' && formattedUri.startsWith('file://') 
          ? formattedUri.substring(7) 
          : formattedUri;
        
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(fsPath);
        if (!fileInfo.exists || (fileInfo.size !== undefined && fileInfo.size === 0)) {
          setError('PDF file not found or empty');
          setLoading(false);
          onLoadComplete?.(false);
          return;
        }
        
        console.log('[SimplePDFViewer] File exists, size:', fileInfo.size);
        
        try {
          const base64 = await FileSystem.readAsStringAsync(fsPath, {
            encoding: FileSystem.EncodingType.Base64
          });
          console.log('[SimplePDFViewer] PDF loaded successfully, size:', base64.length);
          setPdfBase64(base64);
        } catch (readError) {
          console.error('[SimplePDFViewer] Error reading file:', readError);
          setError(`Cannot read PDF file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
          setLoading(false);
          onLoadComplete?.(false);
        }
      } catch (error) {
        console.error('[SimplePDFViewer] Error loading PDF:', error);
        setError(`Error loading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
        onLoadComplete?.(false);
      }
    };
    
    loadPdf();
  }, [uri, visible, onLoadComplete]);
  
  // Create simple HTML to display the PDF directly
  const createPdfHtml = () => {
    if (!pdfBase64) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=1" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #FFFFFF;
          }
          #pdfContainer {
            width: 100%;
            height: 100%;
            overflow: auto;
            position: absolute;
            top: 0;
            left: 0;
          }
          #canvas {
            display: block;
            margin: 0 auto;
          }
          #loadingMessage {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
      </head>
      <body>
        <div id="pdfContainer">
          <div id="loadingMessage">Loading PDF...</div>
          <canvas id="canvas"></canvas>
        </div>
        
        <script>
          // Current state
          let currentPage = 1;
          let totalPages = 0;
          let pdfDoc = null;
          let currentZoom = 1.0;
          let rendering = false;
          
          // Get device pixel ratio for high-quality rendering
          const PIXEL_RATIO = window.devicePixelRatio || 1;
          
          // Wait for PDF.js to load
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          
          // Function to render a specific page with enhanced quality
          function renderPage(pageNum, zoom = currentZoom) {
            if (rendering) return; // Prevent multiple renders
            rendering = true;
            
            // Update current page tracker
            currentPage = pageNum;
            
            // Get the canvas and its context
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d', { alpha: false });
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Show loading message
            document.getElementById('loadingMessage').style.display = 'block';
            
            // Get the page
            pdfDoc.getPage(pageNum).then(function(page) {
              // Calculate the scale to fit width
              // Get the container width to fit the page properly
              const containerWidth = document.getElementById('pdfContainer').clientWidth;
              const pageWidth = page.getViewport({ scale: 1 }).width;
              
              // Base scale to fit width (adjusted for zoom)
              const baseScale = (containerWidth / pageWidth) * zoom;
              
              // Create viewport with high-DPI adjustments
              const viewport = page.getViewport({ 
                scale: baseScale * PIXEL_RATIO 
              });
              
              // Set canvas dimensions to match the viewport with pixel ratio
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              // Set display size (css pixels)
              canvas.style.width = (viewport.width / PIXEL_RATIO) + 'px';
              canvas.style.height = (viewport.height / PIXEL_RATIO) + 'px';
              
              // Render the page with high-quality settings
              const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                renderInteractiveForms: true,
                enableWebGL: true,
                intent: 'display'
              };
              
              const renderTask = page.render(renderContext);
              renderTask.promise.then(function() {
                // Hide loading message
                document.getElementById('loadingMessage').style.display = 'none';
                rendering = false;
                
                // Notify React Native of the page change
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PAGE_CHANGED',
                  page: pageNum
                }));
              });
            });
          }
          
          // Function to go to the next page
          function nextPage() {
            if (currentPage < totalPages) {
              renderPage(currentPage + 1);
            }
          }
          
          // Function to go to the previous page
          function prevPage() {
            if (currentPage > 1) {
              renderPage(currentPage - 1);
            }
          }
          
          // Function to set zoom level with enhanced quality
          function setZoom(zoom) {
            currentZoom = zoom;
            renderPage(currentPage, zoom);
          }
          
          // Function to handle messages from React Native
          window.addEventListener('message', function(event) {
            const message = event.data;
            try {
              const data = JSON.parse(message);
              if (data.type === 'NEXT_PAGE') {
                nextPage();
              } else if (data.type === 'PREV_PAGE') {
                prevPage();
              } else if (data.type === 'SET_ZOOM') {
                setZoom(data.zoom);
              }
            } catch (e) {
              console.error('Failed to parse message', e);
            }
          });
          
          // Function to load the PDF with enhanced options
          function loadPDF() {
            const pdfData = atob('${pdfBase64}');
            
            // Get uint8array from base64 string
            const uint8Array = new Uint8Array(pdfData.length);
            for (let i = 0; i < pdfData.length; i++) {
              uint8Array[i] = pdfData.charCodeAt(i);
            }
            
            const loadingTask = window.pdfjsLib.getDocument({
              data: uint8Array,
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
              cMapPacked: true,
              disableStream: false,
              disableAutoFetch: false,
              disableRange: false,
              disableFontFace: false
            });
            
            loadingTask.promise.then(function(pdf) {
              pdfDoc = pdf;
              totalPages = pdf.numPages;
              
              // Notify React Native of PDF info
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PDF_INFO',
                totalPages: totalPages,
                currentPage: currentPage
              }));
              
              // Render the first page
              renderPage(currentPage);
              
              // Mark as loaded
              window.ReactNativeWebView.postMessage('PDF_LOADED');
            }).catch(function(error) {
              console.error('Error loading PDF:', error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ERROR',
                message: 'Failed to load PDF: ' + error.message
              }));
            });
          }
          
          // Load the PDF when the page is ready
          document.addEventListener('DOMContentLoaded', loadPDF);
        </script>
      </body>
      </html>
    `;
  };
  
  // Navigate to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      webViewRef.current?.injectJavaScript(`
        window.postMessage(JSON.stringify({
          type: 'NEXT_PAGE'
        }), '*');
        true;
      `);
    }
  };
  
  // Navigate to previous page
  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      
      webViewRef.current?.injectJavaScript(`
        window.postMessage(JSON.stringify({
          type: 'PREV_PAGE'
        }), '*');
        true;
      `);
    }
  };
  
  // Apply zoom to embedded content
  const applyZoom = (newZoom: number) => {
    setZoomLevel(newZoom);
    webViewRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({
        type: 'SET_ZOOM',
        zoom: ${newZoom}
      }), '*');
      true;
    `);
  };
  
  // Handle messages from WebView
  const handleMessage = (event: any) => {
    const message = event.nativeEvent.data;
    console.log('[SimplePDFViewer] Message from WebView:', message);
    
    if (message === 'PDF_LOADED') {
      setLoading(false);
      setInitialLoadComplete(true);
      onLoadComplete?.(true);
    } else if (message.startsWith('{')) {
      try {
        const data = JSON.parse(message);
        if (data.type === 'PAGE_CHANGED') {
          setCurrentPage(data.page);
        } else if (data.type === 'PDF_INFO') {
          setCurrentPage(data.currentPage || 1);
          setTotalPages(data.totalPages || 1);
        }
      } catch (e) {
        console.error('[SimplePDFViewer] Error parsing message:', e);
      }
    }
  };
  
  if (!visible) {
    return null;
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {pdfBase64 && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: createPdfHtml() }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          mixedContentMode="always"
          onError={(e) => {
            console.error('[SimplePDFViewer] WebView error:', e.nativeEvent);
            setError('Error displaying PDF');
            onLoadComplete?.(false);
          }}
        />
      )}
      
      {/* Only show loading indicator during initial load */}
      {loading && !initialLoadComplete && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#b22234" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
      
      <View style={styles.controlsContainer}>
        <View style={styles.pageControls}>
          <TouchableOpacity 
            style={[styles.pageButton, currentPage <= 1 ? styles.disabledButton : null]} 
            onPress={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <MaterialIcons name="navigate-before" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
          
          <TouchableOpacity 
            style={[styles.pageButton, currentPage >= totalPages ? styles.disabledButton : null]} 
            onPress={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <MaterialIcons name="navigate-next" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 248, 0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#b22234',
    textAlign: 'center',
    padding: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pageControls: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  pageButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  pageText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 5,
    minWidth: 50,
    textAlign: 'center',
  },
});

export default SimplePDFViewer; 