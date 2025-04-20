import React, { Component } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Bill {
  parliament: string;
  session: string;
  number: string;
  // Add other bill properties as needed
}

interface SavedBill {
  parliament: string;
  session: string;
  billNumber: string;
  isLiked?: number;
  isDisliked?: number;
  pdfMissing?: number;
}

interface BillCardProps {
  bill: Bill;
  savedBills?: SavedBill[];
  onPressLike?: (bill: Bill, isLiked: boolean, isDisliked: boolean) => void;
  onPressDislike?: (bill: Bill, isLiked: boolean, isDisliked: boolean) => void;
  onPressSave?: (bill: Bill) => void;
  onPressShare?: (bill: Bill) => void;
}

class BillCard extends Component<BillCardProps> {
  renderActionButtons = () => {
    const { bill, savedBills, onPressLike, onPressDislike, onPressSave, onPressShare } = this.props;
    
    // Check if this bill is saved
    const isSaved = savedBills?.some(
      (saved: SavedBill) => 
        saved.parliament === bill.parliament &&
        saved.session === bill.session &&
        saved.billNumber === bill.number
    );
    
    // Check if this bill is liked/disliked
    const savedBill = savedBills?.find(
      (saved: SavedBill) => 
        saved.parliament === bill.parliament &&
        saved.session === bill.session &&
        saved.billNumber === bill.number
    );
    
    const isLiked = savedBill?.isLiked === 1;
    const isDisliked = savedBill?.isDisliked === 1;
    const pdfMissing = savedBill?.pdfMissing === 1;
    
    return (
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onPressLike?.(bill, !isLiked, false)}
        >
          <Ionicons 
            name={isLiked ? "thumbs-up" : "thumbs-up-outline"} 
            size={24} 
            color={isLiked ? 'green' : '#333'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onPressDislike?.(bill, false, !isDisliked)}
        >
          <Ionicons 
            name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} 
            size={24} 
            color={isDisliked ? 'red' : '#333'} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onPressSave?.(bill)}
        >
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isSaved ? 'green' : '#2196F3'} 
          />
          {pdfMissing && isSaved && (
            <View style={styles.pdfWarning}>
              <Ionicons name="alert-circle" size={12} color="orange" />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onPressShare?.(bill)}
        >
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    );
  }

  render() {
    return (
      <View>
        {this.renderActionButtons()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    padding: 10,
  },
  pdfWarning: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
});

export default BillCard; 