import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SavedBill } from '@src/services/BillPdfService';
import { BillPdfService } from '@src/services/BillPdfService';

interface SavedBillCardProps {
  bill: SavedBill;
  onToggleWatch: () => void;
  onDelete: () => void;
  onLikeChange?: (liked: boolean) => void;
  onDislikeChange?: (disliked: boolean) => void;
}

export default function SavedBillCard({ 
  bill, 
  onToggleWatch, 
  onDelete,
  onLikeChange,
  onDislikeChange 
}: SavedBillCardProps) {
  const pdfService = BillPdfService.getInstance();
  const [liked, setLiked] = useState(bill.isLiked === 1);
  const [disliked, setDisliked] = useState(bill.isDisliked === 1);
  
  const handleViewPdf = async () => {
    try {
      await pdfService.openPdf(bill.pdfPath, 0);
    } catch (error) {
      Alert.alert('Error', 'Could not open PDF file.');
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
        </View>
      </View>
      <Text style={styles.title}>{bill.title}</Text>

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
}); 