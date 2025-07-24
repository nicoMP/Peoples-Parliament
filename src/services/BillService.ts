// src/services/BillService.ts
import axios, { AxiosInstance } from 'axios';
import { OpenParliamentService } from './OpenParliamentService';

export interface BillBySessionResponse {
  session: string;
  legisinfo_id: number;
  introduced: string;
  name: {
    en: string;
    fr: string;
  };
  number: string;
  url: string;
}

export interface BillBySessionResponsePaginated {
  objects: BillBySessionResponse[];
  pagination: {
    offset: number;
    limit: number;
    next_url: string | null;
    previous_url: string | null;
  }
}

export class BillService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = new OpenParliamentService().axiosInstance
  }

  /**
   * Fetches bills filtered by a specific session.
   * @param session The session ID (e.g., '45-1').
   * @returns A Promise resolving to an array of Bill objects.
   */
  public async getBillsBySession(session: string = '45-1'): Promise<BillBySessionResponsePaginated> {
    try {
      // Corrected: Use '?' for query parameters
      // The full URL will be like: https://api.openparliament.ca/bills/?session=45-1
      const response = await this.axiosInstance.get<BillBySessionResponsePaginated>(`/bills/?session=${encodeURIComponent(session)}`);
      return response.data; // Corrected: Return only the data part of the response
    } catch (error) {
      // The interceptor above already logs, but you can add more specific handling here
      throw error; // Re-throw the error for the calling component to handle
    }
  }
}