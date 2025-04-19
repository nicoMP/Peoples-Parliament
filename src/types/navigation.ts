import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
};

export type TabParamList = {
  BillsStack: undefined;
  Profile: undefined;
};

export type BillsStackParamList = {
  BillCarousel: undefined;
  BillDetails: { billId: number };
}; 