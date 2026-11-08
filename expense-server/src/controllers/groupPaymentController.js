const crypto = require('node:crypto');
const GroupPayment = require('../model/groupPayment');
const GroupSettlement = require('../model/groupSettlement');
const {
    getGroupBalances,
    getSettlementLimit,
} = require('../services/groupBalances');
const { getRazorpayCredentials } = require('../services/razorpayConfig');
const {
    isPrivileged,
    loadAccessibleGroup,
    normalizeEmail,
} = require('../services/groupAccess');
const { toPaise } = require('../services/splitCalculator');

const paymentConfigurationMessage =
    'Razorpay test credentials are not configured. Set a test Key ID (rzp_test_...) and Key Secret on the server.';

const requestRazorpay = async (path, method, body) => {
    const configuredCredentials = getRazorpayCredentials();
    if (!configuredCredentials) {
        const error = new Error(paymentConfigurationMessage);
        error.statusCode = 503;
        throw error;
    }
    const { keyId, keySecret } = configuredCredentials;
    const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Basic ${authorization}`,
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(
            data.error?.description || 'Razorpay could not process the request'
        );
        error.statusCode = response.status;
        throw error;
    }
    return data;
};

const loadGroupOrRespond = async (request, response) => {
    const access = await loadAccessibleGroup(
        request.params.groupId,
        request.user
    );
    if (!access.group) {
        response.status(access.status).json({ message: access.message });
        return null;
    }
    if (
        (!access.isMember && !isPrivileged(request.user)) ||
        access.memberRole === 'viewer'
    ) {
        response.status(403).json({
            message: 'Only active group members can settle balances',
        });
        return null;
    }
    return access;
};

const getPaymentCapacity = async (group, fromEmail, toEmail) => {
    const members = group.membersEmail.map(normalizeEmail);
    if (!members.includes(toEmail) || toEmail === fromEmail) return 0;
    const balances = await getGroupBalances(group._id, members);
    return getSettlementLimit(balances, fromEmail, toEmail);
};

const groupPaymentController = {
    createOrder: async (request, response) => {
        try {
            const configuredCredentials = getRazorpayCredentials();
            if (!configuredCredentials) {
                return response.status(503).json({
                    message: paymentConfigurationMessage,
                });
            }
            const { keyId } = configuredCredentials;

            const access = await loadGroupOrRespond(request, response);
            if (!access) return;

            const fromEmail = normalizeEmail(request.user.email);
            const toEmail = normalizeEmail(request.body.toEmail);
            const amountPaise = toPaise(request.body.amount);
            const capacity = await getPaymentCapacity(
                access.group,
                fromEmail,
                toEmail
            );
            if (amountPaise < 100 || amountPaise > capacity) {
                return response.status(400).json({
                    message:
                        'Enter at least ₹1 and no more than the amount currently owed to this member.',
                });
            }

            const receipt = `settle_${Date.now()}_${crypto
                .randomBytes(6)
                .toString('hex')}`;
            const order = await requestRazorpay('/orders', 'POST', {
                amount: amountPaise,
                currency: 'INR',
                receipt,
                notes: {
                    groupId: String(access.group._id),
                    fromEmail,
                    toEmail,
                },
            });
            await GroupPayment.create({
                groupId: access.group._id,
                payerId: request.user.id,
                fromEmail,
                toEmail,
                amount: amountPaise / 100,
                orderId: order.id,
            });

            return response.status(201).json({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId,
                groupName: access.group.name,
                payerName: request.user.name,
                payerEmail: request.user.email,
            });
        } catch (error) {
            if (error.statusCode) {
                return response.status(502).json({
                    message: error.message,
                });
            }
            if (error instanceof Error && !error.name.startsWith('Mongo')) {
                return response.status(400).json({ message: error.message });
            }
            console.error('Unable to create group payment order:', error);
            return response.status(500).json({
                message: 'Unable to start this payment',
            });
        }
    },

    verifyPayment: async (request, response) => {
        let payment;
        let settlement;
        try {
            const configuredCredentials = getRazorpayCredentials();
            if (!configuredCredentials) {
                return response.status(503).json({
                    message: paymentConfigurationMessage,
                });
            }
            const { keySecret } = configuredCredentials;

            const access = await loadGroupOrRespond(request, response);
            if (!access) return;

            const {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
            } = request.body;
            if (
                typeof orderId !== 'string' ||
                typeof paymentId !== 'string' ||
                typeof signature !== 'string' ||
                !/^[a-f0-9]{64}$/i.test(signature)
            ) {
                return response.status(400).json({
                    message: 'Payment verification details are invalid.',
                });
            }

            payment = await GroupPayment.findOne({
                orderId,
                groupId: access.group._id,
                payerId: request.user.id,
            });
            if (!payment) {
                return response.status(404).json({
                    message: 'Payment order not found.',
                });
            }
            if (payment.status === 'paid' && payment.paymentId === paymentId) {
                return response.json({
                    message: 'Settlement payment verified',
                    settlementId: payment.settlementId,
                });
            }
            if (payment.status !== 'pending') {
                return response.status(409).json({
                    message:
                        payment.status === 'needs_review'
                            ? 'Payment was received, but the group balance changed. Please contact the group admin.'
                            : 'This payment is already being verified or cannot be reused.',
                });
            }

            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${orderId}|${paymentId}`)
                .digest();
            const suppliedSignature = Buffer.from(signature, 'hex');
            if (
                suppliedSignature.length !== expectedSignature.length ||
                !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
            ) {
                return response.status(400).json({
                    message: 'Payment signature could not be verified.',
                });
            }

            const lockedPayment = await GroupPayment.findOneAndUpdate(
                { _id: payment._id, status: 'pending' },
                { $set: { status: 'processing', paymentId } },
                { new: true }
            );
            if (!lockedPayment) {
                return response.status(409).json({
                    message: 'This payment is already being verified.',
                });
            }
            payment = lockedPayment;

            const razorpayPayment = await requestRazorpay(
                `/payments/${encodeURIComponent(paymentId)}`,
                'GET'
            );
            if (
                razorpayPayment.order_id !== orderId ||
                razorpayPayment.amount !== Math.round(payment.amount * 100) ||
                razorpayPayment.currency !== 'INR' ||
                razorpayPayment.status !== 'captured'
            ) {
                await GroupPayment.updateOne(
                    { _id: payment._id, status: 'processing' },
                    { $set: { status: 'pending', paymentId: null } }
                );
                return response.status(400).json({
                    message: 'Razorpay has not confirmed this payment as captured.',
                });
            }

            const capacity = await getPaymentCapacity(
                access.group,
                payment.fromEmail,
                payment.toEmail
            );
            const amountPaise = toPaise(payment.amount);
            if (amountPaise > capacity) {
                await GroupPayment.updateOne(
                    { _id: payment._id, status: 'processing' },
                    {
                        $set: {
                            status: 'needs_review',
                            lastError:
                                'Payment captured after the settlement balance changed',
                        },
                    }
                );
                return response.status(409).json({
                    message:
                        'Payment was received, but the group balance changed before settlement. Please contact the group admin.',
                });
            }

            settlement = await GroupSettlement.create({
                groupId: payment.groupId,
                fromEmail: payment.fromEmail,
                toEmail: payment.toEmail,
                amount: payment.amount,
                currency: 'INR',
                note: typeof request.body.note === 'string'
                    ? request.body.note.trim().slice(0, 250)
                    : '',
                paymentId,
                createdBy: request.user.id,
            });
            await GroupPayment.updateOne(
                { _id: payment._id, status: 'processing' },
                { $set: { status: 'paid', settlementId: settlement._id } }
            );

            return response.json({
                message: 'Settlement payment verified',
                settlementId: settlement._id,
            });
        } catch (error) {
            if (payment?._id && payment.status === 'processing') {
                const recordedSettlement = await GroupSettlement.findOne({
                    paymentId: payment.paymentId,
                }).select('_id').lean();
                if (recordedSettlement) {
                    await GroupPayment.updateOne(
                        { _id: payment._id, status: 'processing' },
                        {
                            $set: {
                                status: 'paid',
                                settlementId: recordedSettlement._id,
                            },
                        }
                    );
                    return response.json({
                        message: 'Settlement payment verified',
                        settlementId: recordedSettlement._id,
                    });
                }
                await GroupPayment.updateOne(
                    { _id: payment._id, status: 'processing' },
                    { $set: { status: 'pending', paymentId: null } }
                );
            }
            if (error.statusCode) {
                return response.status(502).json({
                    message: error.message,
                });
            }
            console.error('Unable to verify group payment:', error);
            return response.status(500).json({
                message: 'Unable to verify this payment',
            });
        }
    },
};

module.exports = groupPaymentController;
