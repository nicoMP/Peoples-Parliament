export const baseParliamentUrl = 'https://www.parl.ca/legisinfo/en/bills/json';
export const baseWebParliamentUrlEn = 'https://www.parl.ca/legisinfo/en/bill';
export const baseWebParliamentUrlFr = 'https://www.parl.ca/legisinfo/fr/bill';
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
