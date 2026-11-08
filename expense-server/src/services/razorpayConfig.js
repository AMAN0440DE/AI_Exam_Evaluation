const getRazorpayCredentials = (environment = process.env) => {
    const keyId = environment.RAZORPAY_KEY_ID;
    const keySecret = environment.RAZORPAY_KEY_SECRET;

    if (!keyId?.startsWith('rzp_test_') || !keySecret) return null;
    return { keyId, keySecret };
};

module.exports = { getRazorpayCredentials };
