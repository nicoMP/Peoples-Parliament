import React, { ReactNode } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ViewStyle,
  ScrollView,
  View
} from 'react-native';

interface KeyboardAvoidingContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
  scrollEnabled?: boolean;
}

/**
 * A component that ensures content is visible when the keyboard appears,
 * without changing the visual appearance of the screen.
 */
const KeyboardAvoidingContainer = ({ 
  children, 
  style, 
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  scrollEnabled = true
}: KeyboardAvoidingContainerProps) => {
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollEnabled ? (
        <ScrollView
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default KeyboardAvoidingContainer; 