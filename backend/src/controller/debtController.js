const { success, created, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const debtModel = require('../models/debtModel');
const logger = require('../utils/logger');

/**
 * Debt & Payables Management Controller
 */

async function getAllDebts(req, res, next) {
  try {
    const { page = 1, limit = 20, status, overdue } = req.validatedQuery;

    const { debts, total } = await debtModel.findAllDebts({
      page,
      limit,
      status,
      overdue,
    });

    const summary = await debtModel.getDebtSummary();

    return paginated(res, {
      data: debts.map(debt => ({
        id: debt.id,
        description: debt.description,
        originalAmount: debt.originalAmount,
        paidAmount: debt.paidAmount,
        remainingAmount: debt.remainingAmount,
        status: debt.status,
        dueDate: debt.dueDate,
        createdAt: debt.createdAt,
      })),
      page,
      limit,
      total,
      message: 'Debts retrieved successfully',
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
        summary: {
          totalPending: parseFloat(summary.total_pending) || 0,
          totalCleared: parseFloat(summary.total_cleared) || 0,
          overdueCount: parseInt(summary.overdue_count, 10) || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getDebtById(req, res, next) {
  try {
    const { id } = req.params;

    const debt = await debtModel.findDebtById(id);
    if (!debt) {
      throw new NotFoundError('Debt not found', 'Debt');
    }

    return success(res, {
      data: {
        id: debt.id,
        description: debt.description,
        originalAmount: debt.originalAmount,
        paidAmount: debt.paidAmount,
        remainingAmount: debt.remainingAmount,
        status: debt.status,
        dueDate: debt.dueDate,
        notes: debt.notes,
        createdAt: debt.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createDebt(req, res, next) {
  try {
    const { description, amount, dueDate, notes } = req.validatedBody;

    const debt = await debtModel.createDebt({
      description,
      amount,
      dueDate,
      notes,
    });

    logger.info(`Debt created: ${debt.id}`);

    return created(res, {
      data: {
        id: debt.id,
        description: debt.description,
        originalAmount: debt.originalAmount,
        remainingAmount: debt.remainingAmount,
        status: debt.status,
        dueDate: debt.dueDate,
        createdAt: debt.createdAt,
      },
      message: 'Debt record created successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function recordPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = req.validatedBody;
    const recordedBy = req.user.uid;

    const debt = await debtModel.findDebtById(id);
    if (!debt) {
      throw new NotFoundError('Debt not found', 'Debt');
    }

    const payment = await debtModel.recordPayment(
      id,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      recordedBy
    );

    logger.info(`Payment recorded for debt: ${id}, amount=${amount}`);

    return success(res, {
      data: {
        payment: {
          id: payment.id,
          debtId: payment.debtId,
          amount: payment.amount,
          previousBalance: payment.previousBalance,
          newBalance: payment.newBalance,
          paymentDate: payment.paymentDate,
          recordedBy: payment.recordedBy,
        },
      },
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDebts,
  getDebtById,
  createDebt,
  recordPayment,
};
