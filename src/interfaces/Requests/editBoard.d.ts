export interface EditBoardRequest {
    boardId: number;
    boardName: string;
    isPublic: boolean;
    boardCollaborators?: string[];
}
