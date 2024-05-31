import {User} from "../entities/user";

export interface EditBoardResponse {
    boardId: number;
    userId: number;
    boardName: string;
    isPublic: boolean;
    boardCollaborators: User[];
}