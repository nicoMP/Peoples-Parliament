import { billTypeUrlDict, EBillTypeEn } from "../utility/bills";
import { IBillData } from "./BillService";
import { getDb } from "./database";

export interface IPdfDB {
    url: string,
    pdf: string,
    version: number
}
export class BillPdfService {
    private db = getDb();

    constructor() {

    }

    public async setBillPdf(bill: IBillData) {
        const billType = bill.BillTypeEn as EBillTypeEn;
        const billTypeUrl = billTypeUrlDict[billType];
        console.log(billType)

        for (let i = 1; i < 5; i++) {
            const billVersion = `${bill.BillNumberFormatted}_${i}`;
            const pdfUrl = `https://www.parl.ca/Content/Bills/${bill.ParliamentNumber}${bill.SessionNumber}/${billTypeUrl}/${bill.BillNumberFormatted}/${billVersion}/${billVersion}.PDF`;
            console.log("Trying:", pdfUrl);

            try {
                const res = await fetch(pdfUrl, {
                    method: "GET",
                    headers: {
                        Accept: "application/pdf",
                        "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8",
                        "User-Agent":
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15",
                        Referer: `https://www.parl.ca/DocumentViewer/en/${bill.ParliamentNumber}-${bill.SessionNumber}/bill/${bill.BillNumberFormatted}/first-reading`,
                        Cookie: "language=en",
                        Connection: "keep-alive",
                    },
                })
                if (!res.ok) {
                    throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}`);
                }

                const pdfArrayBuffer = await res.arrayBuffer();
                const base64 = Buffer.from(new Uint8Array(pdfArrayBuffer)).toString('base64');
                const pdfBase64 = `${base64}`;

                await this.db.runAsync(`
                    INSERT OR REPLACE INTO bills_pdf (BillID, pdf, url, version)
                    VALUES (?, ?, ?, ?);
                `, [bill.BillId, pdfBase64, pdfUrl, i]);
            } catch (error: any) {
                console.debug(
                    `Version ${billVersion} not found, trying next...`,
                    error
                );
                break;
            }
        }
    }

    public async findBillPdf(billId: number): Promise<IPdfDB[] | null> {
        return await this.db.getAllAsync(`
           SELECT * FROM bills_pdf
           WHERE BillId = ?
        `, [billId]);
    }

}