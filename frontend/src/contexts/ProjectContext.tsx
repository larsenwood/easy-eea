import {createContext, ReactNode, useContext, useState} from 'react';
import {TravelProject} from '@/types/project';

interface ProjectContextType {
    currentProject: TravelProject | null;
    setCurrentProject: (project: TravelProject | null) => void;
    saveProject: () => void;
    loadProject: (file: File) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({children}: { children: ReactNode }) => {
    const [currentProject, setCurrentProject] = useState<TravelProject | null>(null);

    const saveProject = () => {
        if (!currentProject) return;

        const dataStr = JSON.stringify(currentProject, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `easy-eea-${currentProject.id}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const loadProject = async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const project = JSON.parse(content) as TravelProject;

                    project.createdAt = new Date(project.createdAt);
                    project.startDate = new Date(project.startDate);
                    project.endDate = new Date(project.endDate);
                    project.journeys = project.journeys.map(journey => ({
                        ...journey,
                        date: new Date(journey.date)
                    }));
                    project.attestationFolders = project.attestationFolders.map(folder => ({
                        ...folder,
                        startDate: new Date(folder.startDate),
                        endDate: new Date(folder.endDate)
                    }));

                    setCurrentProject(project);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    };

    return (
        <ProjectContext.Provider value={{currentProject, setCurrentProject, saveProject, loadProject}}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
