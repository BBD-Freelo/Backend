import {User} from "./user";

export interface Ticket {
    ticketId: number;
    user: User;
    assignedUser: User | null;
    ticketName: string;
    ticketDescription: string;
    ticketCreateDate: string;
    ticketDueDate: string;
}
