import { NavigatorScreenParams } from '@react-navigation/native';
import { MyBillsStackParamList } from '@src/navigation/stacks/MyBillsStack';

export type ScreenOptions = {
  hasSafeArea?: boolean; // Controls safe area insets application
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> & ScreenOptions;
};

export type PoliticiansStackParamList = {
  PoliticiansList: undefined;
  PoliticianDetails: { id: string };
};

export type TabParamList = {
  BillsStack: ScreenOptions;
  MyBillsStack: NavigatorScreenParams<MyBillsStackParamList> & ScreenOptions;
  PoliticiansStack: NavigatorScreenParams<PoliticiansStackParamList> & ScreenOptions;
};

export type BillsStackParamList = {
  BillCarousel: ScreenOptions;
  BillDetails: { billId: number } & ScreenOptions;
}; 