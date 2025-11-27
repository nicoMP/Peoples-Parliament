import { initDb } from "@/src/services/database";
import { Buffer } from 'buffer';
import { Redirect } from "expo-router";
import { useEffect } from "react";

global.Buffer = Buffer;


export default function Index() {
  useEffect(() => {
    initDb()
  }, [])
  return <Redirect href="/tabs/bills" />;
}