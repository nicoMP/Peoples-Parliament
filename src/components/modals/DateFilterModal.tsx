import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Dropdown from '@components/Dropdown';
import { DATE_FILTERS } from '@services/filters/FilterConstants';
import DateTimePicker from '@react-native-community/datetimepicker';

const DATE_FIELDS = [
  { label: 'Last Updated', value: 'LastUpdatedDateTime' },
  { label: 'First Reading (House)', value: 'PassedHouseFirstReadingDateTime' },
  { label: 'Second Reading (House)', value: 'PassedHouseSecondReadingDateTime' },
  { label: 'Third Reading (House)', value: 'PassedHouseThirdReadingDateTime' },
  { label: 'First Reading (Senate)', value: 'PassedSenateFirstReadingDateTime' },
  { label: 'Second Reading (Senate)', value: 'PassedSenateSecondReadingDateTime' },
  { label: 'Third Reading (Senate)', value: 'PassedSenateThirdReadingDateTime' },
  { label: 'Royal Assent', value: 'ReceivedRoyalAssentDateTime' },
];

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  onDateFieldChange: (field: string) => void;
  onDateSortChange: (order: 'asc' | 'desc') => void;
  onDateRangeChange: (startDate?: Date, endDate?: Date) => void;
  selectedDateField?: string;
  dateSortOrder?: 'asc' | 'desc';
}

export default function DateFilterModal({
  visible,
  onClose,
  dateFilter,
  onDateFilterChange,
  onDateFieldChange,
  onDateSortChange,
  onDateRangeChange,
  selectedDateField = 'LastUpdatedDateTime',
  dateSortOrder = 'desc',
}: DateFilterModalProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [localDateField, setLocalDateField] = useState<string>(selectedDateField || 'LastUpdatedDateTime');
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>(dateSortOrder || 'desc');
  const isInitialized = useRef(false);
  
  // One-time initialization on mount
  useEffect(() => {
    if (!isInitialized.current) {
      // Set defaults and notify parent
      const defaultField = 'LastUpdatedDateTime';
      const defaultOrder = 'desc';
      
      console.log('Initializing DateFilterModal with defaults:', defaultField, defaultOrder);
      
      setLocalDateField(defaultField);
      setLocalSortOrder(defaultOrder);
      
      // Explicitly call parent handlers with defaults
      onDateFieldChange(defaultField);
      onDateSortChange(defaultOrder);
      
      isInitialized.current = true;
    }
  }, []);
  
  // Sync with parent props
  useEffect(() => {
    if (selectedDateField && selectedDateField !== localDateField) {
      setLocalDateField(selectedDateField);
    }
  }, [selectedDateField]);
  
  useEffect(() => {
    if (dateSortOrder && dateSortOrder !== localSortOrder) {
      setLocalSortOrder(dateSortOrder);
    }
  }, [dateSortOrder]);
  
  // Apply values when modal becomes visible
  useEffect(() => {
    if (visible) {
      console.log('Modal visible, applying filters:', localDateField, localSortOrder);
      // Ensure current values are applied when modal is shown
      onDateFieldChange(localDateField); 
      onDateSortChange(localSortOrder);
    }
  }, [visible, localDateField, localSortOrder, onDateFieldChange, onDateSortChange]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (pickerMode === 'start') {
        setStartDate(selectedDate);
        setPickerMode('end');
      } else {
        setEndDate(selectedDate);
        setShowDatePicker(false);
        onDateRangeChange(startDate, selectedDate);
      }
    } else {
      setShowDatePicker(false);
    }
  };

  const handleDateFieldChange = (field: string) => {
    console.log('Changing date field to:', field);
    setLocalDateField(field);
    onDateFieldChange(field);
  };

  const handleDateSortChange = () => {
    const newOrder = localSortOrder === 'asc' ? 'desc' : 'asc';
    console.log('Changing sort order to:', newOrder);
    setLocalSortOrder(newOrder);
    onDateSortChange(newOrder);
  };

  const handleDateFilterSelect = (filter: string) => {
    onDateFilterChange(filter);
    // Make sure current field and sort order are applied when closing
    onDateFieldChange(localDateField);
    onDateSortChange(localSortOrder);
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Time Range</Text>
          
          <View style={styles.dateFieldContainer}>
            <Text style={styles.dateFieldLabel}>Filter by:</Text>
            <Dropdown
              label=""
              options={DATE_FIELDS.map(field => field.label)}
              selectedValue={DATE_FIELDS.find(f => f.value === localDateField)?.label || 'Last Updated'}
              onSelect={(label) => {
                const field = DATE_FIELDS.find(f => f.label === label)?.value || 'LastUpdatedDateTime';
                handleDateFieldChange(field);
              }}
              textColor="#b22234"
              width={200}
              height={36}
              maxWidth={300}
            />
            <TouchableOpacity 
              style={[
                styles.sortButton,
                localSortOrder === 'asc' ? styles.sortButtonAsc : styles.sortButtonDesc
              ]}
              onPress={handleDateSortChange}
            >
              <MaterialIcons 
                name={localSortOrder === 'asc' ? "arrow-upward" : "arrow-downward"} 
                size={20} 
                color="#b22234" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.dateFilterOptions}>
            {DATE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.dateFilterOption,
                  dateFilter === filter.value && styles.dateFilterOptionActive
                ]}
                onPress={() => handleDateFilterSelect(filter.value)}
              >
                <Text style={[
                  styles.dateFilterOptionText,
                  dateFilter === filter.value && styles.dateFilterOptionTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                onClose();
                onDateFilterChange('all');
                // Ensure default field and sort are applied when closing
                onDateFieldChange(localDateField);
                onDateSortChange(localSortOrder);
              }}
            >
              <Text style={styles.modalButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                // Ensure field and sort are applied when closing
                onDateFieldChange(localDateField);
                onDateSortChange(localSortOrder);
                onClose();
              }}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={pickerMode === 'start' ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  dateFieldLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sortButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b22234',
  },
  sortButtonAsc: {
    backgroundColor: '#f8e7e7',
  },
  sortButtonDesc: {
    backgroundColor: '#e7f0f8',
  },
  dateFilterOptions: {
    marginVertical: 16,
    gap: 8,
  },
  dateFilterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b22234',
    backgroundColor: '#fff',
  },
  dateFilterOptionActive: {
    backgroundColor: '#b22234',
  },
  dateFilterOptionText: {
    color: '#b22234',
    fontSize: 16,
    textAlign: 'center',
  },
  dateFilterOptionTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#b22234',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 