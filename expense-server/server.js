require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const mongoose = require('mongoose');
const authRoutes = require('./src/routes/authRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const rbacRoutes=require('./src/routes/rbacRoutes');
const profileRoutes=require('./src/routes/profileRoutes');
const personalFinanceRoutes = require('./src/routes/personalFinanceRoutes');

mongoose.connect(process.env.MONGO_DB_CONNECTION_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((error) => console.log('Error Connecting to Database: ', error));

const corsOption = {
    origin: (origin, callback) => {
        const isLocalDevelopmentOrigin =
            process.env.NODE_ENV !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
        if (!origin || origin === process.env.CLIENT_URL || isLocalDevelopmentOrigin) {
            return callback(null, true);
        }
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
};

const app = express();

app.use(cors(corsOption));

app.use(express.json());
app.use(cookieParser()); // Middleware

app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/users', rbacRoutes);
app.use('/profile', profileRoutes);
app.use('/personal-finance', personalFinanceRoutes);

const port = Number(process.env.PORT) || 5001;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});