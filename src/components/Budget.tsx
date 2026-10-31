/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { CreditCard, Plus, Edit2, Trash2, X, PiggyBank, Receipt, Landmark, DollarSign, Download } from 'lucide-react';

export default function Budget() {
  const { expenses, totalBudget, addExpense, updateExpense, deleteExpense, setTotalBudget } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isConfigBudgetOpen, setIsConfigBudgetOpen] = useState(false);

  // Delete confirm state to bypass iframe native prompt barriers
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Budget Config Form State
  const [newBudgetVal, setNewBudgetVal] = useState(String(totalBudget));

  // Expense Form State
  const [category, setCategory] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [expenseStatus, setExpenseStatus] = useState<'Paid' | 'Partial' | 'Unpaid'>('Unpaid');

  const openExpenseModal = (exp: Expense | null = null) => {
    if (exp) {
      setEditingExpense(exp);
      setCategory(exp.category);
      setVendorName(exp.vendorName);
      setEstimatedCost(String(exp.estimatedCost));
      setPaidAmount(String(exp.paidAmount));
      setExpenseStatus(exp.status);
    } else {
      setEditingExpense(null);
      setCategory('');
      setVendorName('');
      setEstimatedCost('');
      setPaidAmount('0');
      setExpenseStatus('Unpaid');
    }
    setIsModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !estimatedCost) return;

    const estCostNum = Number(estimatedCost);
    const paidAmtNum = Number(paidAmount) || 0;
    const pendAmtNum = Math.max(estCostNum - paidAmtNum, 0);

    // Auto-calculate status based on payments
    let finalStatus: 'Paid' | 'Partial' | 'Unpaid' = expenseStatus;
    if (paidAmtNum >= estCostNum) {
      finalStatus = 'Paid';
    } else if (paidAmtNum > 0) {
      finalStatus = 'Partial';
    } else {
      finalStatus = 'Unpaid';
    }

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        category: category.trim(),
        vendorName: vendorName.trim() || 'Generic Vendor',
        estimatedCost: estCostNum,
        paidAmount: paidAmtNum,
        pendingAmount: pendAmtNum,
        status: finalStatus
      });
    } else {
      addExpense({
        category: category.trim(),
        vendorName: vendorName.trim() || 'Generic Vendor',
        estimatedCost: estCostNum,
        paidAmount: paidAmtNum,
        pendingAmount: pendAmtNum,
        status: finalStatus
      });
    }
    closeExpenseModal();
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBudgetVal && !isNaN(Number(newBudgetVal))) {
      setTotalBudget(Number(newBudgetVal));
      setIsConfigBudgetOpen(false);
    }
  };

  // Calculations
  const grandEstimated = expenses.reduce((sum, e) => sum + e.estimatedCost, 0);
  const grandPaid = expenses.reduce((sum, e) => sum + e.paidAmount, 0);
  const grandPending = expenses.reduce((sum, e) => sum + e.pendingAmount, 0);
  const remainingBudgetPlan = Math.max(totalBudget - grandPaid, 0);

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  const handleExportBudgetReport = () => {
    let csv = "Category,Vendor/Contractor Partner,Estimated Cost,Paid Amount,Pending Amount,Status\n";
    expenses.forEach(e => {
      csv += `"${e.category.replace(/"/g, '""')}","${e.vendorName.replace(/"/g, '""')}",${e.estimatedCost},${e.paidAmount},${e.pendingAmount},"${e.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_expense_budget_accounting_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="budget-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header with interactive actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800">Wedding Budget &amp; Vendors</h2>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            Oversee payments, plan estimates and record contracts for venues, caterers, florals, and photographers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-edit-budget"
            onClick={() => {
              setNewBudgetVal(String(totalBudget));
              setIsConfigBudgetOpen(true);
            }}
            className="px-4 py-2 bg-stone-150 border border-stone-200 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Adjust Total Budget
          </button>
          <button
            id="btn-add-expense"
            onClick={() => openExpenseModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-emerald-800/10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Contract/Bill</span>
          </button>
        </div>
      </div>

      {/* Financial Summary cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Budget limit */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a1a09d]">Consolidated Budget Cap</span>
            <div className="text-2xl font-bold text-stone-800 font-sans">{currencyFormatter.format(totalBudget)}</div>
            <p className="text-[11px] text-stone-400">Fixed target allowance limit</p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
            <PiggyBank className="h-5 w-5" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Total Spent (Paid)</span>
            <div className="text-2xl font-bold text-emerald-800 font-sans">{currencyFormatter.format(grandPaid)}</div>
            <p className="text-[11px] text-emerald-600 font-medium">Estimated commitment: {currencyFormatter.format(grandEstimated)}</p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        {/* Remaining budget safe block */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-450">Remaining Wallet Cash</span>
            <div className={`text-2xl font-bold font-sans ${totalBudget - grandPaid < 0 ? 'text-rose-600' : 'text-indigo-800'}`}>
              {currencyFormatter.format(totalBudget - grandPaid)}
            </div>
            <p className="text-[11px] text-[#8c8273] font-medium">Pending vendor dues: {currencyFormatter.format(grandPending)}</p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Expenses Breakdown Data Grid */}
      <div className="bg-white rounded-2xl border border-[#ecebe7] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf9f6]/90 border-b border-stone-100 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-4 px-6">Expense Category</th>
                <th className="py-4 px-6">Assigned Vendor</th>
                <th className="py-4 px-6 text-right">Estimated Cost</th>
                <th className="py-4 px-6 text-right">Paid Amount</th>
                <th className="py-4 px-6 text-right">Pending Amount</th>
                <th className="py-4 px-6 text-center">Payment Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Welcome to Tectell Wedding Management. No active bill records logged yet. Click "Record Contract/Bill" to start.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => {
                  let statusBadge = 'bg-stone-50 text-stone-500 border-stone-200';
                  if (exp.status === 'Paid') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  if (exp.status === 'Partial') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (exp.status === 'Unpaid') statusBadge = 'bg-rose-50 text-rose-800 border border-rose-100';

                  return (
                    <tr key={exp.id} className="hover:bg-[#faf9f6]/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-stone-850 text-xs">{exp.category}</td>
                      <td className="py-4 px-6 font-medium text-stone-550">{exp.vendorName}</td>
                      <td className="py-4 px-6 text-right font-mono font-semibold">{currencyFormatter.format(exp.estimatedCost)}</td>
                      <td className="py-4 px-6 text-right font-mono text-emerald-700 font-semibold">{currencyFormatter.format(exp.paidAmount)}</td>
                      <td className="py-4 px-6 text-right font-mono text-rose-700 font-semibold">{currencyFormatter.format(exp.pendingAmount)}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold border ${statusBadge}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 text-stone-500">
                          <button
                            onClick={() => openExpenseModal(exp)}
                            className="p-1.5 hover:bg-stone-50 hover:text-stone-800 rounded-lg border border-transparent hover:border-stone-100 transition-colors"
                            title="Edit Contract details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {confirmDeleteId === exp.id ? (
                            <div className="flex items-center gap-1 font-sans">
                              <button
                                onClick={() => {
                                  deleteExpense(exp.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 bg-[#c53030] text-white text-[9px] font-bold rounded hover:bg-rose-700"
                                title="Confirm Delete"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-semibold rounded hover:bg-stone-200"
                                title="Cancel"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(exp.id)}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-colors text-rose-500"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Budget limit popup */}
      {isConfigBudgetOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-stone-100 p-6 relative">
            <button
              onClick={() => setIsConfigBudgetOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-450 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleBudgetSubmit} className="space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">Adjust Wedding Budget Cap</h3>
                <p className="text-xs text-stone-400 mt-0.5">Control the top-limit financial allowances (INR).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Budget Cap Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                  value={newBudgetVal}
                  onChange={(e) => setNewBudgetVal(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigBudgetOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Save Budget Cap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Add / Edit Popup modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden relative">
            <button
              onClick={closeExpenseModal}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleExpenseSubmit} className="space-y-5 p-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingExpense ? 'Edit Vendor contract' : 'Record Vendor Contract / Bill'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Set category labels, enter total estimate, and track paid portions.</p>
              </div>

              <div className="space-y-4">
                {/* Category name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Expense Category / Service</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Wedding Photography &amp; Cinematic Films"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                {/* Vendor Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Contractor / Vendor Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. The Royal Canvas Films"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                </div>

                {/* Estimated Cost */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                  />
                </div>

                {/* Paid amount */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Amount Paid Till Date (₹)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Submit panel actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeExpenseModal}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {editingExpense ? 'Save Changes' : 'Record Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
