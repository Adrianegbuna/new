import { useQuery } from "@tanstack/react-query";
import { FlatList, StyleSheet, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { orderApi } from "@/api/services";
import { AppTabParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";

type Props = BottomTabScreenProps<AppTabParamList, "Orders">;

export function OrdersScreen(_: Props) {
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: orderApi.myOrders
  });

  return (
    <Screen>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <AppText style={styles.title}>Order #{item.orderNumber || item.id}</AppText>
            <AppText style={styles.meta}>Status: {item.orderStatus || "Pending"}</AppText>
            <AppText style={styles.meta}>Payment: {item.paymentStatus || "Pending"}</AppText>
            <AppText style={styles.meta}>Items: {item.items?.length || 0}</AppText>
            {item.items?.slice(0, 2).map((orderItem, index) => (
              <AppText key={`${item.id}-${index}`} style={styles.itemLine}>
                {orderItem.productName || "Product"} x{orderItem.quantity}
              </AppText>
            ))}
            <AppText style={styles.total}>NGN {Number(item.totalAmount || item.total || 0).toLocaleString()}</AppText>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={styles.emptyText}>
              {ordersQuery.isLoading ? "Loading orders..." : "No orders found for this account yet."}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6
  },
  title: {
    fontSize: 17,
    fontWeight: "800"
  },
  meta: {
    color: colors.textSoft
  },
  itemLine: {
    color: colors.text,
    fontSize: 13
  },
  total: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18
  },
  emptyText: {
    color: colors.textSoft
  }
});
