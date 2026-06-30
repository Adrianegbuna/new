import * as SecureStore from "expo-secure-store";

export const secureStorage = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  }
};
