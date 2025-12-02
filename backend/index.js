if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config();
        console.log('Loaded .env variables');
    } catch (err) {
        // ignore if dotenv not available
    }
}

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

const sncfRoutes = require("./routes/sncf_api");
app.use("/sncf", sncfRoutes);

const pdfRoutes = require("./routes/pdf_generator");
app.use("/pdf_generator", pdfRoutes);

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
