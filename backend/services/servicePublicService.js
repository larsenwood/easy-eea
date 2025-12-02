import fs from "fs";

let cache = {
    stations: null,
    trajets: null,
    lastLoad: 0
};

const CACHE_DURATION_MS = 5 * 60 * 1000;

function loadJSON(path) {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function refreshCache() {
    const now = Date.now();

    if (!cache.lastLoad || now - cache.lastLoad > CACHE_DURATION_MS) {
        cache.stations = loadJSON("./data/stations_origin_merged.json");
        cache.trajets = loadJSON("./data/travels.json");
        cache.lastLoad = now;

        console.log(`- ${cache.stations.length} stations chargées`);
        console.log(`- ${Object.keys(cache.trajets).length} trajets chargés`);
    }
}

refreshCache();

/**
 * Retourne la liste des service_public_name pour une station donnée
 * @param {string} stationName - Nom officiel de la station (champ "name")
 * @returns {string[]} Liste des noms de service public associés
 */
export function getServicePublicNames(stationName) {
    refreshCache();

    const station = cache.stations.find(
        (s) => s.name.toLowerCase() === stationName.toLowerCase()
    );

    return station ? station.service_public_name : [];
}

/**
 * Trouve les trajets entre deux stations (par leur nom officiel) pour un mode donné
 * @param {string} stationOrigine
 * @param {string} stationDestination
 * @param {string} mode
 * @returns {Array<Object>}
 */
export function getTrajetsFromStationNames(stationOrigine, stationDestination, mode) {
    refreshCache();

    const getServiceNames = (name) =>
        cache.stations.find(
            (s) => s.name.toLowerCase() === name.toLowerCase()
        )?.service_public_name || [];

    const origines = getServiceNames(stationOrigine);
    const destinations = getServiceNames(stationDestination);

    const TRANS_NAMES = {
        'TGV INOUI': 'TGV',
        'Intercités': 'Intercité'
    }

    let trajets = [];

    for (const t of Object.values(cache.trajets)) {
        if (origines.includes(t.origine) && t.service === TRANS_NAMES[mode]) {
            for (const dest of destinations) {
                if (t.destination.startsWith(dest)) {
                    trajets.push(t);
                }
            }
        }
    }

    console.log(trajets);

    return trajets;
}
