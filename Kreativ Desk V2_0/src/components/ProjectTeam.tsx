import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { Users, UserPlus, Search, MoreVertical, X, Shield } from 'lucide-react';
import { cn } from '../utils';

export default function ProjectTeam() {
  const { projectId } = useParams();
  const { projects, companyUsers, projectMembers, addProjectMember, removeProjectMember, activeProjectId } = useProject();
  
  const currentProjectId = projectId || activeProjectId;
  const activeProject = projects.find(p => p.id === currentProjectId);
  const currentMembers = projectMembers.filter(m => m.projectId === currentProjectId);
  
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Owner' | 'Admin' | 'Editor' | 'Viewer'>('Viewer');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !currentProjectId) return;
    
    addProjectMember({
      projectId: currentProjectId,
      userId: selectedUserId,
      projectRole: selectedRole
    });
    
    setIsAddMemberModalOpen(false);
    setSelectedUserId('');
    setSelectedRole('Viewer');
  };

  const handleRemoveMember = (userId: string) => {
    if (!currentProjectId) return;
    removeProjectMember(currentProjectId, userId);
  };

  // Filter out users who are already in the project
  const availableUsers = companyUsers.filter(
    user => !currentMembers.some(member => member.userId === user.id)
  );

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Project Team</h2>
          <p className="text-sm text-text-muted mt-1">Manage who has access to {activeProject?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search members..." 
              className="pl-9 pr-4 py-2 bg-surface border border-border rounded-md text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setIsAddMemberModalOpen(true)}
            className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={16} />
            Add Member
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface text-xs text-text-muted uppercase">
            <tr>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-6 py-3 font-medium">Company Role</th>
              <th className="px-6 py-3 font-medium">Project Role</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {currentMembers.map((member) => {
              const user = companyUsers.find(u => u.id === member.userId);
              if (!user) return null;
              
              return (
                <tr key={member.userId} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{user.name}</div>
                        <div className="text-xs text-text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-muted">{user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium border flex items-center gap-1.5 w-fit",
                      member.projectRole === 'Owner' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                      member.projectRole === 'Admin' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      member.projectRole === 'Editor' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      "bg-white/5 text-text-primary border-border"
                    )}>
                      {member.projectRole === 'Owner' || member.projectRole === 'Admin' ? <Shield size={12} /> : null}
                      {member.projectRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-text-muted hover:text-accent-error transition-colors text-xs font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {currentMembers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                  No members assigned to this project yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">Add Project Member</h3>
              <button 
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Select User</label>
                <select 
                  required
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                >
                  <option value="" disabled>Select a user from the company...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-accent-error mt-1">All company users are already in this project.</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Project Role</label>
                <select 
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                >
                  <option value="Viewer">Viewer (Read-only)</option>
                  <option value="Editor">Editor (Can modify data)</option>
                  <option value="Admin">Admin (Can manage settings & team)</option>
                  <option value="Owner">Owner (Full control)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
