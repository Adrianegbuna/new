import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuthStore } from "@/store/auth-store";
import { AuthStackParamList, AppTabParamList, RootStackParamList } from "@/navigation/types";
import { WelcomeScreen } from "@/screens/auth/WelcomeScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { HomeScreen } from "@/screens/app/HomeScreen";
import { ProductsScreen } from "@/screens/app/ProductsScreen";
import { ProductDetailsScreen } from "@/screens/app/ProductDetailsScreen";
import { CartScreen } from "@/screens/app/CartScreen";
import { OrdersScreen } from "@/screens/app/OrdersScreen";
import { ProfileScreen } from "@/screens/app/ProfileScreen";
import { AddressesScreen } from "@/screens/app/AddressesScreen";
import { WishlistScreen } from "@/screens/app/WishlistScreen";
import { colors } from "@/theme/colors";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<AppTabParamList>();

function TabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Products" component={ProductsScreen} />
      <Tabs.Screen name="Cart" component={CartScreen} />
      <Tabs.Screen name="Orders" component={OrdersScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export function AppNavigator() {
  const { user, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: "700" }
      }}
    >
      <RootStack.Screen
        name="MainTabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="ProductDetails"
        component={ProductDetailsScreen}
        options={{ title: "Product Details" }}
      />
      <RootStack.Screen name="Addresses" component={AddressesScreen} options={{ title: "Saved Addresses" }} />
      <RootStack.Screen name="Wishlist" component={WishlistScreen} options={{ title: "Wishlist" }} />
    </RootStack.Navigator>
  );
}
