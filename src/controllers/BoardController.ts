import { Request, Response } from 'express';
import { Controller, Get, Post } from "../decorators";
import {controller, EndpointDefenition, ErrorResponse} from '../interfaces';
import { List } from "../interfaces/entities";
import { DBPool } from '../database';
import {QueryResult} from "pg";

interface temp {
    board_data: List[]
}

@Controller('/board')
export class BoardController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    // Or id?
    @Get('/:boardId')
    async hello(req: Request, res: Response<List[] | ErrorResponse>) {
        const { boardId } = req.params;
        console.log(boardId);
        // Grab this from the jwt in the header
        const userId = 3
        const { rows }: QueryResult<temp> = await DBPool.query(`
            SELECT
                CASE
                    WHEN (b."isPublic" = TRUE OR b."userId" = $2 OR $2 = ANY(b."boardCollaborators")) THEN
                        ARRAY(
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

    @Get('/user/:id')
    test(req: Request, res: Response) {
        const { id } = req.params;
        res.send(`User ID: ${id}`);
    }

    @Post('/echo')
    echo(req: Request, res: Response) {
        const { message } = req.body;
        res.send(`You said: hey`);
    }

}