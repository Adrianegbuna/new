import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { addressApi, wishlistApi } from "@/api/services";
import { AppTabParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { colors } from "@/theme/colors";

type Props = BottomTabScreenProps<AppTabParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const cartCount = useCartStore((state) => state.items.length);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: addressApi.list
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: wishlistApi.list
  });

  return (
    <Screen>
      <View style={styles.card}>
        <AppText style={styles.title}>
          {user?.firstName} {user?.lastName}
        </AppText>
        <AppText style={styles.meta}>{user?.email}</AppText>
        <AppText style={styles.meta}>Role: {user?.role || "customer"}</AppText>
        <AppText style={styles.meta}>City: {user?.city || "Not set"}</AppText>
      </View>

      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <AppText style={styles.metricValue}>{addressesQuery.data?.length || 0}</AppText>
          <AppText style={styles.meta}>Addresses</AppText>
        </View>
        <View style={styles.metricCard}>
          <AppText style={styles.metricValue}>{wishlistQuery.data?.length || 0}</AppText>
          <AppText style={styles.meta}>Wishlist</AppText>
        </View>
        <View style={styles.metricCard}>
          <AppText style={styles.metricValue}>{cartCount}</AppText>
          <AppText style={styles.meta}>Cart items</AppText>
        </View>
      </View>

      <View style={styles.card}>
        <AppText style={styles.sectionTitle}>Account actions</AppText>
        <PrimaryButton label="Manage Addresses" onPress={() => navigation.getParent()?.navigate("Addresses")} />
        <PrimaryButton label="Open Wishlist" onPress={() => navigation.getParent()?.navigate("Wishlist")} />
        <PrimaryButton label="Logout" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  metricCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6
  },
  metricValue: {
    fontWeight: "800",
    fontSize: 24,
    color: colors.primary
  },
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 18
  },
  meta: {
    color: colors.textSoft
  }
});
