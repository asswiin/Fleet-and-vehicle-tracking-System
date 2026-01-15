import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SafeAreaView,
	ScrollView,
	StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState, ReactNode } from "react";
import { ChevronLeft, Phone, Mail, CreditCard, Home, Calendar, User } from "lucide-react-native";
import { Driver } from "../utils/api";

const DriverDetailsScreen = () => {
	const router = useRouter();
	const params = useLocalSearchParams<{ driver?: string }>();
	const [driver, setDriver] = useState<Driver | null>(null);

	useEffect(() => {
		if (params.driver) {
			try {
				const parsed = JSON.parse(decodeURIComponent(params.driver));
				setDriver(parsed);
			} catch (err) {
				console.warn("Failed to parse driver payload", err);
			}
		}
	}, [params.driver]);

	const fullAddress = () => {
		if (!driver?.address) return "Not provided";
		const parts = [
			driver.address.house,
			driver.address.street,
			driver.address.city,
			driver.address.district,
			driver.address.state,
			driver.address.zip,
		].filter(Boolean);
		return parts.length ? parts.join(", ") : "Not provided";
	};

	const formattedDob = () => {
		if (!driver?.dob) return "Not provided";
		const date = new Date(driver.dob);
		return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString('en-GB');
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

			<View style={styles.header}>
				<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
					<ChevronLeft size={24} color="#111827" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Driver Details</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{!driver ? (
					<View style={styles.emptyBox}>
						<Text style={styles.emptyText}>No driver data found.</Text>
						<Text style={styles.emptySubtext}>Return to the list and try again.</Text>
					</View>
				) : (
					<View style={styles.card}>
						<View style={styles.avatarRow}>
							<View style={styles.avatar}>
								<Text style={styles.avatarText}>
									{driver.name ? driver.name.charAt(0).toUpperCase() : "D"}
								</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.name}>{driver.name || "Unnamed Driver"}</Text>
								<Text style={styles.meta}>Status: {driver.status || "N/A"}</Text>
							</View>
						</View>

						<View style={styles.divider} />

						<DetailRow icon={<Phone size={18} color="#6B7280" />} label="Phone" value={driver.mobile || "Not provided"} />
						<DetailRow icon={<Mail size={18} color="#6B7280" />} label="Email" value={driver.email || "Not provided"} />
					<DetailRow icon={<User size={18} color="#6B7280" />} label="Gender" value={driver.gender ? driver.gender.charAt(0).toUpperCase() + driver.gender.slice(1) : "Not provided"} />
						<DetailRow icon={<CreditCard size={18} color="#6B7280" />} label="License" value={driver.license || "Not provided"} />
					<DetailRow icon={<Calendar size={18} color="#6B7280" />} label="DOB" value={formattedDob()} />
						<DetailRow icon={<Home size={18} color="#6B7280" />} label="Address" value={fullAddress()} multiline />
						{driver.createdAt ? (
							<DetailRow
								icon={<Calendar size={18} color="#6B7280" />}
								label="Added"
								value={new Date(driver.createdAt).toLocaleDateString()}
							/>
						) : null}
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const DetailRow = ({
	icon,
	label,
	value,
	multiline = false,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	multiline?: boolean;
}) => (
	<View style={styles.detailRow}>
		<View style={styles.detailIcon}>{icon}</View>
		<View style={{ flex: 1 }}>
			<Text style={styles.detailLabel}>{label}</Text>
			<Text style={[styles.detailValue, multiline && { lineHeight: 20 }]}>{value}</Text>
		</View>
	</View>
);

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#F3F4F6",
	},
	backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
	headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
	content: { padding: 20 },
	card: {
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	avatarRow: { flexDirection: "row", alignItems: "center" },
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#2563EB",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 16,
	},
	avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
	name: { fontSize: 20, fontWeight: "700", color: "#111827" },
	meta: { fontSize: 14, color: "#6B7280", marginTop: 4 },
	divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
	detailRow: { flexDirection: "row", marginBottom: 12 },
	detailIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#EEF2FF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	detailLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
	detailValue: { fontSize: 16, color: "#111827", marginTop: 4 },
	emptyBox: { alignItems: "center", marginTop: 60 },
	emptyText: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
	emptySubtext: { fontSize: 14, color: "#6B7280" },
});

export default DriverDetailsScreen;
