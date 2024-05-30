export interface EditTicketRequest {
    ticketId: number;
    ticketName?: string;
    ticketDescription?: string;
    assignedUser?: number;
    ticketDueDate?: string; // Assuming the date is passed as a string in ISO format
}