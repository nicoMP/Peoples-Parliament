import { useThemeColor } from '@hooks/useThemeColor';
import { View, type ViewProps } from 'react-native';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ViewProps & ThemeProps;

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
