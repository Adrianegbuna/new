import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { wishlistApi } from "@/api/services";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { RootStackParamList } from "@/navigation/types";
import { useCartStore } from "@/store/cart-store";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Wishlist">;

export function WishlistScreen(_: Props) {
  const queryClient = useQueryClient();
  const addItem = useCartStore((state) => state.addItem);
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: wishlistApi.list
  });

  const removeMutation = useMutation({
    mutationFn: wishlistApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: (error: any) => {
      Alert.alert("Wishlist", error?.response?.data?.error || "Unable to remove this item.");
    }
  });

  return (
    <Screen>
      <FlatList
        data={wishlistQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <AppText style={styles.title}>{item.productName}</AppText>
            <AppText style={styles.meta}>{item.productCategory || "Renewable energy product"}</AppText>
            <AppText style={styles.price}>NGN {Number(item.productPrice || 0).toLocaleString()}</AppText>
            <View style={styles.row}>
              <PrimaryButton
                label="Add To Cart"
                onPress={() => {
                  addItem({
                    id: item.productId,
                    name: item.productName,
                    price: Number(item.productPrice || 0),
                    image: item.productImage,
                    stock: 99
                  });
                  Alert.alert("Added", "Wishlist item added to cart.");
                }}
              />
              <PrimaryButton
                label={removeMutation.isPending ? "Removing..." : "Remove"}
                onPress={() => removeMutation.mutate(item.id)}
                disabled={removeMutation.isPending}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.card}>
            <AppText style={styles.meta}>
              {wishlistQuery.isLoading ? "Loading wishlist..." : "Your wishlist is empty."}
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8
  },
  title: {
    fontWeight: "800",
    fontSize: 18
  },
  meta: {
    color: colors.textSoft
  },
  price: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  }
});
