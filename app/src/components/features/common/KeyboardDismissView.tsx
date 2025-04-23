import React, { ReactNode } from 'react';
import { TouchableWithoutFeedback, Keyboard, View, StyleSheet, ViewStyle } from 'react-native';

interface KeyboardDismissViewProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * A component that dismisses the keyboard when touching outside input fields.
 * Wrap your screens or forms with this component to implement keyboard dismissal.
 */
const KeyboardDismissView = ({ children, style }: KeyboardDismissViewProps) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardDismissView; 