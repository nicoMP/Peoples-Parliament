import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Interface for dropdown option with optional icon
export interface DropdownOption {
  label: string;
  value: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
}

interface DropdownProps {
  label: string;
  options: string[] | DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  textColor?: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  isTextLike?: boolean;
  showIconOnly?: boolean;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ 
  label, 
  options, 
  selectedValue, 
  onSelect, 
  textColor = '#333',
  width,
  height = 32,
  maxWidth,
  maxHeight,
  isTextLike = false,
  showIconOnly = false,
  disabled = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const screenHeight = Dimensions.get('window').height;
  const optionHeight = 40;
  const maxModalHeight = maxHeight || screenHeight * 0.4;
  const modalHeight = Math.min((Array.isArray(options) ? options.length : 0) * optionHeight, maxModalHeight);
  const isScrollable = (Array.isArray(options) ? options.length : 0) * optionHeight > maxModalHeight;

  // Determine if options are complex (with icons) or simple strings
  const isComplexOptions = Array.isArray(options) && options.length > 0 && typeof options[0] !== 'string';
  
  // Find the selected option object if using complex options
  const selectedOption = isComplexOptions 
    ? (options as DropdownOption[]).find(option => option.value === selectedValue) 
    : null;

  const styles = StyleSheet.create({
    dropdownContainer: {
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
      marginRight: 8,
    },
    dropdownButton: {
      backgroundColor: isTextLike ? 'transparent' : '#faf8f6',
      paddingHorizontal: isTextLike ? 0 : 12,
      borderRadius: isTextLike ? 0 : 5,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: isTextLike ? 0 : 1,
      borderColor: '#b22234',
      minWidth: isTextLike ? 40 : 60,
      height: isTextLike ? 'auto' : height,
      marginHorizontal: 0,
    },
    disabledButton: {
      opacity: 0.6,
      backgroundColor: isTextLike ? 'transparent' : '#f0f0f0',
    },
    dropdownText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: isTextLike ? 'left' : 'center',
      width: '100%',
      color: textColor,
    },
    disabledText: {
      color: '#999',
    },
    dropdownIcon: {
      marginRight: showIconOnly ? 0 : 8,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      backgroundColor: '#faf8f6',
      borderRadius: 10,
      overflow: 'hidden',
    },
    modalScrollContainer: {
      flex: 1,
    },
    modalItem: {
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#b22234',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    modalText: {
      fontSize: 16,
      color: '#333',
      textAlign: 'center',
      flex: 1,
    },
    modalIcon: {
      marginRight: 8,
    },
  });

  // Render the selected value (text, icon, or both)
  const renderSelectedValue = () => {
    if (isComplexOptions && selectedOption?.icon) {
      return (
        <View style={styles.optionRow}>
          <MaterialIcons 
            name={selectedOption.icon} 
            size={20} 
            color={disabled ? '#999' : (selectedOption.iconColor || textColor)}
            style={styles.dropdownIcon}
          />
          {!showIconOnly && (
            <Text 
              style={[
                styles.dropdownText, 
                { color: disabled ? '#999' : textColor },
                disabled && styles.disabledText
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedOption.label}
            </Text>
          )}
        </View>
      );
    } else {
      return (
        <Text 
          style={[
            styles.dropdownText, 
            { color: disabled ? '#999' : textColor },
            disabled && styles.disabledText
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {selectedValue}
        </Text>
      );
    }
  };

  // Render an option item in the dropdown
  const renderOption = (option: string | DropdownOption, index: number, isLast: boolean) => {
    if (typeof option === 'string') {
      return (
        <TouchableOpacity
          key={option}
          style={[
            styles.modalItem,
            { height: optionHeight },
            isLast && { borderBottomWidth: 0 },
          ]}
          onPress={() => {
            onSelect(option);
            setModalVisible(false);
          }}
        >
          <Text 
            style={styles.modalText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {option}
          </Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.modalItem,
            { height: optionHeight },
            isLast && { borderBottomWidth: 0 },
          ]}
          onPress={() => {
            onSelect(option.value);
            setModalVisible(false);
          }}
        >
          <View style={styles.optionRow}>
            {option.icon && (
              <MaterialIcons 
                name={option.icon} 
                size={20} 
                color={option.iconColor || '#333'}
                style={styles.modalIcon}
              />
            )}
            <Text 
              style={styles.modalText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {option.label}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={[styles.dropdownContainer, { width }]}>
      <View style={styles.row}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TouchableOpacity
          style={[
            styles.dropdownButton, 
            { height },
            disabled && styles.disabledButton
          ]}
          onPress={() => !disabled && setModalVisible(true)}
          disabled={disabled}
        >
          {renderSelectedValue()}
        </TouchableOpacity>
      </View>
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.modalContainer, 
                { 
                  height: modalHeight,
                  width: maxWidth || 250
                }
              ]}>
                <ScrollView 
                  style={styles.modalScrollContainer}
                  scrollEnabled={isScrollable}
                >
                  {Array.isArray(options) && options.map((option, index) => {
                    const isLast = index === options.length - 1;
                    return renderOption(option, index, isLast);
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Dropdown;