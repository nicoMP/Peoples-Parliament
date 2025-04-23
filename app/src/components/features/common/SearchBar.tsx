import React, { useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity,
  ViewStyle,
  Keyboard,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  rightButton?: React.ReactNode;
  onSubmit?: () => void;
}

const SearchBar = ({ 
  value, 
  onChangeText, 
  placeholder = "Search...",
  style,
  rightButton,
  onSubmit
}: SearchBarProps) => {
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    Keyboard.dismiss();
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchInputContainer}>
        <TouchableOpacity 
          onPress={() => inputRef.current?.focus()}
          style={styles.searchIcon}
        >
          <MaterialIcons name="search" size={20} color="#666" />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={true}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <MaterialIcons name="close" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      {rightButton}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    padding: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
    height: 32,
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchBar; 