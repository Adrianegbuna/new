import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    backgroundColor: colors.primaryDark
  },
  label: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  }
});
