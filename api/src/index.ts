import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import passport from 'passport';
import mongoose from 'mongoose';

import './config/passport';
import authRouter     from './routes/auth';
import projectsRouter from './routes/projects';
import entriesRouter  from './routes/entries';
import summaryRouter  from './routes/summary';
import userRouter     from './routes/user';
import tasksRouter    from './routes/tasks';

const app = express();

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => { console.error('MongoDB error:', err); process.exit(1); });

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(
  session({
    secret:           process.env.SESSION_SECRET || 'dev_secret',
    resave:           false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI! }),
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth',          authRouter);
app.use('/api/projects',  projectsRouter);
app.use('/api/entries',   entriesRouter);
app.use('/api/summary',   summaryRouter);
app.use('/api/user',      userRouter);
app.use('/api/tasks',     tasksRouter);

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
