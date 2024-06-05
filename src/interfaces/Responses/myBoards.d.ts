import {User} from "../entities/user";

export interface MyBoards {
    boardId: number;
    boardName: string;
    boardCollaborators: User[];
}