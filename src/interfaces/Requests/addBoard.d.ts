export interface AddBoardRequest {
    boardCollaborators: string[];
    boardName: string;
    isPublic: boolean | false
}