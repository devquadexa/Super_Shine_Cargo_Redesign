/**
 * Pure utility functions for petty cash operations.
 * These functions are extracted from JobPettyCash component logic
 * to enable direct unit and property-based testing.
 */

// ─── Role constants ───────────────────────────────────────────────────────────

const ADMIN_ROLES = ['Admin', 'Super Admin', 'Manager'];
const CLERK_ROLE = 'Waff Clerk';

/**
 * Statuses that allow settlement items to be edited or deleted by admins
 * (provided no invoice has been generated).
 */
const EDITABLE_STATUSES = [
  'Settled',
  'Balance To Be Return',
  'Over Due',
  'Settled/Rejected',
  'Balance Returned',
  'Overdue Collected',
];

// ─── Sorting ──────────────────────────────────────────────────────────────────

/**
 * Returns a new array of assignments sorted by `assignedDate` descending
 * (most recent first). Does not mutate the input array.
 *
 * @param {Array<{ assignedDate: string|Date }>} assignments
 * @returns {Array}
 */
export function sortAssignmentsDesc(assignments) {
  return [...assignments].sort(
    (a, b) => new Date(b.assignedDate) - new Date(a.assignedDate)
  );
}

// ─── Summary aggregation ─────────────────────────────────────────────────────

/**
 * Computes aggregated financial totals across all assignments.
 *
 * @param {Array<{ assignedAmount: number, settledAmount: number }>} assignments
 * @returns {{ totalAssigned: number, totalSettled: number, balance: number }}
 */
export function computeSummary(assignments) {
  const totalAssigned = assignments.reduce(
    (sum, a) => sum + (parseFloat(a.assignedAmount) || 0),
    0
  );
  const totalSettled = assignments.reduce(
    (sum, a) => sum + (parseFloat(a.actualSpent) || parseFloat(a.settledAmount) || 0),
    0
  );
  return {
    totalAssigned,
    totalSettled,
    balance: totalAssigned - totalSettled,
  };
}

// ─── Balance colour class ─────────────────────────────────────────────────────

/**
 * Returns the Tailwind CSS text-colour class for a given balance value.
 *  - balance > 0  → 'text-green-600'
 *  - balance < 0  → 'text-red-600'
 *  - balance === 0 → ''
 *
 * @param {number} balance
 * @returns {string}
 */
export function getBalanceColorClass(balance) {
  if (balance > 0) return 'text-green-600';
  if (balance < 0) return 'text-red-600';
  return '';
}

// ─── Form validation ──────────────────────────────────────────────────────────

/**
 * Validates the "Assign Petty Cash" form data.
 *
 * Rules:
 *  - `assignedTo` must not be empty / null / undefined
 *  - `assignedAmount` must be a number greater than 0
 *  - `assignedAmount` must have at most 2 decimal places
 *
 * @param {{ assignedTo: any, assignedAmount: any }} formData
 * @returns {string|null} Validation error message, or null if valid
 */
export function validateAssignForm(formData) {
  const { assignedTo, assignedAmount } = formData;

  if (assignedTo === null || assignedTo === undefined || assignedTo === '') {
    return 'Please select a user to assign petty cash to.';
  }

  const amount = Number(assignedAmount);

  if (!assignedAmount && assignedAmount !== 0) {
    return 'Amount is required.';
  }

  if (isNaN(amount) || amount <= 0) {
    return 'Amount must be a positive number greater than zero.';
  }

  // Check for more than 2 decimal places by converting to string and inspecting
  const amountStr = String(assignedAmount);
  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1 && amountStr.length - dotIndex - 1 > 2) {
    return 'Amount must have at most 2 decimal places.';
  }

  return null;
}

/**
 * Validates a single settlement item before submission.
 *
 * Rules:
 *  - `itemName` must not be empty / whitespace-only
 *  - `actualCost` must be a number greater than 0
 *
 * @param {{ itemName: string, actualCost: any }} item
 * @returns {string|null} Validation error message, or null if valid
 */
export function validateSettlementItem(item) {
  const { itemName, actualCost } = item;

  if (!itemName || String(itemName).trim().length === 0) {
    return 'Item name must not be empty.';
  }

  const cost = Number(actualCost);

  if (isNaN(cost) || cost <= 0) {
    return 'Actual cost must be greater than zero.';
  }

  return null;
}

// ─── Role checks ──────────────────────────────────────────────────────────────

/**
 * Returns true if the user has an admin-level role
 * (Admin, Super Admin, or Manager).
 *
 * @param {{ role?: string }|null|undefined} user
 * @returns {boolean}
 */
export function isAdminRole(user) {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Returns true if the user has the Waff Clerk role.
 *
 * @param {{ role?: string }|null|undefined} user
 * @returns {boolean}
 */
export function isClerkRole(user) {
  if (!user) return false;
  return user.role === CLERK_ROLE;
}

// ─── Permission guards ────────────────────────────────────────────────────────

/**
 * Determines whether the current user can inline-edit settlement items
 * for a given assignment.
 *
 * Conditions (all must be true):
 *  1. User is a Manager OR (is a Waff Clerk AND assigned to this assignment)
 *  2. Assignment status is one of the editable statuses
 *  3. No invoice has been generated for the job (`invoiceGenerated === false`)
 *
 * @param {{ role?: string, userId?: number }|null|undefined} user
 * @param {{ status?: string, assignedTo?: number }} assignment
 * @param {boolean} invoiceGenerated
 * @returns {boolean}
 */
export function canEditSettlement(user, assignment, invoiceGenerated) {
  if (!user) return false;
  
  const isManager = user.role === 'Manager';
  const isClerkOwnAssignment = isClerkRole(user) && user.userId === assignment?.assignedTo;
  
  if (!isManager && !isClerkOwnAssignment) return false;
  if (!assignment || !EDITABLE_STATUSES.includes(assignment.status)) return false;
  if (invoiceGenerated) return false;
  return true;
}

/**
 * Determines whether the current user can delete a settlement item
 * from a given assignment.
 *
 * Conditions (all must be true):
 *  1. All conditions for `canEditSettlement` are met
 *  2. The assignment has more than one settlement item (`itemCount > 1`)
 *
 * @param {{ role?: string }|null|undefined} user
 * @param {{ status?: string }} assignment
 * @param {boolean} invoiceGenerated
 * @param {number} itemCount  Total number of settlement items on the assignment
 * @returns {boolean}
 */
export function canDeleteSettlementItem(user, assignment, invoiceGenerated, itemCount) {
  if (!canEditSettlement(user, assignment, invoiceGenerated)) return false;
  return itemCount > 1;
}
