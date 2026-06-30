import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "@/navigation/AppNavigator";
import { AppProviders } from "@/providers/AppProviders";
import { useBootstrapAuth } from "@/store/auth-store";
import { useBootstrapCart } from "@/store/cart-store";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#f3f8f4",
    card: "#ffffff",
    primary: "#0f766e",
    text: "#102418",
    border: "#d8e6db"
  }
};

function Bootstrapper() {
  useBootstrapAuth();
  useBootstrapCart();
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Bootstrapper />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
