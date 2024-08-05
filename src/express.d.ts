// src/express.d.ts
import * as multer from 'multer';
import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            file?: multer.File; // Add the file property
        }
    }
}
