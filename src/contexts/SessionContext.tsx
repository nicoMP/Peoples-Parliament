import { createContext, useContext, useState, useMemo } from 'react';

type SessionContext = {
    session: number,
    setSession: (s: number) => void,
    parliament: number,
    setParliament: (p: number) => void
}

const SessionCtx = createContext<SessionContext | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<number>(1);
  const [parliament, setParliament] = useState<number>(45);
  const value = useMemo(() => ({ session, setSession, parliament, setParliament}), [session, parliament]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
    const ctx = useContext(SessionCtx);
    if(!ctx){
        throw new Error('useSession must be used inside <SessionProvider>')
    }
    return ctx
}

