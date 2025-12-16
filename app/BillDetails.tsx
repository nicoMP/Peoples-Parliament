import { BillVotesList } from "@/src/components/BillVoteList";
import { PdfViewer } from "@/src/components/PdfViewer";
import { BillPdfService, IPdfDB } from "@/src/services/BillPdfService";
import { BillService, IBillData } from "@/src/services/BillService";
import {
  BillVotesServices,
  IBillVoteRecord,
} from "@/src/services/BillVotesSevice";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const billService = new BillService();
const billPdfService = new BillPdfService();
const billVotesService = new BillVotesServices();

export default function BillDetails() {
  const router = useRouter();
  const { billId } = useLocalSearchParams<{ billId: string }>();

  const [bill, setBill] = useState<IBillData | null>(null);
  const [pdfs, setPdf] = useState<IPdfDB[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePdf, setActivePdf] = useState<IPdfDB | null>(null);
  const [votes, setVotes] = useState<IBillVoteRecord[] | null>(null);

  useEffect(() => {
    if (!billId) return;

    (async () => {
      setLoading(true);
      try {
        const data = await billService.getBillDetailsById(+billId);
        if (!data) {
          setBill(null);
          setPdf(null);
          setActivePdf(null);
          setVotes(null);
          return;
        }

        setBill(data);

        // PDFs
        await billPdfService.setBillPdf(data);
        const allPdfs = await billPdfService.findBillPdf(+billId);
        if (allPdfs?.length) {
          setPdf(allPdfs);
          setActivePdf(allPdfs[allPdfs.length - 1]); // latest
        } else {
          setPdf([]);
          setActivePdf(null);
        }

        // Votes
        await billVotesService.setBillVotes(data.ParlSessionCode, data);
        const billVotes = await billVotesService.findBillVotes(data.BillId);
        setVotes(billVotes ?? []);
      } catch (err) {
        console.error("Failed to fetch bill", err);
        setBill(null);
        setPdf(null);
        setActivePdf(null);
        setVotes(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [billId]);

  const headerTitle = useMemo(() => {
    if (!bill) return "Bill details";
    return `Bill ${bill.BillNumberFormatted}`;
  }, [bill]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {headerTitle}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <Text style={styles.messageText}>Loading…</Text>
        ) : !bill ? (
          <Text style={styles.messageText}>No bill found</Text>
        ) : (
          <View style={styles.body}>
            {/* PDF Area */}
            <View style={styles.viewerSection}>
              <View style={styles.pdfWrapper}>
                {/* Tabs */}
                {!!pdfs?.length && (
                  <View style={styles.tabsRow}>
                    {pdfs.map((pdf, idx) => {
                      const isActive = pdf.version === activePdf?.version;
                      const isLatest = idx === pdfs.length - 1;

                      return (
                        <Pressable
                          key={pdf.version}
                          onPress={() => setActivePdf(pdf)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: isActive }}
                          accessibilityLabel={
                            isLatest
                              ? `Latest version, version ${pdf.version}`
                              : `Version ${pdf.version}`
                          }
                          style={({ pressed }) => [
                            styles.tab,
                            isActive && styles.tabActive,
                            pressed && styles.tabPressed,
                          ]}
                          hitSlop={6}
                        >
                          <Text
                            style={[
                              styles.tabText,
                              isActive && styles.tabTextActive,
                            ]}
                          >
                            {isLatest ? "Latest" : `V.${pdf.version}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* PDF Card */}
                <View style={styles.pdfContainer}>
                  {activePdf ? (
                    <PdfViewer
                      key={activePdf.version}
                      pdfUrl={activePdf.url}
                    />
                  ) : (
                    <Text style={styles.messageText}>PDF not found</Text>
                  )}
                </View>
              </View>
            </View>
            {!!votes?.length && <BillVotesList votes={votes} height={100} />}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E2E2",
    marginBottom: 8
  },

  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#611A1A",
  },

  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
  },

  content: {
    flex: 1,
  },

  body: {
    flex: 1, // ✅ critical: lets PDF area get real height
  },

  messageText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#444444",
  },

  viewerSection: {
    flex: 1, // ✅ critical
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 28, // room for tabs above card
  },

  pdfWrapper: {
    flex: 1, // ✅ critical
    position: "relative",
  },

  pdfContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  tabsRow: {
    position: "absolute",
    top: -28,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 10,
    elevation: 10, // android
  },

  tab: {
    marginLeft: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 28,
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: "#D88A8A",
    borderBottomWidth: 0,
  },

  tabActive: {
    backgroundColor: "#F6D1D1",
    borderColor: "#8F1E1E",
  },

  tabPressed: {
    opacity: 0.85,
  },

  tabText: {
    color: "#4A1B1B",
    fontSize: 12,
    fontWeight: "500",
  },

  tabTextActive: {
    color: "#3A0C0C",
    fontWeight: "700",
  },
});
