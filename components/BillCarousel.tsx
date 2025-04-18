import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import BillCard, { BillCardProps } from '@/components/BillCard';
import axios from 'axios';
import Sessions from '../constants/Sessions.json';
import Dropdown from '@/components/Dropdown';
import { baseParliamentUrl } from '@/constants/constants';

const { width, height } = Dimensions.get('window'); // Get screen height
const PAGE_SIZE = 10;
const BILL_CARD_WIDTH = width * 0.8;

interface ApiBill {
  SearchScore: number;
  BillId: number;
  BillNumberPrefix: string | null;
  BillNumber: number;
  BillNumberSuffix: string | null;
  BillNumberFormatted: string;
  LongTitleEn: string;
  LongTitleFr: string;
  ShortTitleEn: string;
  ShortTitleFr: string;
  LatestBillMilestoneId: number;
  LatestCompletedMajorStageEn: string;
  LatestCompletedMajorStageFr: string;
  LatestCompletedMajorStageChamberId: number;
  DidReinstateFromPreviousSession: boolean;
  PassedHouseFirstReadingDateTime: string | null;
  PassedHouseSecondReadingDateTime: string | null;
  PassedHouseThirdReadingDateTime: string | null;
  PassedSenateFirstReadingDateTime: string | null;
  PassedSenateSecondReadingDateTime: string | null;
  PassedSenateThirdReadingDateTime: string | null;
  ReceivedRoyalAssentDateTime: string | null;
  ParlSessionCode: string;
  ParlSessionEn: string;
  ParlSessionFr: string;
  ParliamentNumber: number;
  SessionNumber: number;
  OriginatingChamberId: number;
  BillTypeId: number;
  BillTypeEn: string;
  BillTypeFr: string;
  CurrentStatusId: number;
  CurrentStatusEn: string;
  CurrentStatusFr: string;
  MinistryId: number;
  SponsorId: number;
  SponsorEn: string;
  SponsorFr: string;
  PoliticalAffiliationId: number;
  IsFromCurrentSession: boolean;
  Highlight: string | null;
  LatestBillTextTypeId: number;
  LatestActivityEn: string;
  LatestActivityFr: string;
  LatestActivityDateTime: string;
}

export default function BillCarousel() {
  const [bills, setBills] = useState<ApiBill[]>([]);
  const [parliament, setParliament] = useState<string>('44');
  const [session, setSession] = useState<string>('1');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const parliaments = useMemo(() => Sessions.parliaments.map((p) => p.parliament.toString()), []);
  const selectedParliamentSessions = useMemo(() => {
    return Sessions.parliaments.find((p) => p.parliament.toString() === parliament)?.sessions || [];
  }, [parliament]);

  const fetchBills = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const response = await axios.get<ApiBill[]>(baseParliamentUrl, {
        params: {
          parliament,
          session,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      const newBills = response.data;
      setBills((prev) => {
        const uniqueNewBills = newBills.filter(
          (newBill) => !prev.some((existingBill) => existingBill.BillId === newBill.BillId)
        );
        return [...prev, ...uniqueNewBills];
      });

      if (newBills.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  }, [parliament, session, page]); // Removed loading and hasMore from dependency array

  useEffect(() => {
    const latestParliament = Math.max(...Sessions.parliaments.map((p) => p.parliament));
    const latestSessions = Sessions.parliaments.find((p) => p.parliament === latestParliament)?.sessions;
    const latestSession = latestSessions ? Math.max(...latestSessions.map((s) => s.session)) : 1;

    setParliament(latestParliament.toString());
    setSession(latestSession.toString());
  }, []);

  useEffect(() => {
    setPage(1);
    setBills([]);
    setHasMore(true);
  }, [parliament, session]);

  useEffect(() => {
    fetchBills();
  }, [page, fetchBills]); // fetchBills is now a stable reference as long as parliament, session, and page don't change

  const renderItem = useCallback(({ item }: { item: ApiBill }) => (
    <View style={styles.cardContainer}>
      <BillCard
        BillId={item.BillId}
        BillNumberFormatted={item.BillNumberFormatted}
        LongTitleEn={item.LongTitleEn}
        ParlSessionEn={item.ParlSessionEn}
        SponsorEn={item.SponsorEn}
        BillTypeEn={item.BillTypeEn}
        CurrentStatusEn={item.CurrentStatusEn}
        LatestCompletedMajorStageEn={item.LatestCompletedMajorStageEn}
        PassedHouseFirstReadingDateTime={item.PassedHouseFirstReadingDateTime}
        PassedHouseSecondReadingDateTime={item.PassedHouseSecondReadingDateTime}
        PassedHouseThirdReadingDateTime={item.PassedHouseThirdReadingDateTime}
        PassedSenateFirstReadingDateTime={item.PassedSenateFirstReadingDateTime}
        PassedSenateSecondReadingDateTime={item.PassedSenateSecondReadingDateTime}
        PassedSenateThirdReadingDateTime={item.PassedSenateThirdReadingDateTime}
        ReceivedRoyalAssentDateTime={item.ReceivedRoyalAssentDateTime}
        number={item.BillNumberFormatted}
        session={item.ParlSessionCode}
        key={item.BillId.toString()}
      />
    </View>
  ), []);

  const keyExtractor = useCallback((item: ApiBill) => item.BillId.toString(), []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, loading]);

  const renderFooter = useCallback(() => {
    if (loading) {
      return <ActivityIndicator size="large" color="#b22234" />;
    }
    return null;
  }, [loading]);

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <Dropdown
          label="Parliament"
          options={parliaments}
          selectedValue={parliament}
          onSelect={setParliament}
        />
        <Dropdown
          label="Session"
          options={selectedParliamentSessions.map((s) => s.session.toString())}
          selectedValue={session}
          onSelect={setSession}
        />
      </View>

      <View style={styles.listWrapper}>
        <FlatList
          data={bills}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          initialNumToRender={5}
          windowSize={3}
          removeClippedSubviews={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  listWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 0,
  },
});