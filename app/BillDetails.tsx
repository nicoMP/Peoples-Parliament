import { PdfViewer } from "@/src/components/PdfViewer";
import { BillPdfService, IPdfDB } from "@/src/services/BillPdfService";
import { BillService, IBillData } from "@/src/services/BillService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Pressable, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const billService = new BillService();
const billPdfService = new BillPdfService();

export default function BillDetails() {
  const router = useRouter();
  const { billId } = useLocalSearchParams<{ billId: string }>();

  const [bill, setBill] = useState<IBillData | null>(null);
  const [pdfs, setPdf] = useState<IPdfDB[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePdf, setactivePdf] = useState<IPdfDB | null>(null)

  useEffect(() => {
    if (!billId) return;
    (async () => {
      try {
        const data = await billService.getBillDetailsById(+billId);
        if (data) {
          await billPdfService.setBillPdf(data);
          const allPdfs = await billPdfService.findBillPdf(+billId);
          if (allPdfs?.length) {
            setPdf(allPdfs);
            setactivePdf(allPdfs[allPdfs.length - 1]);
          }
        }
        setBill(data);
      } catch (err) {
        console.error("Failed to fetch bill", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [billId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
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

        {bill && (
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {`Bill ${bill.BillNumberFormatted}` || "Bill details"}
          </Text>
        )}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {loading ? (
          <Text style={styles.messageText}>Loading…</Text>
        ) : !bill ? (
          <Text style={styles.messageText}>No bill found</Text>
        ) : !activePdf ? (
          <Text style={styles.messageText}>PDF not found</Text>
        ) : (
          <View style={styles.viewerSection}>
            <View style={styles.pdfWrapper}>
              {/* Compact version tabs, aligned to top-right */}
              <View style={styles.tabsRow}>
                {pdfs?.map((pdf) => {
                  const isActive = pdf.version === activePdf?.version;
                  const isLatest = pdf.version === pdfs.length;

                  return (
                    <Pressable
                      key={pdf.version}
                      onPress={() => setactivePdf(pdf)}
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

              {/* PDF card */}
              <View style={styles.pdfContainer}>
                <PdfViewer key={activePdf.version} pdfUrl={activePdf.url} />
              </View>
            </View>
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
    marginBottom: 25,
    textAlign: 'center'
  },

  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#611A1A", // your wine red
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

  messageText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#444444",
  },

  viewerSection: {
    flex: 1,
    padding: 16,
  },

  pdfWrapper: {
    flex: 1,
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
    top: -30,        // just above card, but subtle
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  tab: {
    marginLeft: 6,
    paddingVertical: 4,        // more compact
    paddingHorizontal: 10,
    minHeight: 32,             // still decent tap target with padding + hitSlop
    justifyContent: "center",

    backgroundColor: "#FFF5F5",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,

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
    fontSize: 12,        // compact but still readable
    fontWeight: "500",
  },

  tabTextActive: {
    color: "#3A0C0C",
    fontWeight: "700",
  },
});
