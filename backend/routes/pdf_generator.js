const express = require("express");
const router = express.Router();
const fontkit = require('@pdf-lib/fontkit');
const fs = require("fs");
const path = require("path");
const {PDFDocument, rgb, degrees} = require('pdf-lib');

function splitAndReverse(arr, size = 20) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }

    const reversedChunks = chunks.map(chunk => chunk.reverse());

    return reversedChunks.reverse();
}

async function generatePDF(originalPath, journeys) {
    if (journeys.length === 0) {
        console.warn("Aucun trajet fourni !");
        return;
    }
    const validDates = journeys
        .map(o => new Date(o.date))
        .filter(d => !isNaN(d));

    if (validDates.length === 0) {
        console.warn("Aucune date valide trouvée !");
        return;
    }

    const latest = new Date(Math.max(...validDates));

    latest.setMonth(latest.getMonth() - 2);
    const l = splitAndReverse(journeys);
    let pages = [];
    for (const list_j of l) {
        const p = await generatePDFPage(originalPath, list_j, latest);
        if (p === null) continue;
        pages.push(p);
    }
    return pages;
}

async function modifyEEAPdf(pdfDoc) {
    const fontBytes = fs.readFileSync(path.join(__dirname, "../static/AvenirLTProHeavy.otf"));
    const avenirLTPro = await pdfDoc.embedFont(fontBytes);
    const fontBytes2 = fs.readFileSync(path.join(__dirname, "../static/Calibri.ttf"));
    const calibri = await pdfDoc.embedFont(fontBytes2);

    const page = pdfDoc.getPages()[0];
    const {height} = page.getSize();

    const pngImageBytes = fs.readFileSync(path.join(__dirname, "../static/logo_easyeea.png"));
    const pngImage = await pdfDoc.embedPng(pngImageBytes)
    const pngDims = pngImage.scale(0.25)

    page.drawImage(pngImage, {
        x: 50,
        y: height - pngDims.height - 50,
        width: pngDims.width,
        height: pngDims.height,
    })

    page.drawText("Vous trouverez sur ce document vos trajets non-éligibles à la réduction EEA de SNCF Voyageurs et du Ministère des Transports.", {
        x: 55,
        y: height - pngDims.height - 50,
        size: 12,
        font: avenirLTPro,
        color: rgb(0, 0, 0),
        maxWidth: 475,
        lineHeight: 15
    });
    page.drawText("Vous pouvez présenter cette liste à un vendeur en gare (comme pour vos trajets éligibles) ou les acheter en ligne (sur SNCF Connect ou sur ter.sncf.com).", {
        x: 55,
        y: height - pngDims.height - 50 - 15 * 2 - 20,
        size: 12,
        font: avenirLTPro,
        color: rgb(0, 0, 0),
        maxWidth: 475,
        lineHeight: 15
    });
    page.drawText("/!\\ Seuls sont listés les trajets du dossier que vous avez téléchargé. Aucun minimum de trajets n'est requis pour acheter cette liste. Il en va de même pour le délai de 60 jours pour les trajets éligibles à la réduction EEA.", {
        x: 55,
        y: height - pngDims.height - 50 - 15 * 4 - 40,
        size: 12,
        font: avenirLTPro,
        color: rgb(1, 0, 0),
        maxWidth: 475,
        lineHeight: 15
    });
    page.drawText("Toute ressemblance avec un document produit par SNCF Voyageurs, le Groupe SNCF ou le ministère chargé des Transports serait purement fortuite et ne saurait être imputable à EasyEEA.", {
        x: 55,
        y: 70,
        size: 6,
        font: calibri,
        maxWidth: 475,
        lineHeight: 7
    });

    const txt = ["EasyEEA revendique la simplicité d'utilisation de la réduction EEA pour tous ses bénéficiaires, ce qui devrait notamment impliquer l'abandon de l'obligation d'achat en gare des billets avec", "cette réduction (alors que le dossier à déposer auprès du ministère chargé des transports est à remplir sur demarches-simplifiees.fr), la diversification des modes d'achat (notamment via SNCF", "Connect et le 3635), l'élargissement du délai maximum pour réaliser le voyage (2 mois actuellement) ainsi que le retrait de l'achat par lots d'au moins 10 billets pour bénéficier de la réduction."];
    let x = 55;
    let i = 0;
    for (const t of txt) {
        for (const char of t) {
            page.drawText(char, {x, y: 60 - i * 7, size: 6, font: calibri});
            x += calibri.widthOfTextAtSize(char, 6);
        }
        ++i;
        x = 55;
    }
}

async function generatePDFPage(originalPath, journeys, validityDate) {
    const templatePath = path.join(__dirname, originalPath);
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    pdfDoc.registerFontkit(fontkit);
    const fontBytes = fs.readFileSync(path.join(__dirname, "../static/OpenSans.ttf"));
    const helveticaFont = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.getPages()[0];
    const {height} = page.getSize();

    if (originalPath.includes("eea-formulaire2.pdf")) {
        await modifyEEAPdf(pdfDoc);
    }

    const formatter = new Intl.DateTimeFormat("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"});

    const startY = 505;
    const rowHeight = 21;
    const dateX = 100, originX = 162.5, destinationX = 275, timeX = 400;

    page.drawText("Date de début de validité : " + formatter.format(validityDate), {
        x: 55,
        y: height - 760,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
    });

    journeys.slice(0, 20).forEach((j, i) => {
        const currentY = height - (startY - ((i - 1 + (10 - journeys.length)) * rowHeight));
        let date = new Date(j.date);
        // date.setDate(date.getDate());
        const formattedDate = formatter.format(date);

        page.drawText(formattedDate, {x: dateX, y: currentY, size: 10, font: helveticaFont});
        page.drawText(j.from.name, {x: originX, y: currentY, size: 10, font: helveticaFont});
        page.drawText(j.to.name, {x: destinationX, y: currentY, size: 10, font: helveticaFont});

        const heure = new Date(
            j.departure_time.replace(
                /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                "$1-$2-$3T$4:$5:$6"
            )
        ).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
        const TRANS_CLASSE = {
            "2nd": "2nd",
            "1st": "1ère",
        }

        page.drawText(`${heure} (${TRANS_CLASSE[j.selectedClass || '2nd']} classe)`, {
            x: timeX,
            y: currentY,
            size: 10,
            font: helveticaFont
        });
    });

    return page;
}

router.post("/generate", async (req, res) => {
    try {
        const {journeys, validityDate} = req.body;

        if (!journeys || !validityDate) {
            return res.status(400).json({error: "Missing journeys or validityDate"});
        }
        const pdfDoc = await PDFDocument.create();
        const filledJourneys = [];
        const filledJourneys2 = [];

        for (const j of journeys) {
            if (j.trainOptionSelected.trains.length === 0) continue;
            for (const t of j.trainOptionSelected.trains) {
                t.date = j.date;
                if ((!t.availableEEATrain) || (t.price2nd === 0)) {
                    filledJourneys2.push(t)
                } else {
                    filledJourneys.push(t);
                }
            }
        }

        /*if (filledJourneys.length < 10) {
            const last = Object.assign({}, filledJourneys[filledJourneys.length - 1]);
            last.selectedClass = '2nd';
            while (filledJourneys.length < 12) filledJourneys.push(last);
        }*/

        const pdfPages = await generatePDF('../static/eea-formulaire.pdf', filledJourneys);
        const pdfPages2 = await generatePDF('../static/eea-formulaire2.pdf', filledJourneys2);

        for (const p of pdfPages) {
            const [copiedPage] = await pdfDoc.copyPages(p.doc, [0]);
            pdfDoc.addPage(copiedPage);
        }
        if (pdfPages2) {
            for (const p of pdfPages2) {
                const [copiedPage] = await pdfDoc.copyPages(p.doc, [0]);
                pdfDoc.addPage(copiedPage);
            }
        }
        const generatedPdfBytes = await pdfDoc.save();

        res.setHeader("Content-Disposition", 'attachment; filename="attestation.pdf"');
        res.contentType("application/pdf");
        res.send(Buffer.from(generatedPdfBytes));
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});

/*router.get("/generate2", async (req, res) => {
    try {
        const templatePath = path.join(__dirname, "../static/eea-formulaire2.pdf");
        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        pdfDoc.registerFontkit(fontkit);
        const fontBytes = fs.readFileSync(path.join(__dirname, "../static/AvenirLTProHeavy.otf"));
        const avenirLTPro = await pdfDoc.embedFont(fontBytes);
        const fontBytes2 = fs.readFileSync(path.join(__dirname, "../static/Calibri.ttf"));
        const calibri = await pdfDoc.embedFont(fontBytes2);

        const page = pdfDoc.getPages()[0];
        const { height } = page.getSize();

        const pngImageBytes = fs.readFileSync(path.join(__dirname, "../static/logo_easyeea.png"));
        const pngImage = await pdfDoc.embedPng(pngImageBytes)
        const pngDims = pngImage.scale(0.25)

        page.drawImage(pngImage, {
            x: 50,
            y: height - pngDims.height - 50,
            width: pngDims.width,
            height: pngDims.height,
        })

        page.drawText("Vous trouverez sur ce document vos trajets non-éligibles à la réduction EEA de SNCF Voyageurs et du Ministère des Transports.", { x: 55, y: height - pngDims.height - 50, size: 12, font: avenirLTPro, color: rgb(0, 0, 0), maxWidth: 475, lineHeight: 15 });
        page.drawText("Vous pouvez présenter cette liste à un vendeur en gare (comme pour vos trajets éligibles) ou les acheter en ligne (sur SNCF Connect ou sur ter.sncf.com).", { x: 55, y: height - pngDims.height - 50 - 15*2 - 20, size: 12, font: avenirLTPro, color: rgb(0, 0, 0), maxWidth: 475, lineHeight: 15 });
        page.drawText("/!\\ Seuls sont listés les trajets du dossier que vous avez téléchargé. Aucun minimum de trajets n'est requis pour acheter cette liste. Il en va de même pour le délai de 60 jours pour les trajets éligibles à la réduction EEA.", { x: 55, y: height - pngDims.height - 50 - 15*4 - 40, size: 12, font: avenirLTPro, color: rgb(1, 0, 0), maxWidth: 475, lineHeight: 15 });
        page.drawText("Toute ressemblance avec un document produit par SNCF Voyageurs, le Groupe SNCF ou le ministère chargé des Transports serait purement fortuite et ne saurait être imputable à EasyEEA.", { x: 55, y: 70, size: 6, font: calibri, maxWidth: 475, lineHeight: 7 });

        const txt = ["EasyEEA revendique la simplicité d'utilisation de la réduction EEA pour tous ses bénéficiaires, ce qui devrait notamment impliquer l'abandon de l'obligation d'achat en gare des billets avec",  "cette réduction (alors que le dossier à déposer auprès du ministère chargé des transports est à remplir sur demarches-simplifiees.fr), la diversification des modes d'achat (notamment via SNCF", "Connect et le 3635), l'élargissement du délai maximum pour réaliser le voyage (2 mois actuellement) ainsi que le retrait de l'achat par lots d'au moins 10 billets pour bénéficier de la réduction."];
        let x = 55;
        let i = 0;
        for (const t of txt) {
            for (const char of t) {
                page.drawText(char, { x, y: 60 - i*7, size: 6, font: calibri });
                x += calibri.widthOfTextAtSize(char, 6);
            }
            ++i;
            x = 55;
        }

        res.setHeader("Content-Disposition", 'attachment; filename="attestation.pdf");')
        res.contentType("application/pdf");
        const generatedPdfBytes = await pdfDoc.save();
        res.send(Buffer.from(generatedPdfBytes));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})*/

module.exports = router;