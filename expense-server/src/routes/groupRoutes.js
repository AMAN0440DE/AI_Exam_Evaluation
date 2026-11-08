const express = require('express');
const groupController = require('../controllers/groupController');
const expenseController = require('../controllers/expenseController');
const groupPaymentController = require('../controllers/groupPaymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorizeMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.post('/create', authorize('group:create'), groupController.create);
router.put('/update', groupController.update);
router.delete('/:groupId', authorize('group:delete'), groupController.delete);
router.patch('/members/add', groupController.addMembers);
router.patch('/members/remove', groupController.removeMembers);
router.patch('/members/role', groupController.updateMemberRole);
router.get('/my-groups', authorize('group:view'), groupController.getGroupsByUser);
router.get('/:groupId/audit', authorize('group:view'), groupController.getAudit);
router.get('/:groupId', authorize('group:view'), expenseController.getGroup);
router.get('/:groupId/expenses', authorize('group:view'), expenseController.getExpenses);
router.post('/:groupId/expenses', expenseController.createExpense);
router.get('/:groupId/balances', authorize('group:view'), expenseController.getBalances);
router.get('/:groupId/settlements', authorize('group:view'), expenseController.getSettlements);
router.post('/:groupId/settlements', expenseController.createSettlement);
router.post(
    '/:groupId/settlements/payment/order',
    authorize('settlement:create'),
    groupPaymentController.createOrder
);
router.post(
    '/:groupId/settlements/payment/verify',
    authorize('settlement:create'),
    groupPaymentController.verifyPayment
);

module.exports = router;