import React, { memo, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  LayoutAnimation,
  UIManager,
} from "react-native";
import type { IBillVoteRecord } from "@/src/services/BillVotesSevice";

type Props = {
  votes?: IBillVoteRecord[] | null;
  height?: number;          // expanded height (fixed)
  collapsedHeight?: number; // height when minimized
  title?: string;
  defaultCollapsed?: boolean;
};

const CARD_HEIGHT = 44;
const CARD_GAP = 8;

function safeNum(n: any) {
  if (n === null || n === undefined) return "—";
  return String(n);
}

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const BillVotesList = memo(function BillVotesList({
  votes,
  height = 150,
  collapsedHeight = 44, // basically header-only
  title = "Votes",
  defaultCollapsed = true,
}: Props) {
  const data = useMemo(() => votes ?? [], [votes]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // snap offsets that match *actual* positions when using a manual "gap"
  const snapOffsets = useMemo(() => {
    const row = CARD_HEIGHT + CARD_GAP;
    return data.map((_, i) => i * row);
  }, [data]);

  if (!data.length) return null;

  const containerHeight = collapsed ? collapsedHeight : height;

  const toggle = () => {
    setCollapsed((v) => !v);
  };

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Minimize"} ${title}`}
        style={({ pressed }) => [styles.headerRow, pressed && styles.headerPressed]}
        hitSlop={8}
      >
        <Text style={styles.title}>{title}</Text>

        <View style={styles.headerRight}>
          <Text style={styles.count}>{data.length}</Text>
          <Text style={styles.chev}>{collapsed ? "▾" : "▴"}</Text>
        </View>
      </Pressable>

      {!collapsed && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          decelerationRate={Platform.OS === "ios" ? "fast" : 0.95}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          disableIntervalMomentum
        >
          {data.map((vote, idx) => (
            <View
              key={String(idx)}
              style={[styles.card, idx === data.length - 1 && styles.cardLast]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Vote on ${vote.date}. Yea ${safeNum(
                vote.yea_total
              )}. Nay ${safeNum(vote.nay_total)}.`}
            >
              <Text style={styles.date} numberOfLines={1}>
                {vote.date}&nbsp;({data.length - idx})
              </Text>

              <View style={styles.divider} />

              <Text style={styles.totals} numberOfLines={1}>
                {safeNum(vote.yea_total)}–{safeNum(vote.nay_total)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E2E2",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  headerRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
  },

  headerPressed: { opacity: 0.9 },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#611A1A",
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  count: {
    fontSize: 12,
    fontWeight: "700",
    color: "#611A1A",
    opacity: 0.75,
  },

  chev: {
    fontSize: 12,
    fontWeight: "800",
    color: "#611A1A",
    opacity: 0.7,
  },

  scroll: { flex: 1 },

  scrollContent: {
    padding: 12,
  },

  card: {
    height: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EFEFEF",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: CARD_GAP, // manual gap for perfect snap offsets
  },

  cardLast: {
    marginBottom: 0, // avoids extra trailing space at end
  },

  date: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#222222",
  },

  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 10,
    backgroundColor: "#F1D6D6",
  },

  totals: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4A1B1B",
    minWidth: 54,
    textAlign: "right",
  },
});
