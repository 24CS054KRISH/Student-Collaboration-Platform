import React, { useState } from "react";

export default function ProjectEditModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    title: project.title || "",
    description: project.description || "",
    category: project.category || "General",
    tags: (project.requiredSkills || project.tags || []).join(", "),
    status: project.status || "Planning",
    progress: project.progress || 0,
    teamSize: project.teamSize || 1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return;

    // Convert tag input back to array
    const requiredSkills = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    onSave({
      title: form.title,
      description: form.description,
      category: form.category,
      requiredSkills,
      status: form.status,
      progress: parseInt(form.progress) || 0,
      teamSize: parseInt(form.teamSize) || 1,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">Edit Project Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              required
              rows="3"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
            <input
              type="text"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tech Tags (Comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
                className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Team Size</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.teamSize}
              onChange={(e) => setForm({ ...form, teamSize: parseInt(e.target.value) || 1 })}
              className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
