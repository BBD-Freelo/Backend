import {Controller, Patch} from "../decorators";
import {controller, EndpointDefenition} from "../interfaces";
import {Request, Response} from "express";
import {DBPool} from "../database";

@Controller('/ticket')
export class TicketController implements controller {
    // Define these to make the interface happy
    endpoint!: string;
    endpoints!: { [key: string]: EndpointDefenition; };
    // define these to make the array in index.ts happy
    static endpoint = '';
    static endpoints = {}

    @Patch('/assign/user/:ticketId')
    async assignUser(req: Request, res: Response) {
        const userId = 2;
        const { ticketId } = req.params;
        const { assigneeId } = req.body.assigneeId;
        const { rows } = await DBPool.query(`
            WITH cte AS (
                SELECT
                    b."userId" AS board_owner,
                    b."boardCollaborators",
                    b."isPublic",
                    t."userId" AS ticket_owner
                FROM
                    "Boards" b
                    JOIN "Lists" l ON b."boardId" = l."boardId"
                    JOIN "Tickets" t ON l."listId" = t."listId"
                WHERE
                    t."ticketId" = $1
            )
            UPDATE "Tickets"
            SET "assignedUser" = $2
            WHERE
                "ticketId" = $1
                AND (
                    (
                        SELECT
                            $3 IN (cte.board_owner) OR
                            $3 = ANY(cte."boardCollaborators") OR
                            cte."isPublic"
                    )
                    AND (
                        $2 IN (cte.board_owner, cte.ticket_owner) OR
                        $2 = ANY(cte."boardCollaborators") OR
                        cte."isPublic"
                    )
                );
        `, [ticketId, assigneeId, userId]);

        res.send('Hello, World!');
    }
}
