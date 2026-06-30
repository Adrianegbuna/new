import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { addressApi } from "@/api/services";
import { AppText } from "@/components/AppText";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Addresses">;

export function AddressesScreen(_: Props) {
  const queryClient = useQueryClient();
  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: addressApi.list
  });

  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const refreshAddresses = async () => {
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
  };

  const createMutation = useMutation({
    mutationFn: addressApi.create,
    onSuccess: async () => {
      setLabel("");
      setRecipientName("");
      setPhone("");
      setStreet("");
      setCity("");
      setState("");
      await refreshAddresses();
      Alert.alert("Saved", "Address added successfully.");
    },
    onError: (error: any) => {
      Alert.alert("Address", error?.response?.data?.message || "Unable to save address.");
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: addressApi.setDefault,
    onSuccess: refreshAddresses
  });

  const deleteMutation = useMutation({
    mutationFn: addressApi.remove,
    onSuccess: refreshAddresses
  });

  return (
    <Screen>
      <View style={styles.card}>
        <AppText style={styles.sectionTitle}>Add shipping address</AppText>
        <InputField label="Label" value={label} onChangeText={setLabel} placeholder="Home" />
        <InputField label="Recipient name" value={recipientName} onChangeText={setRecipientName} placeholder="Jane Doe" />
        <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="+234..." keyboardType="phone-pad" />
        <InputField label="Street" value={street} onChangeText={setStreet} placeholder="House number and street" />
        <InputField label="City" value={city} onChangeText={setCity} placeholder="Lagos" />
        <InputField label="State" value={state} onChangeText={setState} placeholder="Lagos State" />
        <PrimaryButton
          label={createMutation.isPending ? "Saving..." : "Save Address"}
          onPress={() => {
            if (!recipientName || !phone || !street || !city) {
              Alert.alert("Missing fields", "Recipient name, phone, street, and city are required.");
              return;
            }
            createMutation.mutate({
              label,
              recipientName,
              phone,
              street,
              city,
              state,
              country: "Nigeria",
              isDefault: (addressesQuery.data?.length || 0) === 0
            });
          }}
          disabled={createMutation.isPending}
        />
      </View>

      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <AppText style={styles.addressTitle}>{item.label || item.recipientName}</AppText>
            <AppText style={styles.meta}>{item.recipientName}</AppText>
            <AppText style={styles.meta}>{item.street}, {item.city}</AppText>
            <AppText style={styles.meta}>{item.phone}</AppText>
            <AppText style={styles.meta}>{item.isDefault ? "Default address" : "Secondary address"}</AppText>
            <View style={styles.row}>
              <PrimaryButton
                label={setDefaultMutation.isPending ? "Updating..." : "Set Default"}
                onPress={() => setDefaultMutation.mutate(item.id)}
                disabled={setDefaultMutation.isPending || item.isDefault}
              />
              <PrimaryButton
                label={deleteMutation.isPending ? "Removing..." : "Delete"}
                onPress={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.card}>
            <AppText style={styles.meta}>
              {addressesQuery.isLoading ? "Loading addresses..." : "No saved addresses yet."}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10
  },
  sectionTitle: {
    fontWeight: "800",
    fontSize: 18
  },
  addressTitle: {
    fontWeight: "800",
    fontSize: 16
  },
  meta: {
    color: colors.textSoft
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  }
});
