export interface Station {
    id: string;
    name: string;
    service_public_name: string;
}

export interface RecurringTrip {
    id: string;
    dayOfWeek: number;
    time: string;
    fromHome: boolean;
    trainOptionSelected?: TrainOption;
}

export interface TrainOption {
    id: string;
    departureTime: Date;
    arrivalTime: Date;
    departure_time: string;
    arrival_time: string;
    duration: number;
    trains: Train[];
}

export interface Train {
    id: string;
    trainType: string;
    from: Station;
    to: Station;
    departure_time: string;
    arrival_time: string;
    duration: number;
    price1st?: number;
    price2nd?: number;
    stops?: string[];
    selectedClass?: '1st' | '2nd';
    availableEEATrain: boolean;
}

export interface Journey {
    id: string;
    date: Date;
    recurringTripId: string;
    trainOptionSelected: TrainOption;
    fromHome: boolean;
    time: string;
}

export interface AttestationFolder {
    id: string;
    name: string;
    trips: Journey[];
    startDate: Date;
    endDate: Date;
}

export interface TravelProject {
    id: string;
    homeStation: Station;
    studyStation: Station;
    recurringTrips: RecurringTrip[];
    attestationFolders: AttestationFolder[];
    createdAt: Date;
    startDate: Date;
    endDate: Date;
}
