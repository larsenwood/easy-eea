import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {ArrowLeft, ArrowRight, CalendarIcon, Plus, Trash2} from 'lucide-react';
import {useProject} from '@/contexts/ProjectContext';
import {RecurringTrip, Station, TravelProject} from '@/types/project';
import {toast} from 'sonner';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";

const FRENCH_STATIONS = [
    'Paris Gare de Lyon', 'Paris Montparnasse', 'Paris Nord', 'Paris Est',
    'Lyon Part-Dieu', 'Marseille Saint-Charles', 'Lille Europe', 'Bordeaux Saint-Jean',
    'Toulouse Matabiau', 'Nantes', 'Strasbourg', 'Rennes', 'Montpellier Saint-Roch',
    'Nice Ville', 'Dijon Ville', 'Rouen Rive-Droite', 'Grenoble', 'Tours'
];

const DAYS_OF_WEEK = [
    {value: 1, label: 'Lundi'},
    {value: 2, label: 'Mardi'},
    {value: 3, label: 'Mercredi'},
    {value: 4, label: 'Jeudi'},
    {value: 5, label: 'Vendredi'},
    {value: 6, label: 'Samedi'},
    {value: 0, label: 'Dimanche'},
];

const NewProject = () => {
    const [stations, setStations] = useState([]);

    useEffect(() => {
        const fetchStations = async () => {
            const res = await fetch(
                `/stations_origin.json`
            );
            const data = await res.json();
            setStations(data);
        };
        fetchStations();
    }, [])

    const navigate = useNavigate();
    const {currentProject, setCurrentProject} = useProject();
    const [addRecuringTripDialog, setAddRecuringTripDialogOpen] = useState(false);
    const [newTripDay, setNewTripDay] = useState<string>('');
    const [newTripTime, setNewTripTime] = useState<string>('');
    const [newTripFromHome, setNewTripFromHome] = useState<string>('true');
    const [homeStation, setHomeStation] = useState<Station | null>(null);
    const [studyStation, setStudyStation] = useState<Station | null>(null);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [recurringTrips, setRecurringTrips] = useState<RecurringTrip[]>([]);

    useEffect(() => {
        if (!currentProject) return;

        setHomeStation(currentProject.homeStation ?? null);
        setStudyStation(currentProject.studyStation ?? null);
        setStartDate(currentProject.startDate ? new Date(currentProject.startDate) : undefined);
        setEndDate(currentProject.endDate ? new Date(currentProject.endDate) : undefined);
        setRecurringTrips(currentProject.recurringTrips ?? []);
    }, [currentProject]);

    const addRecurringTrip = () => {
        if (!newTripDay || !newTripTime) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        const newTrip: RecurringTrip = {
            id: `trip-${Date.now()}`,
            dayOfWeek: parseInt(newTripDay),
            time: newTripTime,
            fromHome: newTripFromHome === 'true'
        };

        setRecurringTrips([...recurringTrips, newTrip]);
        setAddRecuringTripDialogOpen(false);
        setNewTripDay('');
        setNewTripTime('');
        setNewTripFromHome('true');
        toast.success('Trajet récurrent ajouté');
    };

    const removeTrip = (id: string) => {
        setRecurringTrips(recurringTrips.filter(trip => trip.id !== id));
    };

    const updateTrip = (id: string, field: keyof RecurringTrip, value: any) => {
        setRecurringTrips(recurringTrips.map(trip =>
            trip.id === id ? {...trip, [field]: value} : trip
        ));
    };

    const openAddMenu = () => {
        if (!homeStation || !studyStation) {
            toast.error('Veuillez remplir vos gares de départ et d\'arrivée avant d\'ajouter un trajet récurrent');
            return;
        }

        setAddRecuringTripDialogOpen(true);
    }

    const handleContinue = () => {
        if (!homeStation || !studyStation) {
            toast.error('Veuillez sélectionner les deux gares');
            return;
        }

        if (!startDate || !endDate) {
            toast.error('Veuillez sélectionner les dates de début et de fin');
            return;
        }

        if (startDate > endDate) {
            toast.error('La date de début doit être avant la date de fin');
            return;
        }

        if (recurringTrips.length === 0) {
            toast.error('Ajoutez au moins un voyage récurrent');
            return;
        }

        const project: TravelProject = {
            id: `project-${Date.now()}`,
            homeStation: homeStation,
            studyStation: studyStation,
            recurringTrips,
            attestationFolders: [],
            createdAt: new Date(),
            startDate,
            endDate,
        };

        setCurrentProject(project);
        navigate('/select-trains');
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 w-4 h-4"/>
                    Retour
                </Button>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Nouveau projet de déplacements</h1>
                    <p className="text-muted-foreground">Configurez vos gares et trajets récurrents</p>
                </div>

                <Card className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="home">Gare de départ (Domicile)</Label>
                            <Select value={homeStation?.id}
                                    onValueChange={(id) => setHomeStation(stations.find(s => s.id === id) || null)}>
                                <SelectTrigger id="home">
                                    <SelectValue placeholder="Sélectionnez une gare"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {stations.map(station => (
                                        <SelectItem key={station['id']}
                                                    value={station['id']}>{station['name']}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="study">Gare d'arrivée (Lieu d'études)</Label>
                            <Select value={studyStation?.id}
                                    onValueChange={(id) => setStudyStation(stations.find(s => s.id === id) || null)}>
                                <SelectTrigger id="study">
                                    <SelectValue placeholder="Sélectionnez une gare"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {stations.map(station => (
                                        <SelectItem key={station['id']}
                                                    value={station['id']}>{station['name']}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Date de début</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4"/>
                                        {startDate ? startDate.toLocaleDateString('fr') :
                                            <span>Sélectionnez une date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                        className="pointer-events-auto"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Date de fin</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4"/>
                                        {endDate ? endDate.toLocaleDateString('fr') :
                                            <span>Sélectionnez une date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        initialFocus
                                        className="pointer-events-auto"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Voyages récurrents</h2>
                        <Button onClick={openAddMenu} size="sm">
                            <Plus className="mr-2 w-4 h-4"/>
                            Ajouter
                        </Button>
                    </div>

                    {recurringTrips.map(trip => (
                        <Card key={trip.id} className="p-4">
                            <div className="grid md:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Jour</Label>
                                    <Select
                                        value={trip.dayOfWeek.toString()}
                                        onValueChange={(value) => updateTrip(trip.id, 'dayOfWeek', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS_OF_WEEK.map(day => (
                                                <SelectItem key={day.value} value={day.value.toString()}>
                                                    {day.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Heure</Label>
                                    <Input
                                        type="time"
                                        value={trip.time}
                                        onChange={(e) => updateTrip(trip.id, 'time', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Direction</Label>
                                    <Select
                                        value={trip.fromHome.toString()}
                                        onValueChange={(value) => updateTrip(trip.id, 'fromHome', value === 'true')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Domicile → Études</SelectItem>
                                            <SelectItem value="false">Études → Domicile</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removeTrip(trip.id)}
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                        </Card>
                    ))}

                    {recurringTrips.length === 0 && (
                        <Card className="p-8">
                            <p className="text-center text-muted-foreground">
                                Aucun voyage récurrent ajouté. Cliquez sur "Ajouter" pour commencer.
                            </p>
                        </Card>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleContinue} size="lg">
                        Continuer
                        <ArrowRight className="ml-2 w-4 h-4"/>
                    </Button>
                </div>

                <Dialog open={addRecuringTripDialog} onOpenChange={setAddRecuringTripDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un trajet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Jour de la semaine</Label>
                                <Select value={newTripDay} onValueChange={setNewTripDay}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un jour"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Dimanche</SelectItem>
                                        <SelectItem value="1">Lundi</SelectItem>
                                        <SelectItem value="2">Mardi</SelectItem>
                                        <SelectItem value="3">Mercredi</SelectItem>
                                        <SelectItem value="4">Jeudi</SelectItem>
                                        <SelectItem value="5">Vendredi</SelectItem>
                                        <SelectItem value="6">Samedi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Heure</Label>
                                <Input
                                    type="time"
                                    value={newTripTime}
                                    onChange={(e) => setNewTripTime(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Direction</Label>
                                <Select value={newTripFromHome} onValueChange={setNewTripFromHome}>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">
                                            {homeStation ? homeStation.name : "Inconnu"} → {studyStation ? studyStation.name : "Inconnu"}
                                        </SelectItem>
                                        <SelectItem value="false">
                                            {studyStation ? studyStation.name : "Inconnu"} → {homeStation ? homeStation.name : "Inconnu"}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={addRecurringTrip} className="w-full">
                                Ajouter
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default NewProject;
