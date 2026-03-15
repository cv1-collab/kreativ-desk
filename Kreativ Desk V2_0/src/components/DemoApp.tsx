import React, { useEffect, useState } from 'react';
import Dashboard from './Dashboard';
import ProjectTeam from './ProjectTeam';
import CalendarComponent from './Calendar';
import Finance from './Finance';
import BIMViewer from './BIMViewer';
import MeetChat from './MeetChat';
import CRM from './CRM';
import Documents from './Documents';
import SiteMonitoring from './SiteMonitoring';
import Whiteboard from './Whiteboard';
import PitchDeck from './PitchDeck';
import Defects from './Defects';
import API from './API';
import { AuthContext } from '../contexts/AuthContext';
import { ProjectContext } from '../contexts/ProjectContext';

const MockProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const mockProjects = [
    {
      id: 'demo-1',
      name: 'Quartier Neubau Süd',
      description: 'Mock Project',
      status: 'active',
      role: 'owner',
      createdAt: new Date().toISOString(),
      ownerId: 'demo-user'
    }
  ];

  const mockContextValue = {
    projects: mockProjects as any,
    activeProjectId: 'demo-1',
    companyUsers: [],
    projectMembers: [],
    timeEntries: [],
    setActiveProject: () => {},
    addProject: () => {},
    addCompanyUser: () => {},
    updateCompanyUser: () => {},
    removeCompanyUser: () => {},
    addProjectMember: () => {},
    removeProjectMember: () => {},
    addTimeEntry: () => {},
  };

  return (
    <AuthContext.Provider value={{
      currentUser: { uid: 'demo-user', displayName: 'Demo User', email: 'demo@example.com' } as any,
      userRole: 'Admin',
      loading: false,
      logout: async () => {}
    }}>
      <ProjectContext.Provider value={mockContextValue}>
        {children}
      </ProjectContext.Provider>
    </AuthContext.Provider>
  );
};

export default function DemoApp({ activeTab }: { activeTab: string }) {
  return (
    <MockProjectProvider>
      <div className="h-full w-full bg-background p-4 md:p-8 text-text-primary overflow-y-auto overflow-x-hidden">
        {activeTab === 'overview' && <Dashboard />}
        {activeTab === 'team' && <ProjectTeam />}
        {activeTab === 'calendar' && <CalendarComponent />}
        {activeTab === 'finance' && <Finance />}
        {activeTab === 'bim' && <BIMViewer />}
        {activeTab === 'meet' && <MeetChat />}
        {activeTab === 'crm' && <CRM />}
        {activeTab === 'documents' && <Documents />}
        {activeTab === 'site' && <SiteMonitoring />}
        {activeTab === 'whiteboard' && <Whiteboard />}
        {activeTab === 'pitch' && <PitchDeck />}
        {activeTab === 'defects' && <Defects />}
        {activeTab === 'api' && <API />}
      </div>
    </MockProjectProvider>
  );
}
