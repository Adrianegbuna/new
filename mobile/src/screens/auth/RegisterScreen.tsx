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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Incomplete form", "Fill in first name, last name, email, and password.");
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.register({
        firstName,
        lastName,
        email,
        password,
        phone,
        accountType: "customer"
      });
      await setSession({ user: response.user, token: response.accessToken });
    } catch (error: any) {
      Alert.alert("Registration failed", error?.response?.data?.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText style={styles.title}>Create your customer account</AppText>
        <AppText style={styles.subtitle}>This mobile build is focused on the core buying journey first.</AppText>
      </View>

      <View style={styles.form}>
        <InputField label="First name" value={firstName} onChangeText={setFirstName} placeholder="Jane" />
        <InputField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Doe" />
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="+234..." keyboardType="phone-pad" />
        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
        />
        <PrimaryButton label={loading ? "Creating account..." : "Create account"} onPress={handleRegister} disabled={loading} />
      </View>

      <AppText style={styles.link} onPress={() => navigation.navigate("Login")}>
        Already have an account? Login
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8
  },
  title: {
    fontSize: 26,
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
