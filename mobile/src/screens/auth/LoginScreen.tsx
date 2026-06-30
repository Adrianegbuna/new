import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { authApi } from "@/api/services";
import { useAuthStore } from "@/store/auth-store";
import { AuthStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.login(email, password);
      if (response.requiresMfa) {
        Alert.alert("MFA required", "This first mobile version does not yet include the MFA verification step.");
        return;
      }
      await setSession({ user: response.user, token: response.accessToken });
    } catch (error: any) {
      Alert.alert("Login failed", error?.response?.data?.message || "Unable to login right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <AppText style={styles.title}>Welcome back</AppText>
        <AppText style={styles.subtitle}>Login with your existing customer account.</AppText>
      </View>

      <View style={styles.form}>
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
        />
        <PrimaryButton label={loading ? "Signing in..." : "Login"} onPress={handleLogin} disabled={loading} />
      </View>

      <AppText style={styles.link} onPress={() => navigation.navigate("Register")}>
        Need an account? Create one
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 16
  },
  form: {
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center"
  }
});
