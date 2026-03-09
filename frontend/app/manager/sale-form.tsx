import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ChevronLeft, Calendar, User, MapPin, Phone, DollarSign, Tag, Truck } from "lucide-react-native";
import { api } from "../../utils/api";

const SaleFormScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{
        vehicleId?: string;
        vehicleReg?: string;
        vehicleModel?: string;
    }>();

    const [formData, setFormData] = useState({
        buyerName: "",
        buyerAddress: "",
        buyerContact: "",
        saleDate: new Date(),
        salePrice: "",
    });

    const [loading, setLoading] = useState(false);


    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const validateForm = () => {
        if (!formData.buyerName.trim()) {
            Alert.alert("Error", "Please enter buyer name");
            return false;
        }
        if (!formData.buyerAddress.trim()) {
            Alert.alert("Error", "Please enter buyer address");
            return false;
        }
        if (!formData.buyerContact.trim()) {
            Alert.alert("Error", "Please enter buyer contact number");
            return false;
        }
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(formData.buyerContact)) {
            Alert.alert("Invalid Phone", "Number must be 10 digits and start with 6, 7, 8, or 9.");
            return false;
        }
        if (!formData.salePrice.trim()) {
            Alert.alert("Error", "Please enter sale price");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (!params.vehicleId) {
            Alert.alert("Error", "Missing Vehicle ID");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                buyerName: formData.buyerName,
                buyerAddress: formData.buyerAddress,
                buyerContact: formData.buyerContact,
                saleDate: formData.saleDate.toISOString(),
                salePrice: formData.salePrice,
            };

            const res = await api.sellVehicle(params.vehicleId, payload);

            if (res.ok) {
                Alert.alert(
                    "Success",
                    "Vehicle marked as sold and decommissioned successfully.",
                    [{ text: "OK", onPress: () => router.push("/admin/vehicle-list" as any) }]
                );
            } else {
                Alert.alert("Error", res.error || "Failed to process sale");
            }
        } catch (error) {
            Alert.alert("Error", "Something went wrong. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Vehicle Sale Form</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Vehicle Info Summary */}
                    <View style={styles.vehicleInfoCard}>
                        <View style={styles.infoRow}>
                            <Truck size={20} color="#64748B" />
                            <Text style={styles.infoLabel}>Vehicle:</Text>
                            <Text style={styles.infoValue}>{params.vehicleReg}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Tag size={20} color="#64748B" />
                            <Text style={styles.infoLabel}>Model:</Text>
                            <Text style={styles.infoValue}>{params.vehicleModel}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Buyer Information</Text>

                    {/* Buyer Name */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelContainer}>
                            <User size={16} color="#475569" />
                            <Text style={styles.label}>Buyer Name *</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter full name"
                            placeholderTextColor="#94A3B8"
                            value={formData.buyerName}
                            onChangeText={(text) => setFormData({ ...formData, buyerName: text })}
                        />
                    </View>

                    {/* Buyer Address */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelContainer}>
                            <MapPin size={16} color="#475569" />
                            <Text style={styles.label}>Buyer Address *</Text>
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter complete address"
                            placeholderTextColor="#94A3B8"
                            value={formData.buyerAddress}
                            onChangeText={(text) => setFormData({ ...formData, buyerAddress: text })}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Buyer Contact */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelContainer}>
                            <Phone size={16} color="#475569" />
                            <Text style={styles.label}>Buyer Contact Number *</Text>
                        </View>
                        <View style={styles.phoneInputWrapper}>
                            <Text style={styles.phonePrefix}>+91</Text>
                            <View style={styles.phoneDivider} />
                            <TextInput
                                style={styles.phoneInput}
                                placeholder="98765 43210"
                                placeholderTextColor="#94A3B8"
                                value={formData.buyerContact}
                                onChangeText={(text) => {
                                    if (/^\d*$/.test(text)) setFormData({ ...formData, buyerContact: text });
                                }}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Sale Details</Text>

                    {/* Sale Date */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelContainer}>
                            <Calendar size={16} color="#475569" />
                            <Text style={styles.label}>Sale Date *</Text>
                        </View>
                        <View style={styles.dateInput}>
                            <Text style={styles.dateInputText}>{formatDate(formData.saleDate)}</Text>
                            <Calendar size={20} color="#94A3B8" />
                        </View>
                    </View>

                    {/* Sale Price */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelContainer}>
                            <DollarSign size={16} color="#475569" />
                            <Text style={styles.label}>Sale Price (₹) *</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 5,00,000"
                            placeholderTextColor="#94A3B8"
                            value={formData.salePrice}
                            onChangeText={(text) => setFormData({ ...formData, salePrice: text.replace(/[^0-9]/g, "") })}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Confirm & Mark as Sold</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    backBtn: { padding: 4 },
    content: { padding: 20, paddingBottom: 40 },

    vehicleInfoCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#DBEAFE",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "600",
        width: 60,
    },
    infoValue: {
        fontSize: 16,
        color: "#1E3A8A",
        fontWeight: "700",
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 16,
        marginTop: 8,
    },

    formGroup: { marginBottom: 20 },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },

    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: "#1E293B",
    },
    textArea: {
        minHeight: 80,
        paddingTop: 12,
    },

    dateInput: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dateInputText: {
        fontSize: 15,
        color: "#1E293B",
    },

    submitButton: {
        backgroundColor: "#EF4444",
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    phoneInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 16,
    },
    phonePrefix: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginRight: 8 },
    phoneDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0", marginRight: 10 },
    phoneInput: { flex: 1, fontSize: 15, color: "#1E293B", height: "100%" },
});

export default SaleFormScreen;
