import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BillService, IBillData } from '../services/BillService';
import { useRouter } from 'expo-router';
// import { BillPdfService } from '@src/services/BillPdfService';
// import { RootStackParamList } from '../types/navigation';

// type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'IBillDetailsRes'>;

export interface BillCardProps {
  bill: IBillData,
  onPressCard: () => void;
}

const billService = new BillService();

export default function BillCard(props: BillCardProps) {
  const {
    bill,
  } = props ?? {};
  const {
    BillId,
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
  } = bill;
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfMissing, setPdfMissing] = useState(false);
  const [isLiked, setIsLiked] = useState(bill.IsLiked);
  const [isDisliked, setIsDisliked] = useState(bill.IsDisliked);
  //   const navigation = useNavigation<NavigationProp>();
  //   const pdfService = BillPdfService.getInstance();

  //   // Extract parliament from ParlSessionEn if not provided
  //   const getParliament = () => {
  //     if (propParliament) return propParliament;

  //     // Parse from ParlSessionEn (e.g., "44th Parliament, 1st Session" → "44")
  //     const parliamentMatch = props.ParlSessionEn.match(/(\d+)(st|nd|rd|th) Parliament/);
  //     return parliamentMatch ? parliamentMatch[1] : '44'; // Default to 44 if parsing fails
  //   };

  //   const parliament = getParliament();

  //   // Check bill status on mount
  //   useEffect(() => {
  //     checkBillStatus();
  //   }, []);

  //   // Re-check bill status when screen comes into focus
  //   useFocusEffect(
  //     useCallback(() => {
  //       console.log(`[BillCard] Screen focused, checking status for bill ${BillNumberFormatted}`);
  //       checkBillStatus();
  //       return () => {
  //         // cleanup if needed
  //       };
  //     }, [])
  //   );

  //   const checkBillStatus = async () => {
  //     try {
  //       console.log(`[BillCard] Checking status for bill ${parliament}/${session}/${BillNumberFormatted}`);
  //       const savedBills = await pdfService.getAllSavedBills();
  //       const thisBill = savedBills.find(bill => 
  //         bill.parliament === parliament && 
  //         bill.session === session && 
  //         bill.billNumber === BillNumberFormatted
  //       );

  //       if (thisBill) {
  //         console.log(`[BillCard] Bill found in saved bills: ${JSON.stringify(thisBill)}`);
  //         setSaved(true);
  //         setLiked(thisBill.isLiked === 1);
  //         setDisliked(thisBill.isDisliked === 1);
  //         setPdfMissing(thisBill.pdfMissing === 1);
  //       } else {
  //         console.log(`[BillCard] Bill not found in saved bills`);
  //         setSaved(false);
  //         setLiked(false);
  //         setDisliked(false);
  //         setPdfMissing(false);
  //       }
  //     } catch (error) {
  //       console.error('[BillCard] Error checking bill status:', error);
  //     }
  //   };

  //   const goToBillDetails = () => {
  //     navigation.navigate('IBillDetailsRes', { session, number });
  //   };

  //   const handleSaveBill = async (isLiked = liked, isDisliked = disliked) => {
  //     try {
  //       setDownloading(true);
  //       const lastUpdated = getLastInteractionDate();

  //       console.log('[BillCard] Saving bill:', {
  //         parliament,
  //         session,
  //         billNumber: BillNumberFormatted,
  //         title: LongTitleEn,
  //         type: BillTypeEn,
  //         lastUpdated,
  //         isLiked: isLiked ? 1 : 0,
  //         isDisliked: isDisliked ? 1 : 0
  //       });

  //       const pdfPath = await pdfService.downloadBillPdf(
  //         parliament,
  //         session,
  //         BillNumberFormatted,
  //         LongTitleEn,
  //         BillTypeEn,
  //         lastUpdated,
  //         isLiked ? 1 : 0,
  //         isDisliked ? 1 : 0
  //       );

  //       console.log('[BillCard] PDF saved successfully at:', pdfPath);

  //       if (Platform.OS === 'android') {
  //         ToastAndroid.show('Bill saved successfully', ToastAndroid.SHORT);
  //       } else {
  //         Alert.alert('Success', 'Bill saved to My Bills');
  //       }
  //       setSaved(true);

  //       // Check if the PDF is missing after download
  //       const savedBills = await pdfService.getAllSavedBills();
  //       const thisBill = savedBills.find(bill => 
  //         bill.parliament === parliament && 
  //         bill.session === session && 
  //         bill.billNumber === BillNumberFormatted
  //       );
  //       setPdfMissing(thisBill ? thisBill.pdfMissing === 1 : false);

  //     } catch (error) {
  //       console.log('[BillCard] Error saving bill - details:', error);
  //       console.error('[BillCard] Failed to save bill PDF:', error instanceof Error ? error.message : 'Unknown error');
  //       Alert.alert('Error', 'Failed to save bill PDF');
  //       setPdfMissing(true);
  //     } finally {
  //       setDownloading(false);
  //     }
  //   };

  const handleLike = async () => {
    await billService.likeBill(bill.BillId)
    setIsLiked(true);
    setIsDisliked(false);
  };

  const handleDislike = async () => {
    await billService.dislikeBill(bill.BillId)
    setIsLiked(false);
    setIsDisliked(true);
  };

  //   // Add a function to retry the PDF download
  //   const handleRetryDownload = async () => {
  //     setDownloading(true);
  //     try {
  //       // Delete existing PDF and records first
  //       await pdfService.deleteBill(parliament, session, BillNumberFormatted);

  //       // Resave with current like/dislike status
  //       const lastUpdated = getLastInteractionDate();
  //       await pdfService.downloadBillPdf(
  //         parliament,
  //         session,
  //         BillNumberFormatted,
  //         LongTitleEn,
  //         BillTypeEn,
  //         lastUpdated,
  //         liked ? 1 : 0,
  //         disliked ? 1 : 0
  //       );

  //       // Recheck status
  //       await checkBillStatus();

  //       if (Platform.OS === 'android') {
  //         ToastAndroid.show('PDF download retried', ToastAndroid.SHORT);
  //       } else {
  //         Alert.alert('Success', 'PDF download retried');
  //       }
  //     } catch (error) {
  //       console.error('[BillCard] Error retrying download:', error);
  //       Alert.alert('Error', 'Failed to retry download');
  //     } finally {
  //       setDownloading(false);
  //     }
  //   };

  //   const handleViewPdf = async () => {
  //     if (!saved) {
  //       // Save the bill first if it's not already saved
  //       Alert.alert(
  //         'PDF Not Available',
  //         'The PDF needs to be downloaded first. Would you like to download it now?',
  //         [
  //           { text: 'Cancel', style: 'cancel' },
  //           { text: 'Download', onPress: () => handleSaveBill() }
  //         ]
  //       );
  //       return;
  //     }

  //     // If PDF is marked as missing, handle retry
  //     if (pdfMissing) {
  //       Alert.alert(
  //         'PDF Not Available', 
  //         'The PDF file is not available. Would you like to retry downloading it?',
  //         [
  //           { text: 'Cancel', style: 'cancel' },
  //           { text: 'Retry', onPress: handleRetryDownload }
  //         ]
  //       );
  //       return;
  //     }

  //     try {
  //       const pdfPath = await pdfService.getBillPdfPath(parliament, session, BillNumberFormatted);

  //       if (!pdfPath) {
  //         throw new Error("PDF file not found");
  //       }

  //       // Check if the file exists
  //       const fileInfo = await FileSystem.getInfoAsync(pdfPath);
  //       if (!fileInfo.exists) {
  //         throw new Error("PDF file not found on device");
  //       }

  //       // Ensure proper path format for the PDF viewer
  //       const pdfUri = pdfPath.startsWith('file://') 
  //         ? pdfPath 
  //         : `file://${pdfPath}`;

  //       // Extract version and chamber from the filename if available
  //       let stage = '';
  //       if (pdfPath.includes('_v')) {
  //         const parts = pdfPath.split('_v')[1].split('.pdf')[0].split('_');
  //         if (parts.length >= 2) {
  //           stage = parts[1]; // Assign the stage directly
  //         }
  //       }

  //       // Navigate to PDF viewer with all needed parameters
  //       navigation.navigate('PDFViewer', {
  //         uri: pdfUri,
  //         title: `${BillNumberFormatted}`,
  //         parliament: parliament,
  //         session: session,
  //         billNumber: BillNumberFormatted
  //       });
  //     } catch (error) {
  //       console.error('[BillCard] Error opening PDF:', error);
  //       Alert.alert(
  //         'PDF Error',
  //         'Could not open the PDF file. Would you like to try downloading it again?',
  //         [
  //           { text: 'Cancel', style: 'cancel' },
  //           { text: 'Retry', onPress: handleRetryDownload }
  //         ]
  //       );
  //     }
  //   };

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

  //   const renderRoyalAssent = (done: boolean) => (
  //     <View style={[styles.royalAssentDot, done ? styles.royalAssentDone : styles.royalAssentPending]}>
  //       <Text style={styles.royalAssentLabel}>RA</Text>
  //     </View>
  //   );

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
    return BillNumberFormatted?.startsWith('C') ? 'House of Commons' : 'Senate';
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

    if (dates.length === 0) return new Date().toLocaleDateString();

    const lastDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return lastDate.toLocaleDateString();
  };

  return (
    <Pressable onPress={() => router.push(`/BillDetails?billId=${BillId}`)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
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
          {saved && pdfMissing && (
            <View style={styles.pdfErrorBadge}>
              <MaterialIcons name="error-outline" size={16} color="#F44336" />
              <Text style={styles.pdfErrorText}>PDF Error</Text>
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
            onPress={() => handleLike()}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isLiked ? "thumb-up" : "thumb-up-off-alt"}
              size={20}
              color={isLiked ? "#4CAF50" : "#757575"}
            />
          </Pressable>

          <Pressable
            onPress={() => handleDislike()}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isDisliked ? "thumb-down" : "thumb-down-off-alt"}
              size={20}
              color={isDisliked ? "#F44336" : "#757575"}
            />
          </Pressable>

          {saved && pdfMissing ? (
            <Pressable
              onPress={() => console.log('HI')}
              style={styles.actionButton}
              disabled={downloading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={downloading ? "hourglass-top" : "refresh"}
                size={20}
                color="#F44336"
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => console.log('HI')}
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
          )}

          {saved && !pdfMissing && (
            <Pressable
              // onPress={handleViewPdf} 
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="picture-as-pdf"
                size={20}
                color="#007AFF"
              />
            </Pressable>
          )}
        </View>
        <Text style={styles.lastInteractionDate}>
          Last updated: {getLastInteractionDate()}
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