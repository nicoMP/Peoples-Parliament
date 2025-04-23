import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  BillDetails: { session: string, number: string}; // Define the BillDetails route and the parameters
  PDFViewer: { 
    uri: string; 
    title?: string;
    parliament?: string;
    session?: string;
    billNumber?: string;
  };
  // Add other routes as needed
};

export type ScreenOptions = {
  hasSafeArea?: boolean; // Controls safe area insets application
};

export type PoliticiansStackParamList = {
  PoliticiansList: undefined;
  PoliticianDetails: { id: string };
};

export type TabParamList = {
  BillsStack: ScreenOptions;
  MyBillsStack: NavigatorScreenParams<BillsStackParamList> & ScreenOptions;
  PoliticiansStack: NavigatorScreenParams<PoliticiansStackParamList> & ScreenOptions;
};

export type BillsStackParamList = {
  BillCarousel: ScreenOptions;
  BillDetails: { billId: number } & ScreenOptions;
}; 