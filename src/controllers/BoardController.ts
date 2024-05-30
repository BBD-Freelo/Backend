import { Request, Response } from 'express';
import {Controller, Delete, Get, Patch, Post} from "../decorators";
import {Board, controller, EndpointDefenition, ErrorResponse, MyBoards} from '../interfaces';
import { List } from "../interfaces/entities";
import { DBPool } from '../database';
import {QueryResult} from "pg";
import {AddBoardRequest} from "../interfaces/Requests/addBoard";
import {EditBoardRequest} from "../interfaces/Requests/editBoard";

interface wrapper {
    board_data: Board
}

@Controller('/board')
export class BoardController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    @Get('/:boardId')
    async getBoardData(req: Request, res: Response<Board | ErrorResponse>) {
        const { boardId } = req.params;
        // Grab this from the jwt in the header
        const userId = 3;
        const { rows }: QueryResult<wrapper> = await DBPool.query(`
            SELECT
                CASE
                    WHEN (b."isPublic" = TRUE OR b."userId" = $2 OR $2 = ANY(b."boardCollaborators")) THEN
                        json_build_object(
                                'collaborators', (
                            SELECT json_agg(json_build_object('userId', u."userId", 'userProfilePicture', u."userProfilePicture"))
                            FROM "Users" u
                            WHERE u."userId" IN (
                                    (SELECT b."userId")
                                    UNION
                                    (SELECT UNNEST(b."boardCollaborators"))
                            )
                        ),
                                'lists', ARRAY(
                                        SELECT json_build_object(
                                                       'listId', l."listId",
                                                       'listName', l."listName",
                                                       'tickets', ARRAY(
                                                               SELECT json_build_object(
                                                                              'ticketId', t."ticketId",
                                                                              'user', json_build_object(
                                                                                      'userId', u."userId",
                                                                                      'userProfilePicture', u."userProfilePicture"
                                                                                      ),
                                                                              'assignedUser', COALESCE(
                                                                                      (
                                                                                          SELECT json_build_object(
                                                                                                         'userId', au."userId",
                                                                                                         'userProfilePicture', au."userProfilePicture"
                                                                                                 )
                                                                                          FROM "Users" au
                                                                                          WHERE au."userId" = t."assignedUser"
                                                                                      ), NULL
                                                                                              ),
                                                                              'ticketName', t."ticketName",
                                                                              'ticketDescription', t."ticketDescription",
                                                                              'ticketCreateDate', t."ticketCreateDate",
                                                                              'ticketDueDate', t."ticketDueDate"
                                                                      )
                                                               FROM "Tickets" t
                                                                        JOIN "Users" u ON t."userId" = u."userId"
                                                               WHERE t."listId" = l."listId" AND t."isDeleted" = FALSE
                                                                  )
                                               )
                                        FROM "Lists" l
                                        WHERE l."boardId" = b."boardId" AND l."isDeleted" = FALSE
                                        GROUP BY l."listId", l."listName"
                                         )
                        )
                    END AS "board_data"
            FROM "Boards" b
            WHERE b."boardId" = $1 AND b."isDeleted" = FALSE;
          `, [boardId, userId]);
        if(rows[0].board_data == null) {
            res.status(404).send({
                message: 'Board not found',
                code: 404
            });
            return;
        }
        res.send(rows[0].board_data);
    }

    @Get('/')
    async userBoard(req:Request, res:Response<MyBoards[]>) {
        const userId = 3;
        const { rows }: QueryResult<MyBoards> = await DBPool.query(`
            SELECT
                b."boardId",
                b."boardName"
            FROM
                "Boards" b
                    JOIN "Users" u ON b."userId" = u."userId"
            WHERE
                b."userId" = $1 OR $1 = ANY(b."boardCollaborators")
                AND b."isDeleted" = FALSE;
        `, [userId]);
        res.send(rows);
    }

    @Post('/new')
    async createBoard(req: Request<AddBoardRequest>, res: Response<MyBoards | ErrorResponse>) {
        const userId = 3;
        const { boardCollaborators, boardName, isPublic } = req.body;
        // Will have to grab the users ids based off of their emails
        const { rows }: QueryResult<MyBoards> = await DBPool.query(`
            INSERT INTO "Boards" (
                "userId", "boardCollaborators", "boardName", "isPublic"
            )
            VALUES ($1, $2::INTEGER[], $3, $4)
            RETURNING "boardId", "boardName";
        `, [userId, boardCollaborators, boardName, isPublic]);
        if (rows.length > 0) {
            res.status(201).send(rows[0]);
        } else {
            res.status(500).send({
                message: "Error creating board",
                code: 500
            });
        }
    }

    @Delete('/:boardId')
    async deleteBoard(req: Request, res: Response) {
        const { boardId } = req.params;
        // const userId = req.user.id;
        const userId =3;
        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                WHERE b."boardId" = $1
                  AND (b."userId" = $2 OR $2 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
            )
            , delete_tickets AS (
                DELETE FROM "Tickets" t
                USING "Lists" l
                WHERE t."listId" = l."listId"
                  AND l."boardId" = $1
                  AND EXISTS (SELECT 1 FROM authorized_user)
            )
            , delete_lists AS (
                DELETE FROM "Lists"
                WHERE "boardId" = $1
                  AND EXISTS (SELECT 1 FROM authorized_user)
            )
            DELETE FROM "Boards"
            WHERE "boardId" = $1
              AND EXISTS (SELECT 1 FROM authorized_user)
            RETURNING "boardId";
        `, [boardId, userId]);

        if (rows.length > 0) {
            res.send({ success: true, boardId: rows[0].boardId });
        } else {
            res.status(404).json({ error: 'Board not found' });
        }
    }

    @Patch('/')
    async editBoard(req: Request<EditBoardRequest>, res: Response) {
        const { boardId, boardName, isPublic, boardCollaborators }: EditBoardRequest = req.body;
        const userId = 3;  // Assuming userId is available in req.user
        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                WHERE b."boardId" = $1
                  AND (b."userId" = $4 OR $4 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
            )
            UPDATE "Boards"
            SET "boardName" = COALESCE($2, "boardName"),
                "isPublic" = COALESCE($3, "isPublic"),
                "boardCollaborators" = COALESCE($5::INTEGER[], "boardCollaborators")
            WHERE "boardId" = $1
              AND EXISTS (SELECT 1 FROM authorized_user)
            RETURNING "boardId", "userId", "boardName", "isPublic", "boardCollaborators";
        `, [boardId, boardName, isPublic, userId, boardCollaborators]);

        if (rows.length > 0) {
            const board = rows[0];
            res.send(board);
        } else {
            res.status(404).send({ error: 'Board not found' });
        }
    }

}