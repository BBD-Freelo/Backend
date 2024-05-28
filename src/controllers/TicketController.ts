import {Controller, Patch} from "../decorators";
import {controller, EndpointDefenition, ErrorResponse, SuccesResponse} from "../interfaces";
import {Request, Response} from "express";
import {DBPool} from "../database";
import {AssignTicketRequest} from "../interfaces/Requests/assignTicket";

@Controller('/ticket')
export class TicketController implements controller {
    // Define these to make the interface happy
    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };
    // define these to make the array in index.ts happy
    static endpoint = '';
    static endpoints = {}

    @Patch('/assign/user/:ticketId')
    async assignUser(req: Request<AssignTicketRequest>, res: Response<SuccesResponse| ErrorResponse>) {
        const userId = 2;
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
}
