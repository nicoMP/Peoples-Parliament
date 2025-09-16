import { initDb } from "@/src/services/database";
import { Redirect } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    initDb()
  }, [])
  return <Redirect href="/tabs/bills" />;
}