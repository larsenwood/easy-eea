import {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {CalendarIcon, Check, Clock, MapPin, TriangleAlert, X} from "lucide-react";
import {toast} from "sonner";
import {Waveform} from "ldrs/react";
import "ldrs/react/Waveform.css";
import {TrainOption, TravelProject} from "@/types/project";

const TRAIN_LOGOS: Record<string, string> = {
    "TGV INOUI": "🚄",
    TER: "🚆",
    "Intercités": "🚈",
};

const formatDuration = (duration: number) => {
    if (duration < 3600) return Math.floor(duration / 60) + " min";
    const h = Math.floor(duration / 3600);
    const m = Math.floor((duration % 3600) / 60);
    return h + "h" + (m ? " " + m + "min" : "");
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: string;
    time: string;
    fromHome: boolean;
    currentProject: TravelProject;
    onConfirm: (train: TrainOption) => void;
}

export default function SelectTrainDialog({
                                              open,
                                              onOpenChange,
                                              date,
                                              time,
                                              fromHome,
                                              currentProject,
                                              onConfirm,
                                          }: Props) {
    const [trainOptions, setTrainOptions] = useState<TrainOption[]>([]);
    const [selectedTrainId, setSelectedTrainId] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<"1st" | "2nd">("2nd");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        const fetchJourneys = async () => {
            setLoading(true);
            try {
                const url = new URL("/api/sncf/journeys");
                url.searchParams.set(
                    "from",
                    fromHome ? currentProject.homeStation.id : currentProject.studyStation.id
                );
                url.searchParams.set(
                    "to",
                    fromHome ? currentProject.studyStation.id : currentProject.homeStation.id
                );

                const when = new Date(date + "T" + time);
                url.searchParams.set("when", when.toISOString());

                const res = await fetch(url.toString());
                const data = await res.json();

                let i = 0;
                setTrainOptions(
                    data.map((e: any) => ({
                        id: (++i).toString(),
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
                        ...e,
                    }))
                );
            } catch (err) {
                console.error(err);
                toast.error("Erreur lors du chargement des trains");
            } finally {
                setLoading(false);
            }
        };

        fetchJourneys();
    }, [open, date, time, fromHome, currentProject]);

    const handleConfirm = () => {
        const selected = trainOptions.find((t) => t.id === selectedTrainId);
        if (!selected) {
            toast.error("Sélectionnez un train");
            return;
        }
        for (const train of selected.trains) {
            if (!train.availableEEATrain) train.selectedClass = '2nd'
            else train.selectedClass = selectedClass;
        }

        onConfirm(selected);
        onOpenChange(false);
        setSelectedTrainId("");
    };

    const changeClass = (newClass: "1st" | "2nd") => setSelectedClass(newClass);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Sélectionner un train</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Classe préférée</h2>
                        <RadioGroup
                            value={selectedClass}
                            onValueChange={(v) => changeClass(v as "1st" | "2nd")}
                            className="flex gap-4"
                        >
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

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <Waveform size="60" stroke="3.5" speed="1" color="white"/>
                            <div className="text-muted-foreground">
                                Chargement des propositions de trains...
                            </div>
                        </div>
                    )}

                    {!loading &&
                        trainOptions.map((train) => {
                            const isSelected = selectedTrainId === train.id;
                            const trainType =
                                train.trains.length === 1 ? train.trains[0].trainType : "Multi";
                            const journeyStopsStr =
                                train.trains[0].from.name +
                                " → " +
                                train.trains[train.trains.length - 1].to.name;

                            let totalPrice = 0;
                            let wholeTrainUnavailable = true;
                            let partTrainUnavailable = false;

                            for (const t of train.trains) {
                                totalPrice +=
                                    selectedClass === "1st"
                                        ? t.price1st || t.price2nd
                                        : t.price2nd;
                                if (t.availableEEATrain) wholeTrainUnavailable = false;
                                else partTrainUnavailable = true;
                            }

                            return (
                                <Card
                                    key={train.id}
                                    className={`p-4 transition-all ${
                                        isSelected ? "border-primary bg-primary/5" : ""
                                    } cursor-pointer hover:border-primary/50`}
                                    onClick={() => setSelectedTrainId(train.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <Checkbox checked={isSelected} className="mt-1"/>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">
                                                        {TRAIN_LOGOS[trainType] || "🚆"}
                                                    </span>
                                                    <div>
                                                        <Badge variant="outline">{trainType}</Badge>
                                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                                            <span className="font-semibold">
                                                                {journeyStopsStr}
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
                                                    <div className="text-2xl font-bold text-primary">
                                                        {totalPrice}€
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {selectedClass === "1st"
                                                            ? "1ère classe"
                                                            : "2nde classe"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="flex items-center justify-between text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3"/>
                                                    <span>
                                                        {train.trains
                                                            .map(
                                                                (t: any) =>
                                                                    t.from.name +
                                                                    " → " +
                                                                    t.to.name +
                                                                    " (" +
                                                                    t.trainType +
                                                                    ")"
                                                            )
                                                            .join(" • ")}
                                                    </span>
                                                    <CalendarIcon className="w-3 h-3"/>
                                                    <span>
                                                        {train.departureTime.toLocaleTimeString()}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    {wholeTrainUnavailable ? (
                                                        <X className="text-destructive"/>
                                                    ) : partTrainUnavailable ? (
                                                        <TriangleAlert className="text-primary"/>
                                                    ) : (
                                                        <Check className="text-secondary"/>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                </div>

                <div className="flex justify-end mt-4">
                    <Button onClick={handleConfirm} disabled={!selectedTrainId}>
                        Confirmer
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
