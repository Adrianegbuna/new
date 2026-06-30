import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
}

export function Screen({ children, scroll = true }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 16
  }
});
