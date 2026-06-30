import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Image, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { productApi, wishlistApi } from "@/api/services";
import { RootStackParamList } from "@/navigation/types";
import { useCartStore } from "@/store/cart-store";
import { colors } from "@/theme/colors";
import { resolveMediaUrl } from "@/utils/media";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetails">;

export function ProductDetailsScreen({ route, navigation }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const queryClient = useQueryClient();
  const productQuery = useQuery({
    queryKey: ["product", route.params.productId],
    queryFn: () => productApi.getById(route.params.productId)
  });

  const wishlistMutation = useMutation({
    mutationFn: wishlistApi.add,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      Alert.alert("Saved", "Product added to your wishlist.");
    },
    onError: (error: any) => {
      Alert.alert("Wishlist", error?.response?.data?.error || "Unable to save this product right now.");
    }
  });

  const product = productQuery.data;
  const title = product?.title || product?.name || "Product";
  const imageUrl = resolveMediaUrl(product?.image || product?.images?.[0]);

  return (
    <Screen>
      <View style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <AppText style={styles.muted}>No image available</AppText>
          </View>
        )}

        <AppText style={styles.title}>
          {productQuery.isLoading ? "Loading..." : title}
        </AppText>
        <AppText style={styles.price}>NGN {Number(product?.price || 0).toLocaleString()}</AppText>
        <AppText style={styles.meta}>
          {product?.categoryName || product?.category || "Renewable energy product"}
        </AppText>
        <AppText style={styles.meta}>Store: {product?.store?.name || "RenewableZmart Marketplace"}</AppText>
        <AppText style={styles.description}>
          {product?.description || "Product description will appear here as we expand the mobile experience."}
        </AppText>
        <View style={styles.buttonStack}>
          <PrimaryButton
            label="Add To Cart"
            onPress={() => {
              if (!product) return;
              addItem(product);
              Alert.alert("Added", "Product added to cart.");
            }}
            disabled={!product}
          />
          <PrimaryButton
            label={wishlistMutation.isPending ? "Saving..." : "Save To Wishlist"}
            onPress={() => {
              if (!product) return;
              wishlistMutation.mutate(product);
            }}
            disabled={!product || wishlistMutation.isPending}
          />
          <PrimaryButton
            label="Go To Cart"
            onPress={() => navigation.navigate("MainTabs")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 18
  },
  imageFallback: {
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "800"
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary
  },
  meta: {
    color: colors.textSoft
  },
  description: {
    lineHeight: 23
  },
  buttonStack: {
    gap: 10
  },
  muted: {
    color: colors.textSoft
  }
});
