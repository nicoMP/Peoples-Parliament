import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions, TouchableWithoutFeedback } from 'react-native';

interface DropdownProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  textColor?: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  isTextLike?: boolean;
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
  isTextLike = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const screenHeight = Dimensions.get('window').height;
  const optionHeight = 40;
  const maxModalHeight = maxHeight || screenHeight * 0.4;
  const modalHeight = Math.min(options.length * optionHeight, maxModalHeight);
  const isScrollable = options.length * optionHeight > maxModalHeight;

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
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: isTextLike ? 0 : 1,
      borderColor: '#b22234',
      minWidth: isTextLike ? 40 : 60,
      height: isTextLike ? 'auto' : height,
      marginHorizontal: 0,
    },
    dropdownText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      width: '100%',
      color: textColor,
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
    },
    modalText: {
      fontSize: 16,
      color: '#333',
      textAlign: 'center',
      width: '100%',
    },
  });

  return (
    <View style={[styles.dropdownContainer, { width }]}>
      <View style={styles.row}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TouchableOpacity
          style={[styles.dropdownButton, { height }]}
          onPress={() => setModalVisible(true)}
        >
          <Text 
            style={[styles.dropdownText, { color: textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedValue}
          </Text>
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
                  {options.map((option, index) => {
                    const isLast = index === options.length - 1;
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