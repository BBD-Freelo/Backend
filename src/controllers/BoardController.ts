import { Request, Response } from 'express';
import {Controller, Delete, Get, Patch, Post} from "../decorators";
import {Board, controller, EndpointDefenition, ErrorResponse, MyBoards} from '../interfaces';
import { List } from "../interfaces/entities";
import { DBPool } from '../database';
import {QueryResult} from "pg";
import {AddBoardRequest} from "../interfaces/Requests/addBoard";
import {EditBoardRequest} from "../interfaces/Requests/editBoard";
import {DeleteResponse} from "../interfaces/Responses/delete";
import {EditBoardResponse} from "../interfaces/Responses/editBoard.";
import { getUserDB } from "../util/getUserDB";
import {User} from "../interfaces/entities/user";

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
        const userId = await getUserDB(`${req.headers.authorization}`);
        const { rows }: QueryResult<wrapper> = await DBPool.query(`
            SELECT
                CASE
                    WHEN (b."isPublic" = TRUE OR b."userId" = $2 OR $2 = ANY(b."boardCollaborators")) THEN
                        json_build_object(
                                'collaborators', (
                            SELECT json_agg(json_build_object('userId', u."userId", 'userProfilePicture', u."userProfilePicture", 'email', u."email"))
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
                                                                                      'userProfilePicture', u."userProfilePicture",
                                                                                      'email', u."email"
                                                                                      ),
                                                                              'assignedUser', COALESCE(
                                                                                      (
                                                                                          SELECT json_build_object(
                                                                                                         'userId', au."userId",
                                                                                                         'userProfilePicture', au."userProfilePicture",
                                                                                                         'email', au."email"
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
            res.send({
                collaborators: [],
                lists: []
            })
            return;
        }
        res.send(rows[0].board_data);
    }

    @Get('/')
    async userBoard(req:Request, res:Response<MyBoards[]>) {
        const userId = await getUserDB(`${req.headers.authorization}`);
        const { rows }: QueryResult<MyBoards> = await DBPool.query(`
            SELECT
                b."boardId",
                b."boardName",
                JSON_AGG(
                        json_build_object(
                                'userId', u."userId",
                                'userProfilePicture', u."userProfilePicture",
                                'email', u."email",
                                'isOwner', CASE WHEN b."userId" = u."userId" THEN true ELSE false END
                        )
                ) AS "boardCollaborators"
            FROM
                "Boards" b
                    JOIN "Users" u ON u."userId" = ANY(b."boardCollaborators") OR b."userId" = u."userId"
            WHERE
                b."userId" = $1 OR $1 = ANY(b."boardCollaborators")
                AND b."isDeleted" = FALSE
            GROUP BY
                b."boardId";
        `, [userId]);
        if (rows.length === 0) {
            res.send([]);
            return;
        }
        res.send(rows);
    }

    @Post('/new')
    async createBoard(req: Request<AddBoardRequest>, res: Response<MyBoards | ErrorResponse>) {
        const userId = await getUserDB(`${req.headers.authorization}`);
        const { boardCollaborators, boardName, isPublic } = req.body;

        if(boardName === "" || boardName === undefined) {
            res.status(400).send({
                message: "board name is required",
                code: 400
            });
            return;
        }

        if(boardCollaborators === undefined) {
            res.status(400).send({
                message: "error, undefined value for boardCollaborators",
                code: 400
            });
            return;
        }

        const { rows } = await DBPool.query(`
            WITH collaborator_ids AS (
                SELECT "userId" FROM "Users" WHERE "email" = ANY($1::TEXT[])
            ), inserted_board AS (
                INSERT INTO "Boards" ("userId", "boardCollaborators", "boardName", "isPublic")
                    VALUES ($2, (SELECT ARRAY_AGG("userId") FROM collaborator_ids), $3, $4)
                    RETURNING "boardId", "boardName"
            )
            SELECT * FROM inserted_board;
        `, [boardCollaborators, userId, boardName, isPublic === undefined ? false : isPublic]);
        if (rows.length > 0) {
            res.send(rows[0]);
        } else {
            res.status(500).send({
                message: "Error creating board",
                code: 500
            });
        }
    }

    @Delete('/remove/:boardId')
    async deleteBoard(req: Request, res: Response<DeleteResponse>) {
        const { boardId } = req.params;
        const userId = await getUserDB(`${req.headers.authorization}`);
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
            res.status(404).json({ success: false });
        }
    }

    @Patch('/edit')
    async editBoard(req: Request<EditBoardRequest>, res: Response<EditBoardResponse | ErrorResponse>) {
        const { boardId, boardName, boardCollaborators }: EditBoardRequest = req.body;
        if(boardName === "" || boardName === undefined) {
            res.status(400).send({
                message: "board name is cannot be empty",
                code: 400
            });
            return;
        }
        const userId = await getUserDB(`${req.headers.authorization}`);
        const { rows }: QueryResult<EditBoardResponse> = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                WHERE b."boardId" = $1
                  AND (b."userId" = $3 OR $3 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
            ), new_collaborators AS (
                SELECT ARRAY_AGG("userId") AS new_ids
                FROM "Users"
                WHERE "email" = ANY($4::TEXT[])
                  AND "isDeleted" = FALSE
            ), updated_board AS (
                UPDATE "Boards"
                    SET "boardName" = COALESCE($2, "boardName"),
                        "boardCollaborators" = (
                            SELECT ARRAY(SELECT DISTINCT UNNEST(
                                                                 ARRAY_APPEND(
                                                                         ARRAY_APPEND(
                                                                                 ARRAY(SELECT UNNEST("boardCollaborators") FROM "Boards" WHERE "boardId" = $1),
                                                                                 UNNEST((SELECT new_ids FROM new_collaborators))
                                                                         ),
                                                                         "userId"
                                                                 )
                                                         ))
                        )
                    WHERE "boardId" = $1
                        AND EXISTS (SELECT 1 FROM authorized_user)
                    RETURNING "boardId", "userId", "boardName", "isPublic", "boardCollaborators"
            )
            SELECT
                ub."boardId",
                ub."userId",
                ub."boardName",
                ub."isPublic",
                json_agg(json_build_object(
                        'userId', u."userId",
                        'userProfilePicture', u."userProfilePicture",
                        'email', u."email"
                         )) AS "boardCollaborators"
            FROM updated_board ub
                     JOIN "Users" u ON u."userId" = ANY(ub."boardCollaborators")
            GROUP BY ub."boardId", ub."userId", ub."boardName", ub."isPublic";;
        `, [boardId, boardName, userId, boardCollaborators]);

        if (rows.length > 0) {
            const board = rows[0];
            res.send(board);
        } else {
            res.status(404).send({
                message: "board not found",
                code: 404
            });
        }
    }

}