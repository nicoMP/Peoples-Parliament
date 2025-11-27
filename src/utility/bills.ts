export enum EBillTypeEn {
    SenateGovernmentBill = "Senate Government Bill",
    HouseGovernmentBill = "House Government Bill",
    PrivateMembersBill = "Private Member’s Bill",
    SenatePublicBill = "Senate Public Bill",
    SenatePrivateBill = "Senate Private Bill",
}


export const billTypeUrlDict: Record<EBillTypeEn, "Government" | "Private"> = {
    [EBillTypeEn.SenateGovernmentBill]: "Government",
    [EBillTypeEn.HouseGovernmentBill]: "Government",
    [EBillTypeEn.PrivateMembersBill]: "Private",
    [EBillTypeEn.SenatePublicBill]: "Private",
    [EBillTypeEn.SenatePrivateBill]: "Private",
};