// src/services/BillService.ts
import axios, { AxiosInstance } from 'axios';
import qs from "qs";

export interface PaginatedResponse<T> {
    objects: T[];
    pagination: PaginationObject
}

export interface PaginationObject {
    offset: number;
    limit: number;
    next_url: string | null;
    previous_url: string | null;
}

export class OpenParliamentService {
    private axiosInstance: AxiosInstance;

    constructor(
        endpoint: string = ''
    ) {
        // IMPORTANT for React Native:
        // process.env.OPEN_PARLIAMENT_BASE_URL needs to be correctly configured.
        // For local development on a device/emulator, use your machine's IP, not 'localhost'.
        // e.g., 'http://192.168.1.100:3000/api/parliament'
        // If OPEN_PARLIAMENT_BASE_URL is not set, provide a sensible default for testing.
        const baseApiUrl = process.env.OPEN_PARLIAMENT_BASE_URL || 'https://www.parl.ca/legisinfo'; // A common public API example

        this.axiosInstance = axios.create({
            baseURL: baseApiUrl + endpoint, // Combine base URL and specific endpoint
            timeout: 10000, // 10 seconds timeout
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
                // 'Authorization': 'Bearer YOUR_AUTH_TOKEN', // Add if you have auth
            },
        });

        // Add interceptors for better error logging (optional, but good practice)
        this.axiosInstance.interceptors.response.use(
            response => response,
            error => {
                if (axios.isAxiosError(error)) {
                    console.error('Axios Error in BillService:', error.message);
                    if (error.response) {
                        // console.error('Response Data:', error.response.data);
                        console.error('Response Status:', error.response.status);
                    } else if (error.request) {
                        console.error('No response received:', error.request);
                    }
                } else {
                    console.error(error.url)
                    console.error('Non-Axios Error in BillService:', error);
                }
                return Promise.reject(error); // Re-throw the error
            }
        );
    }

    get<T>(params: any, url: string = ''): Promise<T> {
        const fullUrl = this.axiosInstance.defaults.baseURL + url;
        console.log('Requesting URL:', fullUrl);
        console.log('With parameters:', params);
        return this.axiosInstance.get<T>(url, { params }).then(response => response.data);
    }

    public get baseUrl() {
        return this.axiosInstance.defaults.baseURL
    }
}
