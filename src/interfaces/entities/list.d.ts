import { Ticket } from './ticket';
export interface List {
    listId: number;
    listName: string;
    tickets: Ticket[];
}
