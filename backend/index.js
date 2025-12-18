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

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 4001;

app.set('trust proxy', 1);

app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 20,
    delayMs: () => 500
});

app.use(speedLimiter);

const sncfRoutes = require("./routes/sncf_api");
app.use("/sncf", apiLimiter, sncfRoutes);

const pdfRoutes = require("./routes/pdf_generator");
app.use("/pdf_generator", apiLimiter, pdfRoutes);

app.use("/test", (req, res) => {
    res.json({ message: "API is working!" });
})

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
