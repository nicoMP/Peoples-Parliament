import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  FlatList, 
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface DropdownOption {
  label: string;
  value: string | boolean;
  icon?: string;
  iconColor?: string;
}

interface DropdownProps {
  label: string;
  options: string[] | DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  width?: number;
  height?: number;
  maxWidth?: number;
  textColor?: string;
  showIconOnly?: boolean;
  isTextLike?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  width = 200,
  height = 40,
  maxWidth,
  textColor = '#333',
  showIconOnly = false,
  isTextLike = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Convert options to standard format if they are strings
  const normalizedOptions: DropdownOption[] = options.map(option => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }
    return option as DropdownOption;
  });
  
  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    option => option.label === selectedValue
  ) || normalizedOptions[0];

  const handleSelect = (option: DropdownOption) => {
    onSelect(option.label);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { maxWidth: maxWidth || width }]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.selector,
          isTextLike ? styles.textLikeSelector : null,
          { width, height, borderColor: textColor }
        ]}
        onPress={() => setModalVisible(true)}
      >
        {selectedOption?.icon && !showIconOnly ? (
          <MaterialIcons
            name={selectedOption.icon as any}
            size={18}
            color={selectedOption.iconColor || textColor}
            style={styles.icon}
          />
        ) : null}
        
        {!showIconOnly && (
          <Text 
            style={[styles.selectedText, { color: textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedValue}
          </Text>
        )}
        
        {showIconOnly && selectedOption?.icon && (
          <MaterialIcons
            name={selectedOption.icon as any}
            size={22}
            color={selectedOption.iconColor || textColor}
          />
        )}
        
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={textColor}
        />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View 
            style={[
              styles.modalContent,
              { width: Math.min(width * 1.5, Dimensions.get('window').width - 40) }
            ]}
          >
            <FlatList
              data={normalizedOptions}
              keyExtractor={(item, index) => `${item.label}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.label === selectedValue ? styles.selectedItem : null
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  {item.icon && (
                    <MaterialIcons
                      name={item.icon as any}
                      size={18}
                      color={item.iconColor || textColor}
                      style={styles.icon}
                    />
                  )}
                  <Text 
                    style={[
                      styles.optionText,
                      item.label === selectedValue ? { color: textColor, fontWeight: 'bold' } : null
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  textLikeSelector: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  selectedText: {
    flex: 1,
    fontSize: 14,
  },
  icon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 300,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
});

export default Dropdown; 