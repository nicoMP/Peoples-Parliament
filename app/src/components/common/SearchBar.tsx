import React from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  Keyboard,
  ReturnKeyTypeOptions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  rightButton?: React.ReactNode;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onSubmit,
  returnKeyType = 'search',
  rightButton,
  autoFocus = false
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchIconContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
      </View>
      
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        returnKeyType={returnKeyType}
        onSubmitEditing={() => {
          if (onSubmit) onSubmit();
          Keyboard.dismiss();
        }}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      
      {value.length > 0 && Platform.OS !== 'ios' && (
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={() => onChangeText('')}
        >
          <MaterialIcons name="clear" size={18} color="#999" />
        </TouchableOpacity>
      )}
      
      {rightButton && (
        <View style={styles.rightButtonContainer}>
          {rightButton}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    height: 40,
    marginVertical: 4,
    width: '100%',
  },
  searchIconContainer: {
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    paddingHorizontal: 4,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 8,
  },
  rightButtonContainer: {
    marginLeft: 8,
  }
});

export default SearchBar; 