import { NavigatorScreenParams } from '@react-navigation/native';
import { MyBillsStackParamList } from '@src/navigation/stacks/MyBillsStack';

export type ScreenOptions = {
  hasSafeArea?: boolean; // Controls safe area insets application
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> & ScreenOptions;
};

export type TabParamList = {
  BillsStack: ScreenOptions;
  MyBillsStack: NavigatorScreenParams<MyBillsStackParamList> & ScreenOptions;
  Profile: ScreenOptions;
};

export type BillsStackParamList = {
  BillCarousel: ScreenOptions;
  BillDetails: { billId: number } & ScreenOptions;
}; 