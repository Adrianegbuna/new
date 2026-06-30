import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "@/components/AppText";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { productApi } from "@/api/services";
import { AppTabParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { colors } from "@/theme/colors";

const quickLinks = [
  "Solar Panels",
  "Inverters",
  "Batteries",
  "Service Requests"
];

type Props = BottomTabScreenProps<AppTabParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) => state.items.length);
  const productsQuery = useQuery({
    queryKey: ["home-products"],
    queryFn: productApi.list
  });

  const products = productsQuery.data ?? [];
  const featured = products.slice(0, 4);

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText style={styles.kicker}>RenewableZmart Android</AppText>
        <AppText style={styles.title}>Hi {user?.firstName || "there"}, your web flow is now mobile.</AppText>
        <AppText style={styles.copy}>
          Shop products, review your cart, place orders, and manage your account with the same backend powering the web app.
        </AppText>
        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <AppText style={styles.heroStatValue}>{products.length}</AppText>
            <AppText style={styles.heroStatLabel}>Products</AppText>
          </View>
          <View style={styles.heroStatCard}>
            <AppText style={styles.heroStatValue}>{cartCount}</AppText>
            <AppText style={styles.heroStatLabel}>Cart items</AppText>
          </View>
        </View>
        <Pressable style={styles.cta} onPress={() => navigation.navigate("Products")}>
          <AppText style={styles.ctaText}>Browse Products</AppText>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>Quick links</AppText>
      </View>
      <View style={styles.quickGrid}>
        {quickLinks.map((item) => (
          <Pressable key={item} style={styles.quickCard} onPress={() => navigation.navigate("Products")}>
            <AppText style={styles.quickCardText}>{item}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>Featured products</AppText>
      </View>

      <FlatList
        data={featured}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() =>
              navigation.getParent()?.navigate("ProductDetails", { productId: String(item.id) })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={styles.emptyText}>
              {productsQuery.isLoading ? "Loading products..." : "No products yet."}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 26,
    padding: 22,
    gap: 12
  },
  kicker: {
    color: "#d8fff0",
    fontWeight: "700"
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34
  },
  copy: {
    color: "#d8fff0",
    fontSize: 15,
    lineHeight: 22
  },
  heroStats: {
    flexDirection: "row",
    gap: 12
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 14,
    gap: 4
  },
  heroStatValue: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 22
  },
  heroStatLabel: {
    color: "#d8fff0"
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999
  },
  ctaText: {
    fontWeight: "800"
  },
  sectionHeader: {
    marginTop: 6
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800"
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16
  },
  quickCardText: {
    fontWeight: "700"
  },
  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18
  },
  emptyText: {
    color: colors.textSoft
  }
});
