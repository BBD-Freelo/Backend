import {Controller, Delete, Patch, Post} from "../decorators";
import {controller, EndpointDefenition, ErrorResponse, MyBoards, SuccesResponse} from "../interfaces";
import {Request, Response} from "express";
import {DBPool} from "../database";
import {AssignTicketRequest} from "../interfaces/Requests/assignTicket";
import {QueryResult} from "pg";
import {MoveTicketRequest} from "../interfaces/Requests/moveTicket";
import {AddTicketResponse} from "../interfaces/Responses/addTicket";
import {AddTicketRequest} from "../interfaces/Requests/addTicket";
import {EditTicketRequest} from "../interfaces/Requests/editTicket";
import {DeleteResponse} from "../interfaces/Responses/delete";
import {Ticket} from "../interfaces/entities/ticket";

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

    @Post('/add')
    async addTicket(req: Request<AddTicketRequest>, res: Response<AddTicketResponse | ErrorResponse>) {
        const userId = 3;
        const { listId, ticketName } = req.body;
        const { rows }: QueryResult<AddTicketResponse> = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                JOIN "Lists" l ON b."boardId" = l."boardId"
                WHERE l."listId" = $1
                  AND (b."userId" = $2 OR $2 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
                  AND l."isDeleted" = FALSE
            )
            INSERT INTO "Tickets" (
                "userId", "listId", "ticketName", "ticketDescription", "ticketCreateDate", "ticketUpdateDate"
            )
            SELECT $2, $1, $3, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM authorized_user
            RETURNING "ticketId", "listId", "ticketName", "ticketDescription", "ticketCreateDate", "ticketUpdateDate", "ticketDueDate";
        `, [listId, userId, ticketName]);
        if (rows.length > 0) {
            res.send(rows[0]);
        } else {
            res.status(404).json({
                message: "List not found",
                code: 404
            });
        }
    }

    @Delete('/:ticketId')
    async deleteTicket(req: Request, res: Response<DeleteResponse>) {
        const { ticketId } = req.params;
        const userId = 3;  // Assuming userId is available in req.user

        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                JOIN "Lists" l ON b."boardId" = l."boardId"
                JOIN "Tickets" t ON l."listId" = t."listId"
                WHERE t."ticketId" = $1
                  AND (b."userId" = $2 OR $2 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
                  AND l."isDeleted" = FALSE
                  AND t."isDeleted" = FALSE
            )
            DELETE FROM "Tickets"
            WHERE "ticketId" = $1
              AND EXISTS (SELECT 1 FROM authorized_user)
            RETURNING "ticketId";
        `, [ticketId, userId]);

        if (rows.length > 0) {
            res.send({ success: true, ticketId: rows[0].ticketId });
        } else {
            res.status(404).send({success: false});
        }

    }

    @Patch('/')
    async editTicket(req: Request<EditTicketRequest>, res: Response<Ticket | ErrorResponse>) {
        const { ticketId, ticketName, ticketDescription, assignedUser, ticketDueDate }: EditTicketRequest = req.body;
        const userId = 3;

        const { rows } = await DBPool.query(`
            WITH authorized_user AS (
                SELECT 1
                FROM "Boards" b
                         JOIN "Lists" l ON b."boardId" = l."boardId"
                         JOIN "Tickets" t ON l."listId" = t."listId"
                WHERE t."ticketId" = $1
                  AND (b."userId" = $5 OR $5 = ANY(b."boardCollaborators"))
                  AND b."isDeleted" = FALSE
                  AND l."isDeleted" = FALSE
                  AND t."isDeleted" = FALSE
            ), assigned_user AS (
                SELECT "userId"
                FROM "Users"
                WHERE "email" = $4
                  AND "isDeleted" = FALSE
            ), updated_ticket AS (
                UPDATE "Tickets"
                    SET "ticketName" = $2,
                        "ticketDescription" = $3,
                        "assignedUser" = (SELECT "userId" FROM assigned_user),
                        "ticketDueDate" = $6::TIMESTAMP,
                        "ticketUpdateDate" = CURRENT_TIMESTAMP
                    WHERE "ticketId" = $1
                        AND EXISTS (SELECT 1 FROM authorized_user)
                        AND EXISTS (SELECT 1 FROM assigned_user)
                    RETURNING "ticketId", "userId", "listId", "ticketName", "ticketDescription", "ticketCreateDate", "ticketDueDate", "assignedUser"
            )
            SELECT
                t."ticketId",
                json_build_object(
                        'userId', u."userId",
                        'userProfilePicture', u."userProfilePicture",
                        'email', u."email"
                ) AS "user",
                json_build_object(
                        'userId', au."userId",
                        'userProfilePicture', au."userProfilePicture",
                        'email', au."email"
                ) AS "assignedUser",
                t."ticketName",
                t."ticketDescription",
                t."ticketCreateDate",
                t."ticketDueDate"
            FROM updated_ticket t
                     JOIN "Users" u ON t."userId" = u."userId"
                     JOIN "Users" au ON t."assignedUser" = au."userId";
        `, [ticketId, ticketName, ticketDescription, assignedUser, userId, ticketDueDate]);



        if (rows.length > 0) {
            const ticket = rows[0];
            res.send(ticket);
        } else {
            res.status(404).send({
                message: "Ticket not found",
                code: 404
            });
        }

    }
}
