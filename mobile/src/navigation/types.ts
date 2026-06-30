export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Products: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetails: { productId: string };
  Addresses: undefined;
  Wishlist: undefined;
};
