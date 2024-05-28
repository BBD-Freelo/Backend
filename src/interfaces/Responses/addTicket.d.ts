export interface AddTicketResponse {
    ticketId: number;
    listId: number;
    ticketName: string;
    ticketDescription: string;
    ticketCreateDate: string;
    ticketUpdateDate: string;
    ticketDueDate: string | null;
}