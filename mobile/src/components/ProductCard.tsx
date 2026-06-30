import { Image, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { colors } from "@/theme/colors";
import type { Product } from "@/types";
import { resolveMediaUrl } from "@/utils/media";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const title = product.title || product.name || "Product";
  const imageUrl = resolveMediaUrl(product.image);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <AppText style={styles.placeholderText}>No image</AppText>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.meta}>{product.categoryName || product.category || "Renewable product"}</AppText>
        <AppText style={styles.price}>NGN {Number(product.price || 0).toLocaleString()}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border
  },
  imageWrap: {
    height: 170,
    backgroundColor: colors.surfaceMuted
  },
  image: {
    width: "100%",
    height: "100%"
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  placeholderText: {
    color: colors.textSoft
  },
  body: {
    padding: 14,
    gap: 6
  },
  title: {
    fontWeight: "700",
    fontSize: 16
  },
  meta: {
    color: colors.textSoft,
    fontSize: 13
  },
  price: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 16
  }
});
