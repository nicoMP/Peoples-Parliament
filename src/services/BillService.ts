// src/services/BillService.ts
import { EBillTypeEn } from '../utility/bills';
import { IPdfDB } from './BillPdfService';
import { getDb } from './database';
import { OpenParliamentService } from './OpenParliamentService';

export interface IBillData extends IBillDetailsRes, IBillLocalData {
}

export interface IBillLocalData {
  BillId: number;
  IsLiked: boolean,
  IsDisliked: boolean
}
export interface IBillDetailsRes {
  SearchScore: number;
  BillId: number;
  BillNumberPrefix: string | null;
  BillNumber: number;
  BillNumberSuffix: string | null;
  BillNumberFormatted: string;
  LongTitleEn: string;
  LongTitleFr: string;
  ShortTitleEn: string;
  ShortTitleFr: string;
  LatestBillMilestoneId: number;
  LatestCompletedMajorStageEn: string;
  LatestCompletedMajorStageFr: string;
  LatestCompletedMajorStageChamberId: number;
  DidReinstateFromPreviousSession: boolean;
  PassedHouseFirstReadingDateTime: string | null;
  PassedHouseSecondReadingDateTime: string | null;
  PassedHouseThirdReadingDateTime: string | null;
  PassedSenateFirstReadingDateTime: string | null;
  PassedSenateSecondReadingDateTime: string | null;
  PassedSenateThirdReadingDateTime: string | null;
  ReceivedRoyalAssentDateTime: string | null;
  ParlSessionCode: string;
  ParlSessionEn: string;
  ParlSessionFr: string;
  ParliamentNumber: number;
  SessionNumber: number;
  OriginatingChamberId: number;
  BillTypeId: number;
  BillTypeEn: EBillTypeEn;
  BillTypeFr: string;
  CurrentStatusId: number;
  CurrentStatusEn: string;
  CurrentStatusFr: string;
  MinistryId: number;
  SponsorId: number;
  SponsorEn: string;
  SponsorFr: string;
  PoliticalAffiliationId: number;
  IsFromCurrentSession: boolean;
  Highlight: string | null;
  LatestBillTextTypeId: number;
  LatestActivityEn: string;
  LatestActivityFr: string;
  LatestActivityDateTime: string;
}

const OpenParliamentInstance = new OpenParliamentService('/legisinfo/en/bills/json')
export class BillService {
  public bills: Map<number, IBillDetailsRes> = new Map();
  private db = getDb();
  constructor() {
  }

  /**
   * Fetches bills filtered by a specific session.
   * @param session The session ID (e.g., '45-1').
   * @returns A Promise resolving to an array of Bill objects.
   */
  public async getBillsBySession(parliament: number = 45, session: number = 1) {
    const parlsession = `${parliament}-${session}`;
    const oneDayAgo = Math.floor((Date.now() - 86400000) / 1000);
    const cachedSession = await this.db.getFirstAsync(`SELECT * FROM cached_session WHERE session = ? AND parliament = ? AND updated_on > ?`, [session, parliament, oneDayAgo]);
    if (!cachedSession) {
      try {
        const bills = await OpenParliamentInstance.get<IBillDetailsRes[]>({
          parlsession
        });
        bills.forEach(async (bill) => {
          await this.db.runAsync(insertBillSQL, [
            bill.BillId,
            bill.BillNumberPrefix,
            bill.BillNumber,
            bill.BillNumberSuffix,
            bill.BillNumberFormatted,
            bill.LongTitleEn,
            bill.LongTitleFr,
            bill.ShortTitleEn,
            bill.ShortTitleFr,
            bill.LatestBillMilestoneId,
            bill.LatestCompletedMajorStageEn,
            bill.LatestCompletedMajorStageFr,
            bill.LatestCompletedMajorStageChamberId,
            bill.DidReinstateFromPreviousSession ? 1 : 0,
            bill.PassedHouseFirstReadingDateTime,
            bill.PassedHouseSecondReadingDateTime,
            bill.PassedHouseThirdReadingDateTime,
            bill.PassedSenateFirstReadingDateTime,
            bill.PassedSenateSecondReadingDateTime,
            bill.PassedSenateThirdReadingDateTime,
            bill.ReceivedRoyalAssentDateTime,
            bill.ParlSessionCode,
            bill.ParlSessionEn,
            bill.ParlSessionFr,
            bill.ParliamentNumber,
            bill.SessionNumber,
            bill.OriginatingChamberId,
            bill.BillTypeId,
            bill.BillTypeEn,
            bill.BillTypeFr,
            bill.CurrentStatusId,
            bill.CurrentStatusEn,
            bill.CurrentStatusFr,
            bill.MinistryId,
            bill.SponsorId,
            bill.SponsorEn,
            bill.SponsorFr,
            bill.PoliticalAffiliationId,
            bill.IsFromCurrentSession ? 1 : 0,
            bill.Highlight,
            bill.LatestBillTextTypeId,
            bill.LatestActivityEn,
            bill.LatestActivityFr,
            bill.LatestActivityDateTime
          ]);
        })
        await this.db.runAsync(`INSERT OR REPLACE INTO cached_session (session, parliament) VALUES (?, ?)`, [session, parliament]);
      } catch (e) {
        console.error(e)
      }
    }
  }

  public async getBillsDataBySession(
    parliament: number = 45,
    session: number = 1,
    titleSearch: string = ''
  ): Promise<IBillData[]> {
    let sql = `
      SELECT b.*, bli.IsLiked, bli.IsDisliked
      FROM bills b
      LEFT JOIN bills_local_info bli
        ON b.BillId = bli.BillId
      WHERE b.ParliamentNumber = ?
        AND b.SessionNumber = ?
    `;

    const params: any[] = [parliament, session];

    if (titleSearch) {
      sql += ` AND (b.LongTitleEn LIKE ? OR b.BillNumberFormatted LIKE ?)`;
      params.push(`%${titleSearch}%`);
      params.push(`%${titleSearch}%`);
    }

    return this.db.getAllAsync(sql, params);
  }

  public async getBillDetailsById(billId: number): Promise<IBillData | null> {
    return await this.db.getFirstAsync(`
      SELECT b.*, bli.IsLiked, bli.IsDisliked
      FROM bills b
      LEFT JOIN bills_local_info bli
        ON b.BillId = bli.BillId
      WHERE b.BillId = ?
      `, [billId])
  }

  public async getBillPdfById(billId: number): Promise<IPdfDB | null> {
    return await this.db.getFirstAsync(`
      SELECT b.*, bli.IsLiked, bli.IsDisliked
      FROM bills b
      LEFT JOIN bills_local_info bli
        ON b.BillId = bli.BillId
      WHERE b.BillId = ?
      `, [billId])
  }

  public async likeBill(billId: number) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO bills_local_info (BillId, IsLiked, IsDisliked)
      VALUES (?, 1, 0)`,
      [billId]
    );
  }

  public async dislikeBill(billId: number) {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO bills_local_info (BillId, IsLiked, IsDisliked)
      VALUES (?, 0, 1)`,
      [billId]
    );
  }

}

const insertBillSQL = `
  INSERT OR REPLACE INTO bills (
    BillId,
    BillNumberPrefix,
    BillNumber,
    BillNumberSuffix,
    BillNumberFormatted,
    LongTitleEn,
    LongTitleFr,
    ShortTitleEn,
    ShortTitleFr,
    LatestBillMilestoneId,
    LatestCompletedMajorStageEn,
    LatestCompletedMajorStageFr,
    LatestCompletedMajorStageChamberId,
    DidReinstateFromPreviousSession,
    PassedHouseFirstReadingDateTime,
    PassedHouseSecondReadingDateTime,
    PassedHouseThirdReadingDateTime,
    PassedSenateFirstReadingDateTime,
    PassedSenateSecondReadingDateTime,
    PassedSenateThirdReadingDateTime,
    ReceivedRoyalAssentDateTime,
    ParlSessionCode,
    ParlSessionEn,
    ParlSessionFr,
    ParliamentNumber,
    SessionNumber,
    OriginatingChamberId,
    BillTypeId,
    BillTypeEn,
    BillTypeFr,
    CurrentStatusId,
    CurrentStatusEn,
    CurrentStatusFr,
    MinistryId,
    SponsorId,
    SponsorEn,
    SponsorFr,
    PoliticalAffiliationId,
    IsFromCurrentSession,
    Highlight,
    LatestBillTextTypeId,
    LatestActivityEn,
    LatestActivityFr,
    LatestActivityDateTime
  ) VALUES (
    ?,?,?,?,?,?,?,?,?,?,
    ?,?,?,?,?,?,?,?,?,?,
    ?,?,?,?,?,?,?,?,?,?,
    ?,?,?,?,?,?,?,?,?,?,
    ?,?,?,?
  );
`;
