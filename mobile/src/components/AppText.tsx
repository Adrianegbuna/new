import { PropsWithChildren } from "react";
import { StyleProp, Text, TextStyle } from "react-native";
import { colors } from "@/theme/colors";

interface AppTextProps extends PropsWithChildren {
  style?: StyleProp<TextStyle>;
  onPress?: () => void;
}

export function AppText({ children, style, onPress }: AppTextProps) {
  return (
    <Text style={[{ color: colors.text }, style]} onPress={onPress}>
      {children}
    </Text>
  );
}
