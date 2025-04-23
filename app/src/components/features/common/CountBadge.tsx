import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountBadgeProps {
  count: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * A badge component that displays a count number
 */
export default function CountBadge({ 
  count, 
  color = '#b22234', 
  size = 'small' 
}: CountBadgeProps) {
  if (count <= 0) return null;
  
  const sizeStyles = {
    small: {
      width: 18,
      height: 18,
      fontSize: 10,
      minWidth: 18,
    },
    medium: {
      width: 22,
      height: 22,
      fontSize: 12,
      minWidth: 22,
    },
    large: {
      width: 26,
      height: 26,
      fontSize: 14,
      minWidth: 26,
    }
  };
  
  const selectedSize = sizeStyles[size];
  
  return (
    <View style={[
      styles.badge, 
      { 
        backgroundColor: color,
        width: selectedSize.width,
        height: selectedSize.height,
        minWidth: selectedSize.minWidth
      }
    ]}>
      <Text style={[styles.text, { fontSize: selectedSize.fontSize }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  }
}); 