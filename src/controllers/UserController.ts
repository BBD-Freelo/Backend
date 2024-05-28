import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import {controller, EndpointDefenition, ErrorResponse} from '../interfaces';
import { DBPool } from '../database';
import {QueryResult} from "pg";
import {User} from "../interfaces/entities/user";

interface wrapper {
    user_data: User[]
}
@Controller('/user')
export class UserController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    ///board/:boardId already does this but maybe we need this??
    @Get('/collaborators/:boardId')
    async Collaborators(req: Request, res: Response<User[] | ErrorResponse>) {
        const { boardId } = req.params;
        const userId = 3; // Grab this from the jwt in the header
        const { rows }: QueryResult<wrapper> = await DBPool.query(`
            WITH cte AS (
                SELECT b."userId", b."boardCollaborators", b."isPublic"
                FROM "Boards" b
                WHERE b."boardId" = $1
            )
            SELECT CASE
                       WHEN EXISTS (
                           SELECT 1
                           FROM "Users" u
                           WHERE u."userId" IN (
                                   (SELECT cte."userId" FROM cte)
                                   UNION
                                   (SELECT UNNEST(cte."boardCollaborators") FROM cte)
                           )
                               AND $2 IN (
                                       (SELECT cte."userId" FROM cte)
                                       UNION
                                       (SELECT UNNEST(cte."boardCollaborators") FROM cte)
                               )
                              OR (SELECT cte."isPublic" FROM cte)
                       )
                           THEN (
                           SELECT json_agg(json_build_object('userId', u."userId", 'userProfilePicture', u."userProfilePicture"))
                           FROM "Users" u
                           WHERE u."userId" IN (
                                   (SELECT cte."userId" FROM cte)
                                   UNION
                                   (SELECT UNNEST(cte."boardCollaborators") FROM cte)
                           )
                       )
                       END AS user_data;
        `, [boardId, userId]);
        if(rows[0].user_data === null) {
            res.status(404).send({
                message: "Board not found",
                code: 404
            });
            return;
        }
        res.send(rows[0].user_data);
    }

}