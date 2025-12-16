import React from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
type PdfViewerProps = {
  pdfUrl: string | undefined; // full data URI: data:application/pdf;base64,...
};

export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl }) => {
  // Guard against bad input so WebView doesn't explode
  if (!pdfUrl || typeof pdfUrl !== 'string') {
    return null;
  }
  console.log(pdfUrl)
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ uri: pdfUrl }}
    />
  );
};
