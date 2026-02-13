/**
 * Mock SMS Service for Vehicle Tracking System
 */
const smsService = {
    /**
     * Send an SMS to a recipient
     * @param {string} phone - Recipient's phone number
     * @param {string} message - Message body
     */
    sendSMS: async (phone, message) => {
        console.log(`[MOCK SMS] To: ${phone} | Message: ${message}`);
        // Simulate network delay
        return new Promise((resolve) => setTimeout(resolve, 500));
    },

    /**
     * Send tracking link to recipient
     * @param {string} phone - Recipient's phone number
     * @param {string} trackingId - Parcel tracking ID
     */
    sendTrackingSMS: async (phone, trackingId) => {
        // Updated to use the frontend tracking page
        const frontendUrl = process.env.FRONTEND_URL || "https://userapp-seven.vercel.app";
        const trackingLink = `${frontendUrl}/?trackingId=${trackingId}`;
        const message = `Your parcel with ID ${trackingId} is now in transit! You can track its live location here: ${trackingLink}`;
        return smsService.sendSMS(phone, message);
    }
};

module.exports = smsService;










