import { TextInput, StyleSheet } from 'react-native';
import { useSession } from '../contexts/SessionContext';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function BillHeader() {
  const { session, setSession, parliament, setParliament } = useSession();

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        keyboardType="numeric"
        value={parliament ? String(parliament) : ""}
        onChangeText={(t) => {
          if (t === "") {
            setParliament(0);
          } else {
            setParliament(parseInt(t, 10));
          }
        }}
        placeholder="Parliament"
        style={styles.input}
      />
      <TextInput
        keyboardType="numeric"
        value={session ? String(session) : ""}
        onChangeText={(t) => {
          if (t === "") {
            setSession(0);
          } else {
            setSession(parseInt(t, 10));
          }
        }}
        placeholder="Session"
        style={styles.input}
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
    height: 40
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
