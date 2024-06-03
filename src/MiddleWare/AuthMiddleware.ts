import {NextFunction, Request, Response} from "express";
import {getCognitoUser} from "../util/getUser";

export async function Auth(req: Request, res: Response, next: NextFunction) {
    if (req.method== 'OPTIONS'){
        next();
        return;
    }
    try {
        await getCognitoUser(`${req.headers.authorization}`);
        next();
    } catch (err) {
        res.status(401).json({
            error: 'Unauthorized'
        });
    }
}