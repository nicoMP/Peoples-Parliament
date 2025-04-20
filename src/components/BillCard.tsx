import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ApiBill } from '../types/bill';
import { BillPdfService } from '../services/BillPdfService';
import { useFocusEffect } from '@react-navigation/native';

// Define the Bill interface based on what's used in this component
interface Bill {
  parliament: string;
  session: string;
  billNumber: string;
  title: string;
  billType: string;
  lastUpdatedInDateFormat: string;
}

interface BillCardProps {
  bill: Bill;
  onPress: (billNumber: string) => void;
  onLike?: (bill: Bill) => void;
  onDislike?: (bill: Bill) => void;
}

const BillCard: React.FC<BillCardProps> = ({ bill, onPress, onLike, onDislike }) => {
  const [isSaved, setIsSaved] = useState(false);
  const billPdfService = useRef(BillPdfService.getInstance()).current;
  
  // Check saved status when component mounts
  useEffect(() => {
    checkBillStatus();
  }, []);
  
  // Re-check saved status when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      console.log(`[BillCard] Screen focused, re-checking saved status for bill ${bill.parliament}-${bill.session}-${bill.billNumber}`);
      checkBillStatus();
      return () => {};
    }, [bill])
  );

  const checkBillStatus = async () => {
    try {
      console.log(`[BillCard] Checking saved status for bill ${bill.parliament}-${bill.session}-${bill.billNumber}`);
      const savedBills = await billPdfService.getAllSavedBills();
      const found = savedBills.some(
        (savedBill) => 
          savedBill.parliament === bill.parliament && 
          savedBill.session === bill.session && 
          savedBill.billNumber === bill.billNumber
      );
      
      console.log(`[BillCard] Bill ${bill.parliament}-${bill.session}-${bill.billNumber} saved status: ${found ? 'Saved' : 'Not saved'}`);
      setIsSaved(found);
    } catch (error) {
      console.error('[BillCard] Error checking bill status:', error);
    }
  };

  const handleSaveBill = async () => {
    try {
      if (isSaved) {
        console.log(`[BillCard] Deleting bill ${bill.parliament}-${bill.session}-${bill.billNumber}`);
        await billPdfService.deleteBill(bill.parliament, bill.session, bill.billNumber);
        setIsSaved(false);
      } else {
        console.log(`[BillCard] Saving bill ${bill.parliament}-${bill.session}-${bill.billNumber}`);
        console.log(`[BillCard] Bill details: parliament=${bill.parliament}, session=${bill.session}, number=${bill.billNumber}, title=${bill.title}, type=${bill.billType}, lastUpdated=${bill.lastUpdatedInDateFormat}`);
        
        await billPdfService.downloadBillPdf(
          bill.parliament,
          bill.session,
          bill.billNumber,
          bill.title,
          bill.billType,
          bill.lastUpdatedInDateFormat
        );
        setIsSaved(true);
      }
    } catch (error) {
      console.error('[BillCard] Error saving/deleting bill:', error);
    }
  };

  // Pan responder logic for swiping left/right
  const position = useRef(new Animated.ValueXY()).current;
  const screenWidth = Dimensions.get('window').width;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = screenWidth * 0.25;
        
        // Swiped right (like)
        if (gestureState.dx > swipeThreshold && onLike) {
          Animated.timing(position, {
            toValue: { x: screenWidth, y: 0 },
            duration: 200,
            useNativeDriver: true
          }).start(() => {
            console.log(`[BillCard] Swiped right (liked) bill ${bill.billNumber}`);
            onLike(bill);
            position.setValue({ x: 0, y: 0 });
          });
        } 
        // Swiped left (dislike)
        else if (gestureState.dx < -swipeThreshold && onDislike) {
          Animated.timing(position, {
            toValue: { x: -screenWidth, y: 0 },
            duration: 200,
            useNativeDriver: true
          }).start(() => {
            console.log(`[BillCard] Swiped left (disliked) bill ${bill.billNumber}`);
            onDislike(bill);
            position.setValue({ x: 0, y: 0 });
          });
        } 
        // Return to center
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: position.x }] }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={() => onPress(bill.billNumber)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <Text style={styles.billNumber}>Bill {bill.billNumber}</Text>
          <Text style={styles.billType}>{bill.billType}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{bill.title}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSaveBill}
          >
            <MaterialIcons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isSaved ? "#4CAF50" : "#757575"} 
            />
          </TouchableOpacity>
          
          <View style={styles.swipeHint}>
            <MaterialIcons name="swipe" size={20} color="#757575" />
            <Text style={styles.swipeText}>Swipe left/right to like/dislike</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  billType: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  title: {
    fontSize: 16,
    color: '#222',
    marginBottom: 12,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pdfWarning: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
});

export default BillCard; 