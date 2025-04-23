import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SavedBill } from '@/app/src/services/BillPdfService';
import { BillPdfService } from '@/app/src/services/BillPdfService';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MyBillsStackParamList } from '@/app/src/navigation/stacks/MyBillsStack';

type NavigationProp = NativeStackNavigationProp<MyBillsStackParamList, 'MyBills'>;

interface SavedBillCardProps {
  bill: SavedBill;
  onToggleWatch: () => void;
  onDelete: () => void;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
  onPdfStatusChange?: () => void; // Callback when PDF status changes
}

export default function SavedBillCard({ 
  bill, 
  onToggleWatch, 
  onDelete,
  onLikeChange,
  onDislikeChange,
  onPdfStatusChange
}: SavedBillCardProps) {
  const pdfService = BillPdfService.getInstance();
  const [liked, setLiked] = useState(bill.isLiked === 1);
  const [disliked, setDisliked] = useState(bill.isDisliked === 1);
  const [retryingDownload, setRetryingDownload] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  
  const handleViewPdf = async () => {
    try {
      // If PDF is marked as missing, show an error instead of trying to open
      if (bill.pdfMissing === 1) {
        Alert.alert(
          'PDF Not Available', 
          'The PDF file is not available. Would you like to retry downloading it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: handleRetryDownload }
          ]
        );
        return;
      }
      
      // Check if the PDF file exists before navigating
      const fileInfo = await FileSystem.getInfoAsync(bill.pdfPath);
      if (!fileInfo.exists) {
        throw new Error("PDF file not found");
      }
      
      // Ensure proper path format for the PDF viewer
      const pdfUri = bill.pdfPath.startsWith('file://') 
        ? bill.pdfPath 
        : `file://${bill.pdfPath}`;
      
      // Extract version and chamber from the filename if available
      let versionInfo = '';
      if (bill.pdfPath.includes('_v')) {
        const parts = bill.pdfPath.split('_v')[1].split('.pdf')[0].split('_');
        if (parts.length >= 2) {
          versionInfo = ` (v${parts[0]}, ${parts[1]})`;
        }
      }
      
      const title = `${bill.billNumber}${versionInfo} - ${bill.title}`;
      
      // Navigate using React Navigation - include bill information for refresh capability
      navigation.navigate('BillDetail', {
        uri: pdfUri,
        title: title,
        parliament: bill.parliament,
        session: bill.session,
        billNumber: bill.billNumber
      });
    } catch (error) {
      console.error('Error opening PDF:', error);
      
      // If file not found but not marked as missing, update the status
      if (bill.pdfMissing !== 1) {
        Alert.alert(
          'PDF File Error',
          'The PDF file is missing or corrupted. Would you like to retry downloading it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: handleRetryDownload }
          ]
        );
      } else {
        Alert.alert('Error', 'Could not open PDF file.');
      }
    }
  };

  const handleRetryDownload = async () => {
    try {
      setRetryingDownload(true);
      
      // Delete the existing file first
      await pdfService.deleteBill(bill.parliament, bill.session, bill.billNumber);
      
      // Re-download with current properties
      await pdfService.downloadBillPdf(
        bill.parliament,
        bill.session,
        bill.billNumber,
        bill.title,
        bill.billType,
        bill.lastUpdated,
        bill.isLiked,
        bill.isDisliked
      );
      
      // Notify parent component to refresh the list
      if (onPdfStatusChange) {
        onPdfStatusChange();
      }
      
      Alert.alert('Success', 'PDF download retried successfully');
    } catch (error) {
      console.error('Error retrying download:', error);
      Alert.alert('Error', 'Failed to retry download');
    } finally {
      setRetryingDownload(false);
    }
  };

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    if (disliked) setDisliked(false);
    
    try {
      await pdfService.updateBillLikeStatus(
        bill.parliament, 
        bill.session, 
        bill.billNumber, 
        newLiked, 
        false
      );
      if (onLikeChange) onLikeChange(newLiked);
    } catch (error) {
      console.error('Error updating like status:', error);
      Alert.alert('Error', 'Failed to update like status');
      setLiked(!newLiked); // Revert on error
    }
  };
  
  const handleDislike = async () => {
    const newDisliked = !disliked;
    setDisliked(newDisliked);
    if (liked) setLiked(false);
    
    try {
      await pdfService.updateBillLikeStatus(
        bill.parliament, 
        bill.session, 
        bill.billNumber, 
        false, 
        newDisliked
      );
      if (onDislikeChange) onDislikeChange(newDisliked);
    } catch (error) {
      console.error('Error updating dislike status:', error);
      Alert.alert('Error', 'Failed to update dislike status');
      setDisliked(!newDisliked); // Revert on error
    }
  };

  // Determine bill chamber based on bill number
  const getBillChamber = () => {
    // If bill number starts with S, it originated in Senate
    // If bill number starts with C, it originated in House of Commons
    return bill.billNumber.startsWith('S') ? 'Senate' : 'House of Commons';
  };
  
  const chamberColor = getBillChamber() === 'Senate' ? '#b71c1c' : '#2e7d32';

  return (
    <Pressable onPress={handleViewPdf} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <Text style={styles.billNumber}>{bill.billNumber}</Text>
        <View style={styles.headerActions}>
          {bill.isWatching ? (
            <View style={styles.watchingBadge}>
              <MaterialIcons name="visibility" size={16} color="#4CAF50" />
              <Text style={styles.watchingText}>Watching</Text>
            </View>
          ) : null}
          <View style={[styles.chamberBadge, { backgroundColor: `${chamberColor}20` }]}>
            <Text style={[styles.chamberText, { color: chamberColor }]}>
              {getBillChamber()}
            </Text>
          </View>
          {bill.pdfMissing === 1 && (
            <View style={styles.pdfErrorBadge}>
              <MaterialIcons name="error-outline" size={16} color="#F44336" />
              <Text style={styles.pdfErrorText}>PDF Error</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.title}>{bill.title}</Text>
      
      <View style={styles.sessionParliamentContainer}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeLabel}>Parliament:</Text>
          <View style={styles.badgeValue}>
            <Text style={styles.badgeValueText}>{bill.session}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Type</Text>
      <Text style={styles.body}>{bill.billType}</Text>

      <View style={styles.footerContainer}>
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.actionButton} 
            onPress={handleLike}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={liked ? "thumb-up" : "thumb-up-off-alt"} 
              size={24} 
              color={liked ? "#4CAF50" : "#757575"} 
            />
          </Pressable>
          
          <Pressable 
            style={styles.actionButton} 
            onPress={handleDislike}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={disliked ? "thumb-down" : "thumb-down-off-alt"} 
              size={24} 
              color={disliked ? "#F44336" : "#757575"} 
            />
          </Pressable>
          
          {bill.pdfMissing === 1 ? (
            <Pressable
              style={styles.actionButton}
              onPress={handleRetryDownload}
              disabled={retryingDownload}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {retryingDownload ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <MaterialIcons name="refresh" size={24} color="#F44336" />
              )}
            </Pressable>
          ) : (
            <Pressable 
              style={styles.actionButton} 
              onPress={onToggleWatch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name={bill.isWatching ? "visibility-off" : "visibility"} 
                size={24} 
                color={bill.isWatching ? "#666" : "#4CAF50"} 
              />
            </Pressable>
          )}
          
          <Pressable 
            style={styles.actionButton} 
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete" size={24} color="#F44336" />
          </Pressable>
        </View>
        
        <Text style={styles.lastUpdatedDate}>
          Last updated: {new Date(bill.lastUpdated).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#faf8f6',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#f2efeb',
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 28,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: '#444',
  },
  summary: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    lineHeight: 20,
  },
  sessionParliamentContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  badgeValue: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  watchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chamberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chamberText: {
    fontWeight: '600',
    fontSize: 12,
  },
  watchingText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 12,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#555',
  },
  deleteText: {
    color: '#F44336',
  },
  lastUpdatedDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  pdfErrorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pdfErrorText: {
    color: '#F44336',
    fontWeight: '600',
    fontSize: 12,
  },
}); 