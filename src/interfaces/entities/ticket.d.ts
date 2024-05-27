import {User} from "./user";

export interface Ticket {
    ticketId: number;
    user: User;
    ticketName: string;
    ticketDescription: string;
    ticketCreateDate: string;
    ticketDueDate: string;
}
