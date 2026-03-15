import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'planning' | 'completed';
  role: 'owner' | 'admin' | 'viewer';
  createdAt: string;
  ownerId: string;
}

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Internal' | 'External Planner' | 'Client';
  department?: string;
  hourlyRate?: number;
  avatar?: string;
  ownerId: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
  hourlyRate?: number;
  ownerId: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  projectRole: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  ownerId: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  companyUsers: CompanyUser[];
  projectMembers: ProjectMember[];
  timeEntries: TimeEntry[];
  setActiveProject: (id: string | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'ownerId'>) => void;
  addCompanyUser: (user: Omit<CompanyUser, 'id' | 'ownerId'>) => void;
  updateCompanyUser: (id: string, updates: Partial<CompanyUser>) => void;
  removeCompanyUser: (id: string) => void;
  addProjectMember: (member: Omit<ProjectMember, 'id' | 'ownerId'>) => void;
  removeProjectMember: (projectId: string, userId: string) => void;
  addTimeEntry: (entry: Omit<TimeEntry, 'id' | 'ownerId'>) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !db) return;
    
    const qProjects = query(collection(db, 'projects'), where('ownerId', '==', currentUser.uid));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => doc.data() as Project));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    const qUsers = query(collection(db, 'companyUsers'), where('ownerId', '==', currentUser.uid));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setCompanyUsers(snapshot.docs.map(doc => doc.data() as CompanyUser));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'companyUsers'));

    const qMembers = query(collection(db, 'projectMembers'), where('ownerId', '==', currentUser.uid));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setProjectMembers(snapshot.docs.map(doc => doc.data() as ProjectMember));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projectMembers'));

    const qTime = query(collection(db, 'timeEntries'), where('ownerId', '==', currentUser.uid));
    const unsubTime = onSnapshot(qTime, (snapshot) => {
      setTimeEntries(snapshot.docs.map(doc => doc.data() as TimeEntry));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'timeEntries'));

    return () => {
      unsubProjects();
      unsubUsers();
      unsubMembers();
      unsubTime();
    };
  }, [currentUser]);

  const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!currentUser || !db) return;
    const id = `proj-${Date.now()}`;
    const newProject: Project = {
      ...projectData,
      id,
      createdAt: new Date().toISOString(),
      ownerId: currentUser.uid
    };
    try {
      await setDoc(doc(db, 'projects', id), newProject);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projects/' + id);
    }
  };

  const addCompanyUser = async (userData: Omit<CompanyUser, 'id' | 'ownerId'>) => {
    if (!currentUser || !db) return;
    const id = `usr-${Date.now()}`;
    const newUser: CompanyUser = {
      ...userData,
      id,
      ownerId: currentUser.uid
    };
    try {
      await setDoc(doc(db, 'companyUsers', id), newUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'companyUsers/' + id);
    }
  };

  const updateCompanyUser = async (id: string, updates: Partial<CompanyUser>) => {
    if (!currentUser || !db) return;
    try {
      await updateDoc(doc(db, 'companyUsers', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'companyUsers/' + id);
    }
  };

  const removeCompanyUser = async (id: string) => {
    if (!currentUser || !db) return;
    try {
      await deleteDoc(doc(db, 'companyUsers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'companyUsers/' + id);
    }
  };

  const addTimeEntry = async (entryData: Omit<TimeEntry, 'id' | 'ownerId'>) => {
    if (!currentUser || !db) return;
    const id = `te-${Date.now()}`;
    const newEntry: TimeEntry = {
      ...entryData,
      id,
      ownerId: currentUser.uid
    };
    try {
      await setDoc(doc(db, 'timeEntries', id), newEntry);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'timeEntries/' + id);
    }
  };

  const addProjectMember = async (memberData: Omit<ProjectMember, 'id' | 'ownerId'>) => {
    if (!currentUser || !db) return;
    const id = `pm-${Date.now()}`;
    const newMember: ProjectMember = {
      ...memberData,
      id,
      ownerId: currentUser.uid
    };
    try {
      await setDoc(doc(db, 'projectMembers', id), newMember);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projectMembers/' + id);
    }
  };

  const removeProjectMember = async (projectId: string, userId: string) => {
    if (!currentUser || !db) return;
    const member = projectMembers.find(m => m.projectId === projectId && m.userId === userId);
    if (member) {
      try {
        await deleteDoc(doc(db, 'projectMembers', member.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'projectMembers/' + member.id);
      }
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProjectId, 
      companyUsers,
      projectMembers,
      timeEntries,
      setActiveProject: setActiveProjectId, 
      addProject,
      addCompanyUser,
      updateCompanyUser,
      removeCompanyUser,
      addProjectMember,
      removeProjectMember,
      addTimeEntry
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
