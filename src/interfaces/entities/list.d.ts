import { Ticket } from './ticket';
export interface List {
    id: number;
    name: string;
    tickets: Ticket[];
}
