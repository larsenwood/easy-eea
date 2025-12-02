const express = require("express");
const {getTrajetsFromStationNames} = require("../services/servicePublicService");
const router = express.Router();

let requestCounter = 0;

const API_KEY = process.env.SNCF_API_KEY || "";
const API_BASE = process.env.SNCF_API_BASE || "https://api.navitia.io/v1/";

const AVAILABLE_COMMERCIALMODES = [
    {
        "id": "commercial_mode:IC",
        "name": "Intercités"
    },
    {
        "id": "commercial_mode:OUI",
        "name": "TGV INOUI"
    }
];

function getFare(from, to, when, trainType) {
    let journeys = getTrajetsFromStationNames(from, to, trainType);

    if (journeys.length === 0) {
        return [0, 0];
    } else if (journeys.length === 1) {
        let journey = journeys[0];
        return [Number(journey.classe2) || 0, Number(journey.classe1) || 0];
    } else {
        const valid = journeys
            .map(j => ({...j, _classe2: Number(j.classe2), _classe1: Number(j.classe1)}))
            .filter(j => Number.isFinite(j._classe2));

        if (valid.length === 0) {
            return [0, 0];
        }

        const bestPrice = Math.min(...valid.map(j => j._classe2));
        const bestJourney = valid.find(j => j._classe2 === bestPrice);
        if (!bestJourney) return [0, 0];

        return [bestJourney._classe2, bestJourney._classe1 || 0];
    }
}

/**
 * Récupère les trajets SNCF entre deux stations.
 * @param {string} from - Code station de départ
 * @param {string} to - Code station d'arrivée
 * @param {string} when - Date ISO (ex: 2025-10-07T15:30)
 * @param {boolean} dateRepresents - true = arrival / false = departure
 */
async function getJourneys(from, to, when, dateRepresents) {
    if (!API_KEY) {
        throw new Error('SNCF_API_KEY non définie. Configurez la variable d\'environnement SNCF_API_KEY.');
    }

    const params = new URLSearchParams({
        from: from,
        to: to,
        datetime: when,
        depth: "3",
        min_nb_journeys: "5",
        datetime_represents: dateRepresents ? "arrival" : "departure"
    });

    const url = `${API_BASE}coverage/sncf/journeys?${params.toString()}`;

    const response = await fetch(url, {
        headers: {
            Authorization: "Basic " + Buffer.from(`${API_KEY}:`).toString("base64")
        }
    });

    if (!response.ok) {
        throw new Error(`Erreur API SNCF: ${response.statusText}`);
    }

    const data = await response.json();
    const list = [];

    for (const jn of data.journeys || []) {
        const j = {
            id: jn.id,
            departure_time: jn.departure_date_time,
            arrival_time: jn.arrival_date_time,
            departure: from,
            arrival: to,
            duration: jn.duration,
            trains: []
        };

        for (const section of jn.sections || []) {
            if (section.duration === 0 || section.display_informations?.commercial_mode.length === 0) {
                continue;
            }
            const trainTypeID = (section.links?.find(link => link.type === "commercial_mode")?.id) || "Unknown";
            const findTrainType = AVAILABLE_COMMERCIALMODES.find(mode => mode.id === trainTypeID);
            const trainType = section.display_informations?.commercial_mode || "";

            let train = {
                from: {
                    id: section.from?.stop_point?.id,
                    name: section.from?.stop_point?.name
                },
                to: {
                    id: section.to?.stop_point?.id,
                    name: section.to?.stop_point?.name
                },
                departure_time: section.departure_date_time,
                arrival_time: section.arrival_date_time,
                trainNumber: section.display_informations?.headsign || section.display_informations?.code || "Inconnu",
                duration: section.duration,
                trainType: trainType,
                availableEEATrain: true
            }

            if (!findTrainType) {
                train.availableEEATrain = false;
            }

            if (train.duration !== 0 && train.trainType.length > 0) {
                const [price2nd, price1st] = getFare(section.from?.stop_point?.name, section.to?.stop_point?.name, when, trainType);
                train.price1st = price1st;
                train.price2nd = price2nd;
                j.trains.push(train);
            }
        }

        list.push(j);
    }

    return list;
}

/*getJourneys('stop_area:SNCF:87484006', 'stop_area:SNCF:87571240', '2025-10-07T20:30', false).then(data => {
    for (const jn of data) {
        console.log(jn.trains);
    }
}).catch(err => console.error(err));*/

router.get("/journeys", async (req, res) => {
    const {from, to, when, dateRepresents} = req.query;

    if (!from || !to || !when) {
        return res.status(400).json({error: "Paramètres manquants (from, to, when)"});
    }

    try {
        const journeys = await getJourneys(from, to, when, dateRepresents === "true");
        res.json(journeys);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }

    requestCounter++;
    console.log(`Requête SNCF API #${requestCounter}`);
});

module.exports = router;