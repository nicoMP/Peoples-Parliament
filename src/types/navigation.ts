import { NavigatorScreenParams } from '@react-navigation/native';

export type ScreenOptions = {
  hasSafeArea?: boolean; // Controls safe area insets application
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> & ScreenOptions;
};

export type TabParamList = {
  BillsStack: ScreenOptions;
  MyBillsStack: ScreenOptions;
  Profile: ScreenOptions;
};

export type BillsStackParamList = {
  BillCarousel: ScreenOptions;
  BillDetails: { billId: number } & ScreenOptions;
}; 