import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AppTabParamList } from "@/navigation/types";
import { addressApi, orderApi } from "@/api/services";
import { useCartStore } from "@/store/cart-store";
import { colors } from "@/theme/colors";

type Props = BottomTabScreenProps<AppTabParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const { items, updateQty, removeItem, clear } = useCartStore();
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: addressApi.list
  });

  const selectedAddress = useMemo(() => {
    const addresses = addressesQuery.data ?? [];
    if (!selectedAddressId) {
      return addresses.find((address) => address.isDefault) || addresses[0];
    }
    return addresses.find((address) => address.id === selectedAddressId) || null;
  }, [addressesQuery.data, selectedAddressId]);

  const checkoutMutation = useMutation({
    mutationFn: orderApi.create,
    onSuccess: async () => {
      clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] })
      ]);
      Alert.alert("Order placed", "Your order was submitted successfully.");
      navigation.navigate("Orders");
    },
    onError: (error: any) => {
      Alert.alert("Checkout failed", error?.response?.data?.message || "Unable to place your order right now.");
    }
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert("Cart empty", "Add products before checkout.");
      return;
    }

    if (!selectedAddress) {
      Alert.alert("Address required", "Add or choose a shipping address first.");
      return;
    }

    checkoutMutation.mutate({
      shippingAddress: selectedAddress,
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.qty,
        price: item.price
      }))
    });
  };

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText style={styles.itemTitle}>{item.title}</AppText>
              <AppText style={styles.itemMeta}>NGN {item.price.toLocaleString()}</AppText>
              <AppText style={styles.itemMeta}>Qty: {item.qty}</AppText>
            </View>
            <View style={styles.row}>
              <PrimaryButton label="+" onPress={() => updateQty(item.id, item.qty + 1)} />
              <PrimaryButton label="-" onPress={() => updateQty(item.id, item.qty - 1)} />
              <PrimaryButton label="Remove" onPress={() => removeItem(item.id)} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={styles.emptyText}>Your cart is empty.</AppText>
          </View>
        }
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <AppText style={styles.totalLabel}>Shipping address</AppText>
          <AppText style={styles.manageLink} onPress={() => navigation.getParent()?.navigate("Addresses")}>
            Manage
          </AppText>
        </View>
        {addressesQuery.data?.length ? (
          <View style={styles.addressList}>
            {addressesQuery.data.map((address) => {
              const active = selectedAddress?.id === address.id;
              return (
                <View key={address.id} style={[styles.addressCard, active && styles.addressCardActive]}>
                  <AppText style={styles.addressTitle} onPress={() => setSelectedAddressId(address.id)}>
                    {address.label || address.recipientName}
                    {address.isDefault ? "  Default" : ""}
                  </AppText>
                  <AppText style={styles.itemMeta}>{address.street}, {address.city}</AppText>
                  <AppText style={styles.itemMeta}>{address.phone}</AppText>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyAddress}>
            <AppText style={styles.emptyText}>No saved address yet. Add one before checkout.</AppText>
          </View>
        )}

        <AppText style={styles.totalLabel}>Cart total</AppText>
        <AppText style={styles.totalValue}>NGN {total.toLocaleString()}</AppText>
        <PrimaryButton
          label={checkoutMutation.isPending ? "Placing order..." : "Place Order"}
          onPress={handleCheckout}
          disabled={items.length === 0 || checkoutMutation.isPending}
        />
        <PrimaryButton label="Clear Cart" onPress={clear} disabled={items.length === 0 || checkoutMutation.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12
  },
  itemTitle: {
    fontWeight: "700",
    fontSize: 16
  },
  itemMeta: {
    color: colors.textSoft
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
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
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  manageLink: {
    color: colors.primary,
    fontWeight: "700"
  },
  addressList: {
    gap: 10
  },
  addressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 4
  },
  addressCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted
  },
  addressTitle: {
    fontWeight: "800"
  },
  emptyAddress: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14
  },
  totalLabel: {
    color: colors.textSoft
  },
  totalValue: {
    fontWeight: "800",
    fontSize: 24
  }
});
