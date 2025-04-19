import { baseWebParliamentUrlEn, RootStackParamList } from '@/constants/constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  } = props;

  const navigation = useNavigation<NavigationProp>();

  const goToBillDetails = () => {
    navigation.navigate('BillDetails', { session, number });
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

    if (dates.length === 0) return 'N/A';

    const lastDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return lastDate.toLocaleDateString();
  };

  return (
    <Pressable onPress={goToBillDetails} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <Text style={styles.billNumber}>{BillNumberFormatted}</Text>
        {hasRoyalAssent && (
          <View style={styles.royalAssentBadge}>
            <MaterialIcons name="stars" size={16} color="#ffc107" />
            <Text style={styles.royalAssentText}>RA</Text>
          </View>
        )}
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

      <Text style={styles.lastInteractionDate}>
        Last updated: {getLastInteractionDate()}
      </Text>
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
  lastInteractionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    textAlign: 'right',
  },
});