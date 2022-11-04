import express, {Request, Response, NextFunction} from 'express';
import { AppError } from './errors';
import { twinsMiddleware } from './twins';
import cookieParser from 'cookie-parser';

export async function getApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    if (process.env.PUBLIC) {
        app.use(express.static(process.env.PUBLIC));
    }
    app.use('/', await twinsMiddleware());
    app.use((err: AppError, _req: Request, res: Response, next: NextFunction) => {
        if (!err) {
            return next();
        }
        const error = {
            message: err.message,
            stack: process.env.NODE_ENV === 'development'
                ? err.stack
                : undefined
        };
        return res.status(err.status || 500).send({ error });
    });
    return app;
}

