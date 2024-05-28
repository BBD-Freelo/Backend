import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import {Board, controller, EndpointDefenition, ErrorResponse, MyBoards} from '../interfaces';
import { List } from "../interfaces/entities";
import { DBPool } from '../database';
import {QueryResult} from "pg";

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

}