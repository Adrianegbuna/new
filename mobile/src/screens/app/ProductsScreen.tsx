import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "@/components/AppText";
import { ProductCard } from "@/components/ProductCard";
import { Screen } from "@/components/Screen";
import { productApi } from "@/api/services";
import { AppTabParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";

type Props = BottomTabScreenProps<AppTabParamList, "Products">;

export function ProductsScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const productsQuery = useQuery({
    queryKey: ["products", query],
    queryFn: () => (query.trim() ? productApi.search(query.trim()) : productApi.list())
  });

  return (
    <Screen>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search solar panels, batteries, inverters..."
        placeholderTextColor={colors.textSoft}
        style={styles.search}
      />

      <FlatList
        data={productsQuery.data ?? []}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
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
              {productsQuery.isLoading ? "Loading products..." : "No matching products found."}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text
  },
  list: {
    gap: 0
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
