import React, { useRef, useState, useEffect } from 'react';
import { TextInput, StyleSheet, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../contexts/SessionContext';

export default function BillHeader() {
  const { session, setSession, parliament, setParliament } = useSession();

  // Local (string) state so we don't touch context until submit
  const [localParliament, setLocalParliament] = useState(
    parliament ? String(parliament) : ''
  );
  const [localSession, setLocalSession] = useState(
    session ? String(session) : ''
  );

  // If context changes elsewhere, keep inputs in sync (optional)
  useEffect(() => {
    setLocalParliament(parliament ? String(parliament) : '');
  }, [parliament]);

  useEffect(() => {
    setLocalSession(session ? String(session) : '');
  }, [session]);

  const parliamentRef = useRef<TextInput>(null);
  const sessionRef = useRef<TextInput>(null);

  const commitAndSubmit = () => {
    const p = localParliament === '' ? 0 : parseInt(localParliament, 10);
    const s = localSession === '' ? 0 : parseInt(localSession, 10);

    // Commit to context only here
    setParliament(Number.isNaN(p) ? 0 : p);
    setSession(Number.isNaN(s) ? 0 : s);

    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        ref={parliamentRef}
        keyboardType="numeric"
        value={localParliament}
        onChangeText={(t) => {
          // keep only digits
          const digits = t.replace(/[^0-9]/g, '');
          setLocalParliament(digits);
        }}
        placeholder="Parliament"
        style={styles.input}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => sessionRef.current?.focus()}
      />

      <TextInput
        ref={sessionRef}
        keyboardType="numeric"
        value={localSession}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          setLocalSession(digits);
        }}
        placeholder="Session"
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={commitAndSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 15,
    paddingTop: 5,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 40,
  },
  input: {
    flex: 1,
    height: 30,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    fontSize: 12,
  },
});
