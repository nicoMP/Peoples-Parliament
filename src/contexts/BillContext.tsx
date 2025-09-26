import { createContext, useContext, useMemo, useState } from 'react';
import { IBillData } from '../services/BillService';

type BillContext = {
    bills: IBillData[],
    setBills: (s: IBillData[]) => void,
}

const SessionCtx = createContext<BillContext | undefined>(undefined);

export function BillProvider({ children }: { children: React.ReactNode }) {
    const [bills, setBills] = useState<IBillData[]>([]);
    const value = useMemo(() => ({ bills, setBills }), [bills]);
    return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useBills() {
    const ctx = useContext(SessionCtx);
    if (!ctx) {
        throw new Error('useSession must be used inside <SessionProvider>')
    }
    return ctx
}

