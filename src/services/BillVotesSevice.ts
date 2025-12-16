import { IBillData } from "./BillService";
import { getDb } from "./database";
import { OpenParliamentService } from "./OpenParliamentService";

export interface IBillVoteRecord {
    url: string;
    bill_url: string | null;
    session: string;
    number: number;
    BillID: number;
    date: string;
    description: VoteDescription;
    result: string;
    yea_total: number;
    nay_total: number;
    paired_total: number;
    context_statement: string;
    party_votes: PartyVote[];
}

interface VoteDescription {
    en: string;
    fr: string;
}

interface PartyVote {
    vote: string;          // "Yes" | "No" | maybe others, so keep string
    disagreement: number;  // appears to be a float
    party: PartyDetails;
}

interface PartyDetails {
    name: LanguageName;
    short_name: LanguageName;
}

interface LanguageName {
    en: string;
    fr?: string; // optional because short_name doesn't always include FR
}


const OpenParliamentInstance = new OpenParliamentService('', 'http://api.openparliament.ca');
export class BillVotesServices {
    private db = getDb();
    constructor() {
    }

    public async setBillVotes(session: string, bill: IBillData) {
        const billJSON: any = await OpenParliamentInstance.get(null, `/bills/${session}/${bill.BillNumberFormatted}`);
        const voteUrls = billJSON.vote_urls;
        Promise.all(voteUrls.map(async (voteUrl: string) => {
            const vote = <IBillVoteRecord>await OpenParliamentInstance.get(null, voteUrl.slice(0, -1));
            await this.db.runAsync(
                `INSERT OR REPLACE INTO vote_records (
                    bill_url, session, number, date, result,
                    yea_total, nay_total, paired_total,
                    context_statement, description_json, party_votes_json, BillID, url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    vote.bill_url,
                    vote.session,
                    vote.number,
                    vote.date,
                    vote.result,
                    vote.yea_total,
                    vote.nay_total,
                    vote.paired_total,
                    vote.context_statement,
                    JSON.stringify(vote.description),
                    JSON.stringify(vote.party_votes),
                    bill.BillId,
                    vote.url
                ]
            )

        }))
    }

    public async findBillVotes(billId: number): Promise<IBillVoteRecord[]> {
        return await this.db.getAllAsync(
            `SELECT * FROM vote_records WHERE billId = ?`,
            [billId]
        )
     }
}