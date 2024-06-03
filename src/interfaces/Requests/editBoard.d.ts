export interface EditBoardRequest {
    boardId: number;
    boardName: string;
    boardCollaborators?: string[];
}
