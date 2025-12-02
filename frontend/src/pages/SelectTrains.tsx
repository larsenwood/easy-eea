import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {ArrowLeft, ArrowRight, CalendarIcon, Check, Clock, MapPin, TriangleAlert, X} from 'lucide-react';
import {useProject} from '@/contexts/ProjectContext';
import {RecurringTrip, TrainOption, TravelProject} from '@/types/project';
import {toast} from 'sonner';
import {Waveform} from 'ldrs/react'
import 'ldrs/react/Waveform.css'

const TRAIN_LOGOS = {
    'TGV INOUI': '🚄',
    TER: '🚆',
    "Intercités": '🚈',
};

const formatDuration = (duration: number) => {
    if (duration < 3600) {
        return Math.floor(duration / 60) + " min"
    } else {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return hours + "h" + (minutes > 0 ? " " + minutes + "min" : "");
    }
}

const generateJourneyURL = (trip: RecurringTrip, currentProject: TravelProject) => {
    let url = '/api/sncf/journeys'
    if (trip.fromHome) {
        url = url + "?from=" + currentProject.homeStation.id + "&to=" + currentProject.studyStation.id;
    } else {
        url = url + "?from=" + currentProject.studyStation.id + "&to=" + currentProject.homeStation.id;
    }

    const today = new Date();
    const day = trip.dayOfWeek;
    const date = new Date();
    date.setDate(today.getDate() + ((7 + day - today.getDay()) % 7 || 7));
    date.setHours(trip.time.split(':')[0] as unknown as number, trip.time.split(':')[1] as unknown as number, 0, 0);

    url = url + "&when=" + date.toISOString();

    return url;
}

const SelectTrains = () => {
    const navigate = useNavigate();
    const {currentProject, setCurrentProject} = useProject();
    const [currentTripIndex, setCurrentTripIndex] = useState(0);
    const [selectedTrains, setSelectedTrains] = useState<Map<string, string>>(new Map());
    const [selectedClass, setSelectedClass] = useState<'1st' | '2nd'>('2nd');
    const [currentTrainPropositions, setCurrentTrainPropositions] = useState<TrainOption[]>([]);

    if (!currentProject) {
        navigate('/');
        return null;
    }

    const fetchJourneys = async () => {
        const res = await fetch(
            generateJourneyURL(currentProject.recurringTrips[currentTripIndex], currentProject)
        );
        const data = await res.json();
        let i = 0;

        setCurrentTrainPropositions(data.map((e: any) => ({
            id: ++i,
            departureTime: new Date(
                e.departure_time.replace(
                    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                    "$1-$2-$3T$4:$5:$6"
                )
            ),
            arrivalTime: new Date(
                e.arrival_time.replace(
                    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                    "$1-$2-$3T$4:$5:$6"
                )
            ),
            ...e
        })));
    };
    if (currentTrainPropositions.length < 1) {
        fetchJourneys().then(r => {
            return null;
        });
    }

    const currentTrip = currentProject.recurringTrips[currentTripIndex];
    const tripKey = currentTrip.id;

    const toggleTrain = (trainId: string) => {
        const newMap = new Map(selectedTrains);
        newMap.set(tripKey, trainId);
        setSelectedTrains(newMap);
    };

    const handleNext = () => {
        const currentSet = selectedTrains.get(tripKey);
        if (!currentSet) {
            toast.error('Sélectionnez un train');
            return;
        }

        const currentTrainOption = currentTrainPropositions.find(tp => tp.id == currentSet);
        if (!currentTrainOption) {
            toast.error('Sélectionnez un train');
            return;
        }

        for (const train of currentTrainOption.trains) {
            if (!train.availableEEATrain) train.selectedClass = '2nd'
            else train.selectedClass = selectedClass;
        }

        if (currentTripIndex < currentProject.recurringTrips.length - 1) {
            currentProject.recurringTrips[currentTripIndex].trainOptionSelected = currentTrainOption;
            setCurrentTripIndex(currentTripIndex + 1);
            setCurrentTrainPropositions([]);

            fetchJourneys();
        } else {
            currentProject.recurringTrips[currentTripIndex].trainOptionSelected = currentTrainOption;

            setCurrentProject({
                ...currentProject,
                recurringTrips: currentProject.recurringTrips,
            });

            navigate('/attestations');
        }
    };

    const handleBack = () => {
        if (currentTripIndex > 0) {
            setCurrentTripIndex(currentTripIndex - 1);
        } else {
            navigate('/new-project');
        }
    };

    const getDayName = (day: number) => {
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return days[day];
    };

    const changeClass = (newClass: '1st' | '2nd') => {
        setSelectedClass(newClass);
        const currentSet = selectedTrains.get(tripKey);
        if (currentTrainPropositions[currentSet].price1st === undefined && newClass === '1st') {
            selectedTrains.set(tripKey, '');
        }
    }

    const currentSet = selectedTrains.get(tripKey) || '';

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 w-4 h-4"/>
                    Retour
                </Button>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold">Sélection des trains</h1>
                        <Badge variant="secondary" className="text-sm">
                            Voyage {currentTripIndex + 1} / {currentProject.recurringTrips.length}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {getDayName(currentTrip.dayOfWeek)} à {currentTrip.time} -
                        {currentTrip.fromHome
                            ? ` ${currentProject.homeStation.name} → ${currentProject.studyStation.name}`
                            : ` ${currentProject.studyStation.name} → ${currentProject.homeStation.name}`
                        }
                    </p>
                </div>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">Classe préférée</h2>
                        <RadioGroup value={selectedClass} onValueChange={(v) => changeClass(v as '1st' | '2nd')}
                                    className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="2nd" id="class-2nd"/>
                                <Label htmlFor="class-2nd">2nde classe</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1st" id="class-1st"/>
                                <Label htmlFor="class-1st">1ère classe</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-4">
                        {
                            (currentTrainPropositions.length < 1) ? (
                                <div
                                    className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center justify-center space-y-4">
                                    <Waveform
                                        size="60"
                                        stroke="3.5"
                                        speed="1"
                                        color="white"
                                    />

                                    <div className="text-center text-muted-foreground">
                                        Chargement des propositions de trains...
                                    </div>
                                </div>
                            ) : (null)
                        }

                        {currentTrainPropositions.map((train) => {
                            let price = 0;

                            const isSelected = currentSet == train.id;
                            const canSelect = false;//(!train.price1st && selectedClass === '1st');

                            const trainType = (train.trains.length == 1) ? train.trains[0].trainType : "Multi";
                            const journeyStops = train.trains.flatMap(t => t.to.name);
                            const journeyStopsStr = train.trains[0].from.name + ' → ' + train.trains[train.trains.length - 1].to.name + (journeyStops.length > 1 ? ' (' + (journeyStops.length - 1) + ' arrêts)' : '');

                            const journeyDetails = train.trains.flatMap(t => t.from.name + ' → ' + t.to.name + ' (via ' + t.trainType + ')');
                            const journeyDetailsStr = journeyDetails.join(' • ');

                            let wholeTrainUnavailable = true;
                            let partTrainUnavailable = false;
                            for (const t of train.trains) {
                                if (selectedClass === '1st' && t.price1st) {
                                    price += t.price1st;
                                } else {
                                    price += t.price2nd;
                                }

                                if (t.availableEEATrain) {
                                    wholeTrainUnavailable = false;
                                } else {
                                    partTrainUnavailable = true;
                                }
                            }

                            return (
                                <Card
                                    key={train.id}
                                    className={`p-4 transition-all ${
                                        isSelected ? 'border-primary bg-primary/5' : ''
                                    } ${canSelect ? 'opacity-50' : 'cursor-pointer hover:border-primary/50'}`}
                                    onClick={() => !canSelect && toggleTrain(train.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <Checkbox
                                            checked={isSelected}
                                            disabled={canSelect}
                                            className="mt-1"
                                        />

                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{TRAIN_LOGOS[trainType] || '🚆'}</span>
                                                    <div>
                                                        <Badge variant="outline">{trainType}</Badge>
                                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                                            <span
                                                                className="font-semibold">{journeyStopsStr}
                                                            </span>
                                                            <span
                                                                className="flex items-center gap-1 text-muted-foreground">
                                                                <Clock className="w-3 h-3"/>
                                                                {formatDuration(train.duration)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {(price !== 0) ? (
                                                        <>
                                                            <div className="text-2xl font-bold text-primary">{price}€
                                                            </div>
                                                            <div
                                                                className="text-xs text-muted-foreground">{selectedClass === '1st' ? '1ère' : '2nde'} classe
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground">Non
                                                            disponible</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="w-3 h-3"/>
                                                    <span>{journeyDetailsStr}</span>

                                                    <CalendarIcon className="w-3 h-3"/>
                                                    <span>{train.departureTime.toLocaleTimeString()}</span>
                                                </div>

                                                <div className="text-right">
                                                    {(wholeTrainUnavailable ?
                                                        <X className={"text-destructive"}/> : partTrainUnavailable ?
                                                            <TriangleAlert className={"text-primary"}/> :
                                                            <Check className={"text-secondary"}/>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="mt-6 text-sm text-muted-foreground text-center">
                        {currentTrainPropositions.length} trains proposés
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleNext} size="lg" disabled={(!currentSet) || (currentSet == '')}>
                        {currentTripIndex < currentProject.recurringTrips.length - 1 ? 'Voyage suivant' : 'Continuer'}
                        <ArrowRight className="ml-2 w-4 h-4"/>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SelectTrains;
