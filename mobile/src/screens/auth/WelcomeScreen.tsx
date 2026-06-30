import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <AppText style={styles.badge}>Android Customer App</AppText>
        <AppText style={styles.title}>Clean energy shopping, now built for mobile.</AppText>
        <AppText style={styles.subtitle}>
          Browse products, manage your cart, track orders, and keep your account with you anywhere.
        </AppText>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Login" onPress={() => navigation.navigate("Login")} />
        <PrimaryButton label="Create Customer Account" onPress={() => navigation.navigate("Register")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700"
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSoft
  },
  actions: {
    gap: 12,
    justifyContent: "flex-end"
  }
});
