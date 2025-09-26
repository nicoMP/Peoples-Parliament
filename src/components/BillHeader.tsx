import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBills } from '../contexts/BillContext';
import { useSession } from '../contexts/SessionContext';
import { BillService } from '../services/BillService';
import { getDb } from '../services/database';

const billService = new BillService();

export default function BillHeader() {
  const { session, setSession, parliament, setParliament } = useSession();
  const { bills, setBills } = useBills()
  const db = getDb()
  const [localParliament, setLocalParliament] = useState(
    parliament ? String(parliament) : ''
  );
  const [localSession, setLocalSession] = useState(
    session ? String(session) : ''
  );

  const [titleSearch, setTitleSearch] = useState<string>('');

  useEffect(() => {
    setLocalParliament(parliament ? String(parliament) : '');
  }, [parliament]);

  useEffect(() => {
    setLocalSession(session ? String(session) : '');
  }, [session]);

  const parliamentRef = useRef<TextInput>(null);
  const sessionRef = useRef<TextInput>(null);

  const searchBySession = () => {
    const p = localParliament === '' ? 0 : parseInt(localParliament, 10);
    const s = localSession === '' ? 0 : parseInt(localSession, 10);

    setParliament(Number.isNaN(p) ? 0 : p);
    setSession(Number.isNaN(s) ? 0 : s);

    Keyboard.dismiss();
  };

  const searchByTitle = async () => {
    console.log(titleSearch)
    const filteredBills = await billService.getBillsDataBySession(parliament, session, titleSearch);
    // console.log(filteredBills)
    setBills(filteredBills);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.row}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Parliament:</Text>
          <TextInput
            ref={parliamentRef}
            keyboardType="numeric"
            value={localParliament}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '');
              setLocalParliament(digits);
            }}
            placeholder="Parliament"
            style={styles.numberInput}
            returnKeyType="next"
            onSubmitEditing={() => sessionRef.current?.focus()}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Session:</Text>
          <TextInput
            ref={sessionRef}
            keyboardType="numeric"
            value={localSession}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '');
              setLocalSession(digits);
            }}
            placeholder="Session"
            style={styles.numberInput}
            returnKeyType="done"
            onSubmitEditing={searchBySession}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.formGroup}>
          <Ionicons name="search" size={20} color={'#FFF8F0'} />
          <TextInput
            style={styles.textInput}
            value={titleSearch}
            onChangeText={setTitleSearch}
            returnKeyType='search'
            onSubmitEditing={searchByTitle}
            placeholder="Search by title or bill number..."
            placeholderTextColor="#888" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#611a1aff',
    flexDirection: 'column',
    alignItems: 'stretch', // children (rows) stretch full width
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12, // keeps safe spacing at edges
    gap: 12,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // spread children neatly
    width: '100%', // full width
    paddingHorizontal: 20
  },
  formGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1, // don’t overflow on smaller screens
  },
  label: {
    color: '#FFF8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  numberInput: {
    width: 60,
    height: 32,
    textAlign: 'center',
    borderRadius: 8,
    paddingHorizontal: 6,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  textInput: {
    flex: 1, // expands search field
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
});
