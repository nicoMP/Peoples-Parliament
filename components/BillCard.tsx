import { baseWebParliamentUrlEn, RootStackParamList } from '@/constants/constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BillPdfService } from '@src/services/BillPdfService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BillDetails'>;

export interface BillCardProps {
  BillId: number;
  BillNumberFormatted: string;
  LongTitleEn: string;
  ParlSessionEn: string;
  SponsorEn: string;
  BillTypeEn: string;
  CurrentStatusEn: string;
  LatestCompletedMajorStageEn: string;
  PassedHouseFirstReadingDateTime?: string | null;
  PassedHouseSecondReadingDateTime?: string | null;
  PassedHouseThirdReadingDateTime?: string | null;
  PassedSenateFirstReadingDateTime?: string | null;
  PassedSenateSecondReadingDateTime?: string | null;
  PassedSenateThirdReadingDateTime?: string | null;
  ReceivedRoyalAssentDateTime?: string | null;
  number: string;
  session: string;
  parliament?: string;
}

export default function BillCard(props: BillCardProps) {
  const {
    BillNumberFormatted,
    LongTitleEn,
    SponsorEn,
    BillTypeEn,
    CurrentStatusEn,
    LatestCompletedMajorStageEn,
    PassedHouseFirstReadingDateTime,
    PassedHouseSecondReadingDateTime,
    PassedHouseThirdReadingDateTime,
    PassedSenateFirstReadingDateTime,
    PassedSenateSecondReadingDateTime,
    PassedSenateThirdReadingDateTime,
    ReceivedRoyalAssentDateTime,
    session,
    number,
    parliament: propParliament,
  } = props;
  
  const [downloading, setDownloading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const pdfService = BillPdfService.getInstance();

  // Extract parliament from ParlSessionEn if not provided
  const getParliament = () => {
    if (propParliament) return propParliament;
    
    // Parse from ParlSessionEn (e.g., "44th Parliament, 1st Session" → "44")
    const parliamentMatch = props.ParlSessionEn.match(/(\d+)(st|nd|rd|th) Parliament/);
    return parliamentMatch ? parliamentMatch[1] : '44'; // Default to 44 if parsing fails
  };

  const parliament = getParliament();

  useEffect(() => {
    // Check if bill is already saved, liked or disliked
    const checkBillStatus = async () => {
      try {
        const savedBills = await pdfService.getAllSavedBills();
        const thisBill = savedBills.find(bill => 
          bill.parliament === parliament && 
          bill.session === session && 
          bill.billNumber === BillNumberFormatted
        );
        
        if (thisBill) {
          setSaved(true);
          setLiked(thisBill.isLiked === 1);
          setDisliked(thisBill.isDisliked === 1);
        }
      } catch (error) {
        console.error('Error checking bill status:', error);
      }
    };
    
    checkBillStatus();
  }, []);

  const goToBillDetails = () => {
    navigation.navigate('BillDetails', { session, number, parliament });
  };

  const handleSaveBill = async (isLiked = liked, isDisliked = disliked) => {
    try {
      setDownloading(true);
      const lastUpdated = getLastInteractionDate();
      
      const pdfPath = await pdfService.downloadBillPdf(
        parliament,
        session,
        BillNumberFormatted,
        LongTitleEn,
        BillTypeEn,
        lastUpdated,
        isLiked ? 1 : 0,
        isDisliked ? 1 : 0
      );
      
      console.log('PDF saved at:', pdfPath);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Bill saved successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Bill saved to My Bills');
      }
      setSaved(true);
    } catch (error) {
      console.log('Error details:', error);
      console.error('Error saving bill:', error);
      Alert.alert('Error', 'Failed to save bill PDF');
    } finally {
      setDownloading(false);
    }
  };
  
  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    if (disliked) setDisliked(false);
    
    try {
      if (saved) {
        // Just update like status
        await pdfService.updateBillLikeStatus(parliament, session, BillNumberFormatted, newLiked, false);
      } else {
        // Save the bill with like status
        await handleSaveBill(newLiked, false);
      }
    } catch (error) {
      console.error('Error updating like status:', error);
      // Revert state on error
      setLiked(!newLiked);
    }
  };
  
  const handleDislike = async () => {
    const newDisliked = !disliked;
    setDisliked(newDisliked);
    if (liked) setLiked(false);
    
    try {
      if (saved) {
        // Just update dislike status
        await pdfService.updateBillLikeStatus(parliament, session, BillNumberFormatted, false, newDisliked);
      } else {
        // Save the bill with dislike status
        await handleSaveBill(false, newDisliked);
      }
    } catch (error) {
      console.error('Error updating dislike status:', error);
      // Revert state on error
      setDisliked(!newDisliked);
    }
  };

  const renderProgressBar = (stages: { done: boolean }[], color: string) => {
    const filledSegments = stages.filter((stage) => stage.done).length;
    const totalSegments = stages.length;
    const fillPercentage = (filledSegments / totalSegments) * 100;

    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${fillPercentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  const renderRoyalAssent = (done: boolean) => (
    <View style={[styles.royalAssentDot, done ? styles.royalAssentDone : styles.royalAssentPending]}>
      <Text style={styles.royalAssentLabel}>RA</Text>
    </View>
  );

  const senateStages = [
    { done: !!PassedSenateFirstReadingDateTime },
    { done: !!PassedSenateSecondReadingDateTime },
    { done: !!PassedSenateThirdReadingDateTime },
  ];

  const houseStages = [
    { done: !!PassedHouseFirstReadingDateTime },
    { done: !!PassedHouseSecondReadingDateTime },
    { done: !!PassedHouseThirdReadingDateTime },
  ];

  const hasRoyalAssent = !!ReceivedRoyalAssentDateTime;
  
  // Determine if bill is in House or Senate
  const getCurrentChamber = () => {
    // If bill has Royal Assent, it's completed the process
    if (hasRoyalAssent) return 'Completed';
    
    // Get dates of all stages
    const senateStagesDates = [
      PassedSenateFirstReadingDateTime ? new Date(PassedSenateFirstReadingDateTime).getTime() : 0,
      PassedSenateSecondReadingDateTime ? new Date(PassedSenateSecondReadingDateTime).getTime() : 0,
      PassedSenateThirdReadingDateTime ? new Date(PassedSenateThirdReadingDateTime).getTime() : 0,
    ];
    
    const houseStagesDates = [
      PassedHouseFirstReadingDateTime ? new Date(PassedHouseFirstReadingDateTime).getTime() : 0,
      PassedHouseSecondReadingDateTime ? new Date(PassedHouseSecondReadingDateTime).getTime() : 0,
      PassedHouseThirdReadingDateTime ? new Date(PassedHouseThirdReadingDateTime).getTime() : 0,
    ];
    
    // Find the max dates for each chamber
    const maxSenateDate = Math.max(...senateStagesDates);
    const maxHouseDate = Math.max(...houseStagesDates);
    
    // If we have any dates for either chamber
    if (maxSenateDate > 0 || maxHouseDate > 0) {
      // Return the chamber with the most recent activity
      return maxSenateDate > maxHouseDate ? 'Senate' : 'House of Commons';
    }
    
    // Default to what bill type suggests (C: House, S: Senate)
    return BillNumberFormatted.startsWith('C') ? 'House of Commons' : 'Senate';
  };

  const chamberBadgeColor = getCurrentChamber() === 'Senate' ? '#b71c1c' : 
                            getCurrentChamber() === 'House of Commons' ? '#2e7d32' : 
                            '#ffc107';

  const getLastInteractionDate = () => {
    const dates = [
      ReceivedRoyalAssentDateTime,
      PassedHouseThirdReadingDateTime,
      PassedHouseSecondReadingDateTime,
      PassedHouseFirstReadingDateTime,
      PassedSenateThirdReadingDateTime,
      PassedSenateSecondReadingDateTime,
      PassedSenateFirstReadingDateTime,
    ].filter(date => date) as string[];

    if (dates.length === 0) return new Date().toISOString();

    const lastDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return lastDate.toISOString();
  };

  return (
    <Pressable onPress={goToBillDetails} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <Text style={styles.billNumber}>{BillNumberFormatted}</Text>
        <View style={styles.headerActions}>
          {hasRoyalAssent && (
            <View style={styles.royalAssentBadge}>
              <MaterialIcons name="stars" size={16} color="#ffc107" />
              <Text style={styles.royalAssentText}>RA</Text>
            </View>
          )}
          {!hasRoyalAssent && (
            <View style={[styles.chamberBadge, { backgroundColor: `${chamberBadgeColor}20` }]}>
              <Text style={[styles.chamberText, { color: chamberBadgeColor }]}>
                {getCurrentChamber()}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.title}>{LongTitleEn}</Text>

      <Text style={styles.label}>Current status</Text>
      <Text style={styles.body}>{CurrentStatusEn}</Text>

      <Text style={styles.label}>Last major stage completed</Text>
      <Text style={styles.body}>{LatestCompletedMajorStageEn}</Text>

      <Text style={styles.label}>Sponsor</Text>
      <Text style={styles.body}>{SponsorEn}</Text>

      <Text style={styles.label}>Type</Text>
      <Text style={styles.body}>{BillTypeEn}</Text>

      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Senate</Text>
        {renderProgressBar(senateStages, '#b71c1c')}

        <Text style={styles.progressTitle}>House of Commons</Text>
        {renderProgressBar(houseStages, '#2e7d32')}
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.actionButtons}>
          <Pressable 
            onPress={handleLike} 
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={liked ? "thumb-up" : "thumb-up-off-alt"} 
              size={20} 
              color={liked ? "#4CAF50" : "#757575"} 
            />
          </Pressable>

          <Pressable 
            onPress={handleDislike} 
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={disliked ? "thumb-down" : "thumb-down-off-alt"} 
              size={20} 
              color={disliked ? "#F44336" : "#757575"} 
            />
          </Pressable>

          <Pressable 
            onPress={() => handleSaveBill()} 
            style={styles.actionButton}
            disabled={downloading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons 
              name={downloading ? "hourglass-top" : saved ? "check" : "save"} 
              size={20} 
              color={saved ? "#4CAF50" : "#007AFF"} 
            />
          </Pressable>
        </View>
        <Text style={styles.lastInteractionDate}>
          Last updated: {new Date(getLastInteractionDate()).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#faf8f6', // Warm Snow
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
  progressContainer: {
    marginTop: 16,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#222',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  royalAssentDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  royalAssentLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  royalAssentDone: {
    backgroundColor: '#ffc107', // Gold for Royal Assent
  },
  royalAssentPending: {
    backgroundColor: '#ddd',
  },
  royalAssentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  royalAssentText: {
    color: '#ffc107',
    fontWeight: '600',
    fontSize: 12,
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
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  lastInteractionDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
});