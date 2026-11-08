const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorizeMiddleware');
const personalFinanceController = require('../controllers/personalFinanceController');

const router = express.Router();

router.use(authMiddleware.protect);
router.get('/summary', authorize('personal:view'), personalFinanceController.summary);
router.get(
    '/transactions',
    authorize('personal:view'),
    personalFinanceController.listTransactions
);
router.post(
    '/transactions',
    authorize('personal:create'),
    personalFinanceController.createTransaction
);
router.patch(
    '/transactions/:transactionId',
    authorize('personal:update'),
    personalFinanceController.updateTransaction
);
router.delete(
    '/transactions/:transactionId',
    authorize('personal:delete'),
    personalFinanceController.deleteTransaction
);

module.exports = router;
