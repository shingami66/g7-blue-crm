"use client";

import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, Search, Calendar, User, MoreVertical, LayoutGrid, CheckSquare, DollarSign } from "lucide-react";
import { projectsData } from "@/lib/data/projects";
import { useState } from "react";

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const activeProject = projectsData.find((p) => p.id === selectedProject);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Project Command Center"
        subtitle="Track event operations, logistics execution, and timelines."
      >
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Plus size={18} />
          New Project
        </button>
      </PageHeader>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Left Column (Project List) */}
        <div
          className={`flex flex-col transition-all duration-300 ${
            selectedProject ? "w-1/3" : "w-full"
          }`}
        >
          {/* Tabs */}
          <div className="flex border-b border-surface-variant mb-4">
            <button className="px-4 py-2 text-[14px] font-semibold text-primary border-b-2 border-primary">
              All Active
            </button>
            <button className="px-4 py-2 text-[14px] font-semibold text-on-surface-variant hover:text-on-surface">
              Planning
            </button>
            <button className="px-4 py-2 text-[14px] font-semibold text-on-surface-variant hover:text-on-surface">
              Completed
            </button>
          </div>

          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {projectsData.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedProject === p.id
                    ? "bg-primary-fixed/20 border-primary shadow-sm"
                    : "bg-surface-container-lowest border-surface-variant hover:border-outline-variant"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-primary">{p.name}</h4>
                  <StatusBadge variant={p.status as any}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </StatusBadge>
                </div>
                <p className="text-[12px] text-on-surface-variant mb-3">{p.client}</p>
                <div className="flex justify-between items-center text-[12px] text-on-surface-variant border-t border-surface-variant pt-3">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{new Date(p.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckSquare size={14} />
                    <span>{p.tasks.completed}/{p.tasks.total}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-surface-variant rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full ${p.status === 'completed' ? 'bg-status-completed-text' : 'bg-primary'}`} 
                    style={{ width: `${(p.tasks.completed / p.tasks.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Detail Panel (Command Center) */}
        {selectedProject && activeProject && (
          <div className="w-2/3 bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-surface-variant flex justify-between items-start bg-surface-bright">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[24px] leading-[32px] font-semibold text-primary">
                    {activeProject.name}
                  </h3>
                  <StatusBadge variant={activeProject.status as any}>
                    {activeProject.status.charAt(0).toUpperCase() + activeProject.status.slice(1)}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-4 text-[14px] text-on-surface-variant">
                  <span className="font-mono">{activeProject.id}</span>
                  <span>•</span>
                  <span>{activeProject.client}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded transition-colors">
                  <MoreVertical size={20} />
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-2 text-on-surface-variant hover:text-primary rounded transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-6">
              {/* Project Identity */}
              <div className="bg-surface p-4 rounded-xl border border-surface-variant">
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-4 flex items-center gap-2">
                  <User size={16} />
                  Project Identity
                </h4>
                <div className="space-y-3 text-[14px]">
                  <div>
                    <div className="text-on-surface-variant text-[12px]">Project Manager</div>
                    <div className="font-medium text-on-surface">{activeProject.manager}</div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant text-[12px]">Timeline</div>
                    <div className="font-medium text-on-surface">
                      {activeProject.startDate} to {activeProject.endDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Overview */}
              <div className="bg-surface p-4 rounded-xl border border-surface-variant">
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase mb-4 flex items-center gap-2">
                  <DollarSign size={16} />
                  Financial Overview
                </h4>
                <div className="space-y-3 text-[14px]">
                  <div>
                    <div className="text-on-surface-variant text-[12px]">Total Budget</div>
                    <div className="font-semibold text-[20px] text-primary">{activeProject.budget}</div>
                  </div>
                  <div>
                    <div className="text-on-surface-variant text-[12px]">Committed Cost</div>
                    <div className="font-medium text-on-surface">SAR 0.00 (0%)</div>
                  </div>
                </div>
              </div>

              {/* Task Checklist */}
              <div className="col-span-2 bg-surface p-4 rounded-xl border border-surface-variant">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase flex items-center gap-2">
                    <CheckSquare size={16} />
                    Execution Tasks
                  </h4>
                  <span className="text-[12px] font-semibold text-primary">
                    {activeProject.tasks.completed} / {activeProject.tasks.total} Completed
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    "Site Inspection & Permits",
                    "Vendor Contracting",
                    "Material Procurement",
                    "On-site Setup & Rigging"
                  ].map((task, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
                      <input 
                        type="checkbox" 
                        defaultChecked={i < 2 && activeProject.status !== 'planning'} 
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" 
                      />
                      <span className={`text-[14px] ${i < 2 && activeProject.status !== 'planning' ? 'line-through text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                        {task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
