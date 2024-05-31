export interface EditTicketRequest {
    ticketId: number;
    ticketName: string;
    ticketDescription: string;
    assignedUser: string;
    ticketDueDate: string;
}