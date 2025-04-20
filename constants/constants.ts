export const baseParliamentUrl = 'https://www.parl.ca/legisinfo/en/bills/json';
export const baseWebParliamentUrlEn = 'https://www.parl.ca/legisinfo/en/bill';
export const baseWebParliamentUrlFr = 'https://www.parl.ca/legisinfo/fr/bill';
export type RootStackParamList = {
    Home: undefined;
    BillDetails: { session: string, number: string, parliament?: string }; // Define the BillDetails route and the parameters
    // Add other routes as needed
  };
