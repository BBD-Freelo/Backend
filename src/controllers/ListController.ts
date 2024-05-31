import { Request, Response } from 'express';
import {Controller, Delete, Get, Patch, Post} from "../decorators";
import {controller, EndpointDefenition, ErrorResponse} from '../interfaces';
import { DBPool } from '../database';
import {AddListRequest} from "../interfaces/Requests/addList";
import {AddListResponse} from "../interfaces/Responses/addList";
import {QueryResult} from "pg";
import {EditListRequest} from "../interfaces/Requests/editList";
import {DeleteResponse} from "../interfaces/Responses/delete";
import {PatchResponse} from "../interfaces/Responses/patch";

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

    @Delete('/:listId')
    async deleteList(req: Request, res: Response<DeleteResponse>) {
        const { listId } = req.params;
        const userId = 3;
        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                JOIN "Lists" l ON b."boardId" = l."boardId"
                WHERE l."listId" = $1
                  AND (b."userId" = $2 OR $2 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
                  AND l."isDeleted" = FALSE
            )
            , delete_tickets AS (
                DELETE FROM "Tickets" t
                WHERE t."listId" = $1
                  AND EXISTS (SELECT 1 FROM authorized_user)
            )
            DELETE FROM "Lists"
            WHERE "listId" = $1
              AND EXISTS (SELECT 1 FROM authorized_user)
            RETURNING "listId";
        `, [listId, userId]);

        if (rows.length > 0) {
            res.send({ success: true, listId: rows[0].listId });
        } else {
            res.status(404).send({ success: false });
        }
    }

    @Patch('/')
    async editList(req: Request<EditListRequest>, res: Response<PatchResponse>) {
        const { listId, listName }: EditListRequest = req.body;
        const userId = 3;  // Assuming userId is available in req.user

        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                JOIN "Lists" l ON b."boardId" = l."boardId"
                WHERE l."listId" = $1
                  AND (b."userId" = $3 OR $3 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
                  AND l."isDeleted" = FALSE
            )
            UPDATE "Lists"
            SET "listName" = COALESCE($2, "listName")
            WHERE "listId" = $1
              AND EXISTS (SELECT 1 FROM authorized_user)
            RETURNING "listId", "boardId", "listName", "listCreateDate";
        `, [listId, listName, userId]);

        if (rows.length > 0) {
            const list = rows[0];
            res.send({
                success: true,
                listId: rows[0].listId
            });
        } else {
            res.status(404).send({ success: false });
        }
    }
}