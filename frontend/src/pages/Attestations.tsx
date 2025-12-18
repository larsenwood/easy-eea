import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {AlertTriangle, ArrowLeft, Download, FolderPlus, Plus, Trash2} from 'lucide-react';
import {useProject} from '@/contexts/ProjectContext';
import {AttestationFolder, Journey} from '@/types/project';
import {toast} from 'sonner';
import {closestCenter, DndContext, DragEndEvent, useDraggable, useDroppable} from '@dnd-kit/core';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Label} from '@/components/ui/label';
import SelectTrainDialog from "@/pages/SelectTrainDialog.tsx";

const DraggableTrip = ({journey, folderId, selection, currentProject}: any) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: journey.id,
        data: {folderId, journey, tripId: journey.id},
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="p-2 bg-muted rounded text-xs cursor-move hover:bg-muted/80 transition-colors"
        >
            <div className="font-medium">{journey.date.toLocaleDateString('fr')}</div>
            <div className="font-medium">{journey.fromHome
                ? `${currentProject.homeStation.name} → ${currentProject.studyStation.name}`
                : `${currentProject.studyStation.name} → ${currentProject.homeStation.name}`
            }</div>
            <div className="text-muted-foreground">{selection.length} trains</div>
        </div>
    );
};

const DroppableFolder = ({folder, children}: any) => {
    const {setNodeRef, isOver} = useDroppable({
        id: folder.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`space-y-2 max-h-48 overflow-y-auto p-2 rounded ${isOver ? 'bg-primary/10' : ''}`}
        >
            {children}
        </div>
    );
};

const dateWithoutTimezone = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
}

const Attestations = () => {
    const navigate = useNavigate();
    const {currentProject, setCurrentProject, saveProject} = useProject();
    const [folders, setFolders] = useState<AttestationFolder[]>([]);
    const [addTripDialogOpen, setAddTripDialogOpen] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [newTripDate, setNewTripDate] = useState("");
    const [newTripTime, setNewTripTime] = useState<string>('');
    const [newTripFromHome, setNewTripFromHome] = useState<string>('true');
    const [trainDialogOpen, setTrainDialogOpen] = useState(false);
    const [pendingTrip, setPendingTrip] = useState<{ date: string; time: string; fromHome: boolean } | null>(null);

    const generateJourneys = (): Journey[] => {
        const startDate = currentProject?.startDate;
        const endDate = currentProject?.endDate;
        if (!startDate || !endDate) return [];

        const journeys: Journey[] = [];
        const currentDate = new Date(startDate);
        currentDate.setHours(1, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();

            currentProject.recurringTrips.forEach(trip => {
                if (trip.dayOfWeek === dayOfWeek) {
                    journeys.push({
                        id: `journey-${currentDate.toISOString()}-${trip.id}`,
                        date: new Date(currentDate),
                        recurringTripId: trip.id,
                        trainOptionSelected: trip.trainOptionSelected,
                        fromHome: trip.fromHome,
                        time: trip.time,
                    });
                }
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return journeys;
    };

    function splitJourneysIntoFolders(journeys: Journey[]): AttestationFolder[] {
        const sortedJourneys = [...journeys].sort((a, b) => a.date.getTime() - b.date.getTime());
        const folders: AttestationFolder[] = [];
        let i = 0;

        while (i < sortedJourneys.length) {
            const start = sortedJourneys[i].date;
            let endIdx = i;
            while (
                endIdx + 1 < sortedJourneys.length &&
                (sortedJourneys[endIdx + 1].date.getTime() - start.getTime()) <= 60 * 24 * 60 * 60 * 1000
                ) {
                endIdx++;
            }
            const folderJourneys = sortedJourneys.slice(i, endIdx + 1);
            folders.push({
                id: `folder-${folders.length + 1}`,
                name: `Dossier ${folders.length + 1}`,
                trips: folderJourneys,
                startDate: folderJourneys[0].date,
                endDate: folderJourneys[folderJourneys.length - 1].date,
            });
            i = endIdx + 1;
        }
        return folders;
    }

    useEffect(() => {
        if (!currentProject) {
            navigate('/');
            return;
        }

        if (!currentProject.attestationFolders || currentProject.attestationFolders.length === 0) {
            const journeys: Journey[] = generateJourneys();
            setFolders(splitJourneysIntoFolders(journeys));
        } else {
            setFolders(currentProject.attestationFolders);
        }
    }, [currentProject, navigate]);


    const addFolder = () => {
        const newFolder: AttestationFolder = {
            id: `folder-${Date.now()}`,
            name: `Dossier ${folders.length + 1}`,
            trips: [],
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const updateFolderName = (id: string, name: string) => {
        setFolders(prev => prev.map(f => f.id === id ? {...f, name} : f));
    };

    const deleteFolder = (id: string) => {
        if (folders.length === 1) {
            toast.error('Il doit toujours y avoir au moins un dossier');
            return;
        }
        setFolders(prev => prev.filter(f => f.id !== id));
        toast.success('Dossier supprimé');
    };

    const handleSave = () => {
        if (!currentProject) return;

        const updatedProject = {
            ...currentProject,
            attestationFolders: folders,
        };

        setCurrentProject(updatedProject);
        saveProject();
        toast.success('Projet sauvegardé avec succès');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (!over) return;

        const sourceFolderId = active.data.current?.folderId as string | undefined;
        const targetFolderId = over.id as string;
        const journey = active.data.current?.journey as Journey | undefined;

        if (!journey || !sourceFolderId) return;
        if (sourceFolderId === targetFolderId) return;

        setFolders(prevFolders => {
            return prevFolders.map(folder => {
                if (folder.id === sourceFolderId) {
                    return {
                        ...folder,
                        trips: folder.trips.filter(t => t.id !== journey.id).sort((a, b) => a.date.getTime() - b.date.getTime())
                    };
                }
                if (folder.id === targetFolderId) {
                    const exists = folder.trips.some(t => t.id === journey.id);
                    return exists ? folder : {
                        ...folder,
                        trips: [...folder.trips, journey].sort((a, b) => a.date.getTime() - b.date.getTime())
                    };
                }
                return folder;
            });
        });

        toast.success('Trajet déplacé');
    };

    const removeTrip = (folderId: string, journey: Journey) => {
        setFolders(prev => prev.map(f =>
            f.id === folderId
                ? {...f, trips: f.trips.filter(t => t.id !== journey.id)}
                : f
        ));
        toast.success('Trajet supprimé');
    };

    const openAddTripDialog = (folderId: string) => {
        setSelectedFolderId(folderId);
        setAddTripDialogOpen(true);
    };

    const addTripToFolder = () => {
        if (!currentProject || !newTripDate || !newTripTime) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        setPendingTrip({
            date: newTripDate,
            time: newTripTime,
            fromHome: newTripFromHome === 'true',
        });
        setAddTripDialogOpen(false);
        setTrainDialogOpen(true);

        setNewTripDate('');
        setNewTripTime('');
        setNewTripFromHome('true');
    };

    const getTripCount = (folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        let count = 0;
        for (const trip of folder?.trips || []) {
            for (const train of trip.trainOptionSelected.trains) {
                if (train.trainType == "Intercités" || train.trainType == "TGV INOUI") {
                    count += 1;
                }
            }
        }
        return count;
    };

    const getDaysBetween = (start: Date, end: Date) => {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const hasWarning = (folder: AttestationFolder) => {
        const tripCount = folder.trips.length;
        const daysDiff = getDaysBetween(folder.startDate, folder.endDate);
        return tripCount < 10 || daysDiff > 60;
    };

    const downloadAttestation = async (folder: AttestationFolder) => {
        try {
            const response = await fetch('/api/pdf_generator/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    validityDate: folder.startDate,
                    journeys: folder.trips,
                }),
            });

            if (!response.ok) throw new Error('Erreur serveur');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${folder.name}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Erreur de génération PDF:", err);
        }
    };


    if (!currentProject) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/select-trains')}>
                    <ArrowLeft className="mr-2 w-4 h-4"/>
                    Retour
                </Button>

                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">Projets d'attestation</h1>
                        <p className="text-muted-foreground">
                            Organisez vos trajets en dossiers (minimum 10 trajets par dossier, maximum 2 mois)
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={addFolder}>
                            <FolderPlus className="mr-2 w-4 h-4"/>
                            Nouveau dossier
                        </Button>
                        <Button onClick={handleSave}>
                            <Download className="mr-2 w-4 h-4"/>
                            Télécharger
                        </Button>
                    </div>
                </div>

                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {folders.map((folder) => (
                            <Card key={folder.id} className="p-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={folder.name}
                                            onChange={(e) => updateFolderName(folder.id, e.target.value)}
                                            className="text-lg font-semibold"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteFolder(folder.id)}
                                            disabled={folders.length === 1}
                                            className="flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive"/>
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant={getTripCount(folder.id) >= 10 ? 'default' : 'destructive'}>
                                            {getTripCount(folder.id)} trajets
                                        </Badge>
                                        <Badge variant="outline">
                                            {getDaysBetween(folder.startDate, folder.endDate)} jours
                                        </Badge>
                                    </div>

                                    {hasWarning(folder) && (
                                        <div
                                            className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
                                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0"/>
                                            <div className="space-y-1">
                                                {getTripCount(folder.id) < 10 && (
                                                    <p className="text-destructive">Minimum 10 trajets requis</p>
                                                )}
                                                {getDaysBetween(folder.startDate, folder.endDate) > 60 && (
                                                    <p className="text-destructive">Période maximale : 2 mois</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">Trajets dans ce dossier :</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openAddTripDialog(folder.id)}
                                        >
                                            <Plus className="w-3 h-3"/>
                                        </Button>
                                    </div>
                                    <DroppableFolder folder={folder}>
                                        {folder.trips.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-4">
                                                Aucun trajet. Glissez-déposez ou ajoutez-en.
                                            </p>
                                        ) : (
                                            folder.trips.map((journey) => {
                                                const selection = journey?.trainOptionSelected?.trains || [];

                                                if (!selection) return null;

                                                return (
                                                    <div key={journey.id} className="flex items-center gap-2">
                                                        <DraggableTrip
                                                            journey={journey}
                                                            folderId={folder.id}
                                                            selection={selection}
                                                            currentProject={currentProject}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeTrip(folder.id, journey)}
                                                            className="h-auto p-1"
                                                        >
                                                            <Trash2 className="w-3 h-3 text-destructive"/>
                                                        </Button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </DroppableFolder>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => downloadAttestation(folder)}>
                                            <Download className="mr-2 w-4 h-4"/>
                                            Télécharger les attestations
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </DndContext>

                <Dialog open={addTripDialogOpen} onOpenChange={setAddTripDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un trajet</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Champ : Date du trajet */}
                            <div className="space-y-2">
                                <Label>Date du trajet</Label>
                                <Input
                                    type="date"
                                    value={newTripDate}
                                    onChange={(e) => setNewTripDate(e.target.value)}
                                />
                            </div>

                            {/* Champ : Heure du trajet */}
                            <div className="space-y-2">
                                <Label>Heure</Label>
                                <Input
                                    type="time"
                                    value={newTripTime}
                                    onChange={(e) => setNewTripTime(e.target.value)}
                                />
                            </div>

                            {/* Champ : Direction */}
                            <div className="space-y-2">
                                <Label>Direction</Label>
                                <Select value={newTripFromHome} onValueChange={setNewTripFromHome}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner la direction"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">
                                            {currentProject?.homeStation.name} → {currentProject?.studyStation.name}
                                        </SelectItem>
                                        <SelectItem value="false">
                                            {currentProject?.studyStation.name} → {currentProject?.homeStation.name}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Bouton : Ajouter */}
                            <Button onClick={addTripToFolder} className="w-full">
                                Ajouter
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {pendingTrip && (
                    <SelectTrainDialog
                        open={trainDialogOpen}
                        onOpenChange={setTrainDialogOpen}
                        date={pendingTrip.date}
                        time={pendingTrip.time}
                        fromHome={pendingTrip.fromHome}
                        currentProject={currentProject}
                        onConfirm={(selectedTrain) => {
                            const newJourney = {
                                id: `journey-${Date.now()}`,
                                date: new Date(pendingTrip.date),
                                time: pendingTrip.time,
                                fromHome: pendingTrip.fromHome,
                                recurringTripId: "manual-" + Date.now(),
                                trainOptionSelected: selectedTrain,
                            };
                            setFolders((prev) =>
                                prev.map((f) =>
                                    f.id === selectedFolderId
                                        ? {
                                            ...f,
                                            trips: [...f.trips, newJourney].sort((a, b) => a.date.getTime() - b.date.getTime())
                                        }
                                        : f
                                )
                            );
                            setPendingTrip(null);
                            toast.success("Trajet ajouté avec succès !");
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Attestations;