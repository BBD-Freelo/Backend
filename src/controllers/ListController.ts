import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import {controller, EndpointDefenition, ErrorResponse} from '../interfaces';
import { DBPool } from '../database';
import {AddListRequest} from "../interfaces/Requests/addList";
import {AddListResponse} from "../interfaces/Responses/addList";
import {QueryResult} from "pg";

@Controller('/list')
export class ListController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    @Post('/new')
    async addList(req: Request<AddListRequest>, res: Response<AddListResponse | ErrorResponse>) {
        const userId = 3;
        const { boardId, listName } =req.body;
        const { rows }: QueryResult<AddListResponse> = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                WHERE b."boardId" = $1
                  AND (b."userId" = $2 OR $2 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
            )
            INSERT INTO "Lists" (
                "userId", "boardId", "listName", "listCreateDate"
            )
            SELECT $2, $1, $3, CURRENT_TIMESTAMP
            FROM authorized_user
            RETURNING "listId", "listName";
        `, [boardId, userId, listName]);

        if (rows.length > 0) {
            res.send(rows[0]);
        } else {
            res.status(404).send({
                message: "Board not found",
                code: 404
            });
        }
    }

}