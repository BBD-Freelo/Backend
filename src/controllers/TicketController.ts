import {Controller, Patch} from "../decorators";
import {controller, EndpointDefenition, ErrorResponse, MyBoards, SuccesResponse} from "../interfaces";
import {Request, Response} from "express";
import {DBPool} from "../database";
import {AssignTicketRequest} from "../interfaces/Requests/assignTicket";
import {QueryResult} from "pg";
import {MoveTicketRequest} from "../interfaces/Requests/moveTicket";

@Controller('/ticket')
export class TicketController implements controller {

    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };

    static endpoint = '';
    static endpoints = {}

    @Patch('/assign/user/:ticketId')
    async assignUser(req: Request<AssignTicketRequest>, res: Response<SuccesResponse| ErrorResponse>) {
        const userId = 3;
        const { ticketId } = req.params;
        const { assigneeId } = req.body;
        const { rows } = await DBPool.query(`
            WITH updated_tickets AS (
              UPDATE "Tickets" t
              SET "assignedUser" = $2
              WHERE t."ticketId" = $1
                AND EXISTS (
                  SELECT 1
                  FROM "Boards" b
                         JOIN "Lists" l ON b."boardId" = l."boardId"
                         JOIN "Tickets" t2 ON l."listId" = t2."listId"
                  WHERE t2."ticketId" = t."ticketId"
                    AND ($3 = b."userId" OR $3 = ANY(b."boardCollaborators"))
                    AND ($2 = b."userId" OR $2 = ANY(b."boardCollaborators") OR $2 = t2."userId")
                )
              RETURNING t.*
            )
            SELECT
              CASE
                WHEN EXISTS (SELECT 1 FROM updated_tickets) THEN 'Success'
                ELSE 'Unauthorized'
              END AS status;
        `, [ticketId, assigneeId, userId]);
        if(rows[0].status === "Unauthorized") {
            res.status(404).send({
                message: "Ticket not found",
                code:404
            });
            return;
        }
        res.send({
            message: "User successfully assigned to ticket",
            code: 200
        })
    }

    @Patch('/move')
    async moveTicket(req: Request<MoveTicketRequest>, res: Response<SuccesResponse| ErrorResponse>) {
        const { moveToListId, ticketId } = req.body;
        const userId = 3;
        console.log(req.body);
        const { rows } = await DBPool.query(`
            WITH updated_tickets AS (
                WITH cte AS (
                    SELECT
                        b."userId" AS board_owner,
                        b."boardCollaborators",
                        t."userId" AS ticket_owner,
                        t."listId" AS current_list_id,
                        l."boardId" AS board_id
                    FROM
                        "Boards" b
                            JOIN "Lists" l ON b."boardId" = l."boardId"
                            JOIN "Tickets" t ON l."listId" = t."listId"
                    WHERE
                        t."ticketId" = $1
                      AND l."listId" = t."listId"
                    )
                    UPDATE "Tickets" t
                        SET "listId" = $3
                        WHERE
                            t."ticketId" = $1
                                AND EXISTS (
                                SELECT 1
                                FROM cte
                                WHERE
                                    ($2 = cte.board_owner OR $2 = ANY(cte."boardCollaborators"))
                                  AND $3 IN (SELECT "listId" FROM "Lists" WHERE "boardId" = cte.board_id)
                                  AND cte.current_list_id IN (SELECT "listId" FROM "Lists" WHERE "boardId" = cte.board_id)
                            )
                        RETURNING t.*
            )
            SELECT
                CASE
                    WHEN EXISTS (SELECT 1 FROM updated_tickets) THEN 'Success'
                    ELSE 'Unauthorized'
                    END AS status;
        `, [ticketId, userId, moveToListId]);
        if(rows[0].status === "Unauthorized") {
            res.status(404).send({
                message: "List not found",
                code: 404
            });
            return;
        }
        res.send({
            message: "List successfully updated",
            code: 200
        });
    }
}
