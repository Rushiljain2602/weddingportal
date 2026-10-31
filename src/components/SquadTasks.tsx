/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';
import { Plus, CheckCircle, Calendar, User, ArrowRight, ArrowLeft, Trash2, Edit2, X, AlertCircle, Download } from 'lucide-react';

export default function SquadTasks() {
  const { tasks, addTask, updateTask, deleteTask, itinerary, currentWedding } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sortedItineraryDates = [...itinerary]
    .map(e => e.date)
    .filter(Boolean)
    .sort();
  const firstFunctionDate = sortedItineraryDates[0] || currentWedding?.weddingDate?.split('T')[0] || '2026-12-18';

  // Form Fields
  const [taskName, setTaskName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<'To-Do' | 'In Progress' | 'Done'>('To-Do');

  const openFormModal = (task: Task | null = null) => {
    if (task) {
      setEditingTask(task);
      setTaskName(task.name);
      setAssignedTo(task.assignedTo);
      setDeadline(task.deadline);
      setStatus(task.status);
    } else {
      setEditingTask(null);
      setTaskName('');
      setAssignedTo('');
      setDeadline(firstFunctionDate);
      setStatus('To-Do');
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    if (editingTask) {
      updateTask({
        ...editingTask,
        name: taskName.trim(),
        assignedTo: assignedTo.trim() || 'Unassigned Crew',
        deadline,
        status
      });
    } else {
      addTask({
        name: taskName.trim(),
        assignedTo: assignedTo.trim() || 'Unassigned Crew',
        deadline,
        status
      });
    }
    setIsModalOpen(false);
  };

  // Move status column easily helper
  const handleShiftStatus = (task: Task, direction: 'forward' | 'backward') => {
    let nextStatus: 'To-Do' | 'In Progress' | 'Done' = task.status;
    if (task.status === 'To-Do' && direction === 'forward') nextStatus = 'In Progress';
    else if (task.status === 'In Progress' && direction === 'forward') nextStatus = 'Done';
    else if (task.status === 'In Progress' && direction === 'backward') nextStatus = 'To-Do';
    else if (task.status === 'Done' && direction === 'backward') nextStatus = 'In Progress';

    updateTask({ ...task, status: nextStatus });
  };

  // Group tasks by column
  const todoTasks = tasks.filter(t => t.status === 'To-Do');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const doneTasks = tasks.filter(t => t.status === 'Done');

  const handleExportTasksReport = () => {
    let csv = "Duty / Task Title,Assigned Handler,Deadline Date,Status State\n";
    tasks.forEach(t => {
      csv += `"${t.name.replace(/"/g, '""')}","${t.assignedTo.replace(/"/g, '""')}","${t.deadline}","${t.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_squad_delegated_tasks_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="squad-tasks-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header with interactive Task creator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800">Wedding Squad Task Delegation</h2>
          <p className="text-xs text-stone-500 mt-1">
            Delegate responsibilities (like food verification, entrance flower prep, DJ tests) to family members and wedding helpers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-task"
            onClick={() => openFormModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-emerald-800/10"
          >
            <Plus className="h-4 w-4" />
            <span>Delegate New Crew Duty</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TO DO Column */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/50 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/60 mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 block"></span>
              <h3 className="font-semibold text-stone-700 text-xs uppercase tracking-wider">To-Do Crew</h3>
            </div>
            <span className="font-mono text-xs font-bold text-stone-500 bg-stone-200/50 px-2 py-0.5 rounded-md">{todoTasks.length}</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[550px] pr-1.5">
            {todoTasks.length === 0 ? (
              <div className="py-12 text-center text-stone-450 text-xs italic">
                Welcome to Tectell Wedding Management. No To-Do tasks pending.
              </div>
            ) : (
              todoTasks.map(t => (
                <TaskCard key={t.id} task={t} onEdit={() => openFormModal(t)} onDelete={deleteTask} onShift={handleShiftStatus} />
              ))
            )}
          </div>
        </div>

        {/* IN PROGRESS Column */}
        <div className="bg-amber-50/15 rounded-2xl p-5 border border-amber-100/40 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/60 mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 block"></span>
              <h3 className="font-semibold text-stone-700 text-xs uppercase tracking-wider font-semibold text-amber-900/80">In Progress</h3>
            </div>
            <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">{inProgressTasks.length}</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[550px] pr-1.5">
            {inProgressTasks.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Welcome to Tectell Wedding Management. No active tasks currently running.
              </div>
            ) : (
              inProgressTasks.map(t => (
                <TaskCard key={t.id} task={t} onEdit={() => openFormModal(t)} onDelete={deleteTask} onShift={handleShiftStatus} />
              ))
            )}
          </div>
        </div>

        {/* DONE Column */}
        <div className="bg-emerald-50/10 rounded-2xl p-5 border border-emerald-100/20 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/60 mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-750 block bg-[#1a6f44]"></span>
              <h3 className="font-semibold text-stone-700 text-xs uppercase tracking-wider font-semibold text-emerald-900/80">Done Crew</h3>
            </div>
            <span className="font-mono text-xs font-bold text-[#1a6f44] bg-emerald-50/80 px-2 py-0.5 rounded-md">{doneTasks.length}</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[550px] pr-1.5">
            {doneTasks.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs italic">
                Welcome to Tectell Wedding Management. No duties completed yet.
              </div>
            ) : (
              doneTasks.map(t => (
                <TaskCard key={t.id} task={t} onEdit={() => openFormModal(t)} onDelete={deleteTask} onShift={handleShiftStatus} />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Task Create / Edit Modal popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-5 p-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingTask ? 'Edit Delegated Task' : 'Delegate Wedding Duty'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Specify name, delegate to a helper, and set completion deadlines.</p>
              </div>

              <div className="space-y-4">
                {/* Task Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Task Description</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Verify food caterers and hot plate settings"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Assign To (Crew Member / Cousin)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Nisha Shah (Sister)"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Due Date Deadline</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Initial Status</label>
                  <select
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="To-Do">To-Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              {/* Submit panel actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {editingTask ? 'Save Changes' : 'Assign Duty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* Individual Task Card Sub-Component */
interface TaskCardProps {
  key?: any;
  task: Task;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onShift: (task: Task, direction: 'forward' | 'backward') => void;
}

function TaskCard({ task, onEdit, onDelete, onShift }: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  // formatting timeline text
  const formattedDate = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No deadline';

  const isOverdue = task.status !== 'Done' && task.deadline && new Date(task.deadline) < new Date('2026-06-16');

  return (
    <div className="bg-white rounded-xl p-4 border border-stone-200/60 shadow-xs hover:shadow-md transition-shadow relative group">
      
      {/* Settings Row inside Card */}
      <div className="flex items-start justify-between gap-2.5 mb-2.5">
        <h4 className="font-semibold text-stone-800 text-xs tracking-wide leading-relaxed pr-6">{task.name}</h4>
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded"
            title="Edit Task"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 font-sans">
              <button
                onClick={() => {
                  onDelete(task.id);
                  setConfirmDelete(false);
                }}
                className="px-1.5 py-0.5 bg-[#c53030] text-white text-[9px] font-bold rounded hover:bg-rose-700 transition"
                title="Confirm delete"
              >
                Del
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-semibold rounded hover:bg-stone-200 transition"
                title="Cancel"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded"
              title="Delete Task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Crew Info & Date row */}
      <div className="space-y-1.5 pb-2.5 mb-2.5 border-b border-stone-50">
        <div className="flex items-center gap-1.5 text-stone-505 text-[11px]">
          <User className="h-3 w-3 text-stone-400 shrink-0" />
          <span className="font-semibold text-stone-700">{task.assignedTo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-stone-505 text-[11px]">
          <Calendar className="h-3 w-3 text-stone-400 shrink-0" />
          <span className="font-medium text-stone-600">{formattedDate}</span>
          {isOverdue && (
            <span className="text-red-500 flex items-center gap-0.5 font-bold" title="Past due date limit!">
              <AlertCircle className="h-3 w-3" />
              <span>Overdue</span>
            </span>
          )}
        </div>
      </div>

      {/* Column Shifters Controls */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        {task.status !== 'To-Do' ? (
          <button
            onClick={() => onShift(task, 'backward')}
            className="flex items-center gap-1 py-1 px-2 hover:bg-stone-50 rounded-lg hover:text-stone-800 transition-colors border border-stone-100 bg-white"
            title="Move Backward"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {task.status !== 'Done' ? (
          <button
            onClick={() => onShift(task, 'forward')}
            className="flex items-center gap-1 py-1 px-2 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg transition-colors border border-[#a2cfb6] text-emerald-800 font-semibold bg-emerald-500/5 active:scale-95"
            title="Move Ahead"
          >
            <span>Next</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-0.5 text-[10px]">
            <CheckCircle className="h-3 w-3 fill-emerald-100" />
            <span>Complete</span>
          </div>
        )}
      </div>

    </div>
  );
}
