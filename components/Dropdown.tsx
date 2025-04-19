import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Dimensions, TouchableWithoutFeedback } from 'react-native';

interface DropdownProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  textColor?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, options, selectedValue, onSelect, textColor = '#333' }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const screenHeight = Dimensions.get('window').height;
  const optionHeight = 50; // Set the height of each option
  const maxModalHeight = screenHeight * 0.4; // Set the max height for the modal
  const modalHeight = Math.min(options.length * optionHeight, maxModalHeight); // Dynamic modal height

  // If the modal height is less than the available space, it's not scrollable
  const isScrollable = options.length * optionHeight > maxModalHeight;

  return (
    <View style={styles.dropdownContainer}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: textColor }]}>{selectedValue}</Text>
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
            {/* Only prevent propagation of taps on the modal content */}
            <TouchableWithoutFeedback>
              <View style={[styles.modalContainer, { height: modalHeight }]}>
                {isScrollable ? (
                  <ScrollView
                    style={styles.modalScrollContainer}
                    snapToInterval={optionHeight} // Enable snapping to each option height
                    decelerationRate="fast"
                    showsVerticalScrollIndicator={false}
                  >
                    {options.map((option, index) => {
                        const isLast = index === options.length - 1;
                        return (
                            <TouchableOpacity
                            key={option}
                            style={[
                                styles.modalItem,
                                { height: optionHeight },
                                isLast && { borderBottomWidth: 0 }, // Remove border for last item
                            ]}
                            onPress={() => {
                                onSelect(option);
                                setModalVisible(false);
                            }}
                            >
                            <Text style={styles.modalText}>{option}</Text>
                            </TouchableOpacity>
                        );
                        })
                    }
                  </ScrollView>
                ) : (
                  <View style={styles.modalScrollContainer}>
                    {options.map((option, index) => {
                    const isLast = index === options.length - 1;
                    return (
                        <TouchableOpacity
                        key={option}
                        style={[
                            styles.modalItem,
                            { height: optionHeight },
                            isLast && { borderBottomWidth: 0 }, // Remove border for last item
                        ]}
                        onPress={() => {
                            onSelect(option);
                            setModalVisible(false);
                        }}
                        >
                        <Text style={styles.modalText}>{option}</Text>
                        </TouchableOpacity>
                    );
                    })}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 10,
  },
  dropdownButton: {
    backgroundColor: '#faf8f6',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b22234',
    alignItems: 'center',
  },
  dropdownText: {
    width: 35,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    pointerEvents: 'auto', // Ensure the overlay can capture touches
  },
  modalContainer: {
    backgroundColor: '#faf8f6',
    width: 250,
    borderRadius: 10,
    overflow: 'hidden',
    pointerEvents: 'box-none', // Prevent the modal content from blocking the touch events
  },
  modalScrollContainer: {
    flex: 1,
  },
  modalItem: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#b22234',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  },
});

export default Dropdown;