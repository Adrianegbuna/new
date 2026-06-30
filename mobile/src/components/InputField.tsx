import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/colors";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
}

export function InputField(props: InputFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        style={styles.input}
        placeholderTextColor={colors.textSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text
  }
});
